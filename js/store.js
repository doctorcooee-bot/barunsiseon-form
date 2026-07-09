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

// =============================================================
//  글자 단위 서식(리치 텍스트) 공용 헬퍼
//  - 필드의 표시 텍스트를 "글자 조각(run)" 배열로 다룬다.
//  - run = { t:"글자", color?, bold?, size?(배율) }
//  - f.runs 가 없으면 f.label + 필드레벨 서식(f.color/size/bold)으로 동작(하위호환)
//  화면(app.js)·편집기(admin.js)·PDF(pdf.js) 가 공통으로 사용한다.
// =============================================================

// 표시 텍스트의 기본 글자 크기(px) — 화면/편집기 미리보기 공통
function fieldTextBasePx(f) {
  if (f.type === "section") return 19;
  if (f.type === "note") return 15;
  return 18; // 항목 이름(라벨)
}

// 필드의 글자 조각 배열. runs 없으면 label 전체를 한 조각으로.
function fieldRuns(f) {
  if (f && Array.isArray(f.runs) && f.runs.length) return f.runs;
  return [{ t: (f && f.label) || "" }];
}

// 조각들의 텍스트를 이어붙임 (f.label 동기화용)
function runsToText(runs) {
  return (runs || []).map((r) => r.t || "").join("");
}

// 한 조각의 최종 스타일 (run 우선 → 필드레벨 → 기본)
function runStyle(r, f) {
  const size = r.size != null ? r.size : (f.size != null ? f.size : 1);
  const color = r.color != null ? r.color : (f.color != null ? f.color : "");
  const boldDefault = f.type === "section";   // 구역 제목은 기본 굵게
  const bold = r.bold != null ? r.bold : (f.bold != null ? f.bold : boldDefault);
  return { size: size || 1, color, bold, px: Math.round(fieldTextBasePx(f) * (size || 1)) };
}

// 화면/미리보기용 HTML (span 들). 정렬은 바깥 요소에서 처리.
// 서식이 지정되지 않은 부분은 CSS 기본값(라벨 600 / 구역제목 700 등)을 그대로 쓰도록
// 굳이 스타일을 넣지 않는다.
function runsToHtml(runs, f) {
  return (runs || []).map((r) => {
    const styles = [];
    const color = r.color != null ? r.color : (f.color != null ? f.color : "");
    if (color) styles.push("color:" + color);
    const size = r.size != null ? r.size : (f.size != null ? f.size : 1);
    if (size !== 1) styles.push("font-size:" + Math.round(fieldTextBasePx(f) * size) + "px");
    const bold = r.bold != null ? r.bold : (f.bold != null ? f.bold : null);
    if (bold != null) styles.push("font-weight:" + (bold ? "700" : "400"));
    const text = escHtml(r.t || "").replace(/\n/g, "<br>");
    return `<span${styles.length ? ` style="${styles.join(";")}"` : ""}>${text}</span>`;
  }).join("");
}

// 유튜브 주소에서 영상 ID 추출 (youtu.be/ID, watch?v=ID, embed/ID, shorts/ID, live/ID 지원)
function youtubeId(url) {
  if (!url) return "";
  const s = String(url).trim();
  const m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;   // ID만 붙여넣은 경우
  return "";
}

// "rgb(r, g, b)" 또는 "#rrggbb" → "#rrggbb"
function rgbToHex(c) {
  if (!c) return "";
  if (c[0] === "#") return c.length === 7 ? c : "";
  const m = String(c).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return "";
  const h = (n) => Number(n).toString(16).padStart(2, "0");
  return "#" + h(m[1]) + h(m[2]) + h(m[3]);
}

// 인접한 동일 스타일 조각 병합 + 기본값 속성 제거
function normalizeRuns(runs) {
  const out = [];
  (runs || []).forEach((r) => {
    const last = out[out.length - 1];
    if (last && (last.color || "") === (r.color || "") && (last.size || 1) === (r.size || 1) && (!!last.bold) === (!!r.bold)) last.t += (r.t || "");
    else out.push(Object.assign({}, r));
  });
  out.forEach((r) => { if (r.size == null || r.size === 1) delete r.size; if (!r.color) delete r.color; if (r.bold == null) delete r.bold; });
  return out.length ? out : [{ t: "" }];
}

// contentEditable DOM → runs 로 정규화 (인접 동일 스타일 병합)
function domToRuns(el, f) {
  const base = fieldTextBasePx(f);
  const runs = [];
  const styleFromEl = (node) => {
    const s = node.style || {};
    const out = {};
    const col = rgbToHex(s.color);
    if (col) out.color = col;
    if (s.fontSize) { const px = parseFloat(s.fontSize); if (px) { const m = Math.round((px / base) * 100) / 100; if (m !== 1) out.size = m; } }
    if (s.fontWeight) { const w = s.fontWeight; out.bold = (w === "bold" || Number(w) >= 600); }
    return out;
  };
  const push = (t, st) => { if (t !== "") runs.push(Object.assign({ t }, st)); };
  const addNL = () => { const last = runs[runs.length - 1]; if (last && last.t.slice(-1) !== "\n") last.t += "\n"; };
  const walk = (node, inherited) => {
    node.childNodes.forEach((c) => {
      if (c.nodeType === 3) push(c.nodeValue, inherited);
      else if (c.nodeName === "BR") addNL();
      else if (c.nodeType === 1) {
        if (/^(DIV|P)$/.test(c.nodeName)) addNL();
        walk(c, Object.assign({}, inherited, styleFromEl(c)));
      }
    });
  };
  walk(el, {});
  return normalizeRuns(runs);
}

// runs 의 [start,end) 글자 구간에 서식(attr) 적용. value==null 이면 해제.
// 선택이 없으면(start===end) 전체에 적용. attr: "color" | "size" | "bold"
function runsSetAttr(runs, start, end, attr, value) {
  const chars = [];
  (runs || []).forEach((r) => {
    const st = { color: r.color, size: r.size, bold: r.bold };
    const t = r.t || "";
    for (let i = 0; i < t.length; i++) chars.push({ ch: t[i], st: Object.assign({}, st) });
  });
  if (start === end) { start = 0; end = chars.length; }
  for (let i = start; i < end && i < chars.length; i++) {
    if (value == null) delete chars[i].st[attr];
    else chars[i].st[attr] = value;
  }
  const out = [];
  chars.forEach((c) => {
    const last = out[out.length - 1];
    const same = last && (last.color || "") === (c.st.color || "") && (last.size || 1) === (c.st.size || 1) && (!!last.bold) === (!!c.st.bold);
    if (same) last.t += c.ch;
    else out.push(Object.assign({ t: c.ch }, c.st));
  });
  return normalizeRuns(out);
}

