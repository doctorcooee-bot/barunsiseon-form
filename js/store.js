// =============================================================
//  저장소 : 편집한 서류·환자군을 이 기기(브라우저)에 저장
//  - 관리 메뉴에서 바꾼 내용이 기기에 남습니다.
//  - "설정 내보내기/불러오기"로 다른 기기(PC↔아이패드)로 옮길 수 있습니다.
//  - 2단계에서 구글드라이브 동기화로 확장 예정.
// =============================================================

const LS_FORMS = "barun_forms_v1";
const LS_GROUPS = "barun_groups_v1";
const LS_STAFF_PW = "barun_staff_pw_v1";

function _clone(o) { return JSON.parse(JSON.stringify(o)); }

// 코드 변경(성명 선입력 · 주소 검색)에 맞춰, 불러온 서류 정의를 정규화한다.
//  - 환자 본인 성명 항목 제거 (성명은 모든 서류 앞에서 먼저 입력하므로 중복)
//  - 주소 항목은 도로명 주소 검색(address) 방식으로 전환
//  ※ 클라우드/로컬에 저장된 기존 설정에도 항상 적용되며, 그 외 편집 내용은 보존한다.
function migrateForms(forms) {
  if (!forms || typeof forms !== "object") return forms;
  const isOwnName = (f) =>
    (f.type === "write" || f.type === "writeBig") &&
    (f.key === "name" ||
      (/^(성\s*명|이\s*름|환자\s*명|환자\s*성명)$/.test((f.label || "").trim()) &&
        !/대리인|보호자/.test(f.label || "")));
  const isAddress = (f) =>
    (f.type === "write" || f.type === "writeBig") &&
    (f.key === "address" || /^주\s*소$/.test((f.label || "").trim()));
  // "소개자 성함·연락처" 합쳐진 칸 → 성함 / 연락처 두 칸으로 분리
  const isCombinedReferrer = (f) =>
    (f.type === "write" || f.type === "writeBig") &&
    f.key === "referrer" && /연락처/.test(f.label || "") && /성함|성명/.test(f.label || "");
  Object.keys(forms).forEach((id) => {
    const form = forms[id];
    if (!form || !Array.isArray(form.fields)) return;
    form.fields = form.fields.filter((f) => !isOwnName(f));
    form.fields.forEach((f) => { if (isAddress(f)) f.type = "address"; });
    const hasReferrerPhone = form.fields.some((f) => f.key === "referrerPhone");
    form.fields = form.fields.flatMap((f) =>
      !hasReferrerPhone && isCombinedReferrer(f)
        ? [
            { type: "write", key: "referrer", label: "소개자 성함 (지인 소개 시)" },
            { type: "write", key: "referrerPhone", label: "소개자 연락처 (지인 소개 시)" },
          ]
        : [f]
    );
  });
  return forms;
}

function loadForms() {
  try {
    const s = localStorage.getItem(LS_FORMS);
    if (s) return migrateForms(JSON.parse(s));
  } catch (e) { /* 무시 */ }
  return migrateForms(_clone(DEFAULT_FORMS));
}
function loadGroups() {
  try {
    const s = localStorage.getItem(LS_GROUPS);
    if (s) return JSON.parse(s);
  } catch (e) { /* 무시 */ }
  return _clone(DEFAULT_GROUPS);
}
// 직원 결과 화면 비밀번호 (""=없음). 저장된 적이 없으면 기본값 사용.
function loadStaffPassword() {
  try {
    const s = localStorage.getItem(LS_STAFF_PW);
    if (s !== null) return s;   // "" 도 유효한 값(잠금 해제)
  } catch (e) { /* 무시 */ }
  return String(CONFIG.staffPassword == null ? "" : CONFIG.staffPassword);
}

// 실제로 앱이 사용하는 값 (편집 시 이 값을 바꾸고 저장)
let FORMS = loadForms();
let PATIENT_GROUPS = loadGroups();
let STAFF_PASSWORD = loadStaffPassword();

function getStaffPassword() { return STAFF_PASSWORD; }
function persistStaffPassword(v) {
  STAFF_PASSWORD = String(v == null ? "" : v);
  try { localStorage.setItem(LS_STAFF_PW, STAFF_PASSWORD); }
  catch (e) { alert("저장에 실패했습니다: " + e.message); }
  pushConfigToCloud();
}

function persistForms() {
  try { localStorage.setItem(LS_FORMS, JSON.stringify(FORMS)); }
  catch (e) { alert("저장에 실패했습니다: " + e.message); }
  pushConfigToCloud();
}
function persistGroups() {
  try { localStorage.setItem(LS_GROUPS, JSON.stringify(PATIENT_GROUPS)); }
  catch (e) { alert("저장에 실패했습니다: " + e.message); }
  pushConfigToCloud();
}

// ---- 기기간 공유 (구글드라이브) ----
// 편집 내용을 구글드라이브에 올려 다른 기기와 공유하고, 배포와 무관하게 유지한다.
let _cloudPushTimer = null;
function pushConfigToCloud() {
  if (typeof cloudConfigured !== "function" || !cloudConfigured()) return;
  clearTimeout(_cloudPushTimer);   // 연속 저장을 한 번으로 묶음
  _cloudPushTimer = setTimeout(() => {
    cloudSaveConfig({ version: 1, forms: FORMS, groups: PATIENT_GROUPS, staffPassword: STAFF_PASSWORD, updatedAt: Date.now() })
      .catch((e) => console.warn("설정 클라우드 저장 실패:", e && e.message));
  }, 400);
}

// 앱 시작 때 구글드라이브의 최신 편집 내용을 받아온다. (있으면 로컬 캐시도 갱신)
async function syncConfigFromCloud() {
  if (typeof cloudConfigured !== "function" || !cloudConfigured()) return false;
  try {
    const cfg = await cloudLoadConfig();
    if (cfg && cfg.forms) {
      FORMS = migrateForms(cfg.forms);
      if (cfg.groups) PATIENT_GROUPS = cfg.groups;
      if (typeof cfg.staffPassword === "string") STAFF_PASSWORD = cfg.staffPassword;
      try {
        localStorage.setItem(LS_FORMS, JSON.stringify(FORMS));
        localStorage.setItem(LS_GROUPS, JSON.stringify(PATIENT_GROUPS));
        if (typeof cfg.staffPassword === "string") localStorage.setItem(LS_STAFF_PW, STAFF_PASSWORD);
      } catch (e) { /* 무시 */ }
      return true;
    }
  } catch (e) {
    console.warn("설정 클라우드 불러오기 실패:", e && e.message);
  }
  return false;
}

// 기본값으로 초기화
function resetToDefaults() {
  FORMS = _clone(DEFAULT_FORMS);
  PATIENT_GROUPS = _clone(DEFAULT_GROUPS);
  persistForms();
  persistGroups();
  persistStaffPassword(String(CONFIG.staffPassword == null ? "" : CONFIG.staffPassword));
}

// 고유 키/아이디 생성
function genId(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
}

