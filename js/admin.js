// =============================================================
//  관리자 편집기
//  - 비밀번호(1233)로 진입
//  - 서류 추가/삭제, 항목(질문) 추가/삭제/순서변경/유형변경
//  - 각 서류를 어떤 환자군에서 쓸지 지정
//  - 설정 내보내기/불러오기, 기본값 초기화
//  (app.js 의 app, setStep, screenStart 를 함께 사용합니다)
// =============================================================

const FIELD_TYPES = [
  { v: "write", t: "손글씨 (한 줄)" },
  { v: "writeBig", t: "손글씨 (여러 줄)" },
  { v: "number", t: "숫자형식" },
  { v: "radio", t: "선택 (하나만 체크)" },
  { v: "checkbox", t: "선택 (여러 개 체크)" },
  { v: "signature", t: "서명" },
  { v: "section", t: "구역 제목" },
  { v: "note", t: "안내 문구 (읽기용)" },
  { v: "youtube", t: "유튜브 링크" },
];
function typeName(v) { const f = FIELD_TYPES.find((x) => x.v === v); return f ? f.t : v; }

function updateCloudStatus() {
  const st = document.getElementById("cloud-status");
  if (!st) return;
  st.innerHTML = cloudConfigured()
    ? '<span style="color:var(--ok);font-weight:700;">● 설정됨</span> — 작성 완료 시 자동으로 드라이브에 저장됩니다.'
    : '<span style="color:var(--text-soft);">● 미설정</span> — 주소를 입력하고 저장하세요.';
}

// -------------------------------------------------------------
//  비밀번호 입력 (숫자 키패드)
// -------------------------------------------------------------
let _pin = "";
function screenAdminLogin() {
  _pin = "";
  setStep("관리자");
  app.innerHTML = `
    <h2 class="screen-title">관리자 인증</h2>
    <p class="screen-desc">서류 편집은 관리자만 할 수 있습니다. 4자리 비밀번호를 입력하세요.</p>
    <div class="card" style="max-width:360px; margin:0 auto;">
      <div class="pin-dots" id="pin-dots"></div>
      <div class="keypad" id="keypad"></div>
    </div>
    <div class="footer-bar">
      <button class="btn btn-gray btn-block" id="btn-cancel">← 나가기</button>
    </div>
  `;
  const keys = ["1","2","3","4","5","6","7","8","9","지움","0","←"];
  const kp = document.getElementById("keypad");
  keys.forEach((k) => {
    const b = document.createElement("button");
    b.className = "key" + (k === "지움" || k === "←" ? " key-fn" : "");
    b.textContent = k;
    b.addEventListener("click", () => onPinKey(k));
    kp.appendChild(b);
  });
  document.getElementById("btn-cancel").addEventListener("click", screenStart);
  renderPinDots();
}
function renderPinDots() {
  const d = document.getElementById("pin-dots");
  if (!d) return;
  d.innerHTML = [0,1,2,3].map((i) => `<span class="dot ${i < _pin.length ? "on" : ""}"></span>`).join("");
}
function onPinKey(k) {
  if (k === "지움") _pin = "";
  else if (k === "←") _pin = _pin.slice(0, -1);
  else if (_pin.length < 4) _pin += k;
  renderPinDots();
  if (_pin.length === 4) {
    if (_pin === String(CONFIG.adminPassword)) screenAdmin();
    else { setTimeout(() => { alert("비밀번호가 올바르지 않습니다."); _pin = ""; renderPinDots(); }, 120); }
  }
}

// -------------------------------------------------------------
//  관리자 설정 : 구글드라이브 연동 · 직원 화면 비밀번호
// -------------------------------------------------------------
function screenAdmin() {
  setStep("관리자 설정");
  app.innerHTML = `
    <h2 class="screen-title">관리자 설정</h2>
    <p class="screen-desc">구글드라이브 연동과 직원 화면 비밀번호를 설정합니다. 서류·환자군 편집은 직원 메뉴에 있습니다.</p>

    <div class="card">
      <div style="font-weight:700; margin-bottom:10px;">구글드라이브 연동 (자동 저장)</div>
      <div id="cloud-status" style="font-size:15px; margin-bottom:14px;"></div>
      <label class="field-label">앱스크립트 웹앱 주소</label>
      <input id="cloud-url" class="box-input" placeholder="https://script.google.com/macros/s/..../exec" autocomplete="off" />
      <label class="field-label" style="margin-top:12px;">비밀 문구 (앱스크립트와 동일하게)</label>
      <input id="cloud-token" class="box-input" placeholder="예: barun-2026-secret" autocomplete="off" />
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:16px;">
        <button class="btn btn-primary" id="btn-cloud-save">저장</button>
        <button class="btn btn-gray" id="btn-cloud-test">연결 테스트</button>
      </div>
      <p style="font-size:14px; color:var(--text-soft); margin:14px 0 0;">
        설정 방법은 프로젝트 폴더의 <b>apps-script/설치방법.md</b> 를 참고하세요.
      </p>
    </div>

    <div class="card" style="margin-top:20px;">
      <div style="font-weight:700; margin-bottom:10px;">직원 결과 화면 비밀번호</div>
      <p style="font-size:14px; color:var(--text-soft); margin:0 0 14px;">
        완료(감사합니다) 화면 우측 하단 <b>⚙ 버튼</b>을 눌렀을 때 요구하는 비밀번호입니다.
        (환자 정보 입력·구글드라이브 저장 화면으로 들어갑니다.)
      </p>
      <label class="choice" id="sp-none-label" style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
        <input type="checkbox" id="sp-none" /> 비밀번호 없이 열기 (잠금 해제)
      </label>
      <label class="field-label">비밀번호 (숫자)</label>
      <input id="sp-value" class="box-input" inputmode="numeric" placeholder="예) 1575" autocomplete="off" />
      <div style="margin-top:16px;">
        <button class="btn btn-primary" id="btn-sp-save">저장</button>
      </div>
    </div>

    <div class="footer-bar">
      <button class="btn btn-primary btn-block" id="btn-done">← 나가기 (첫 화면으로)</button>
    </div>
  `;

  // 구글드라이브 연동 설정
  const cc = getCloudConfig();
  document.getElementById("cloud-url").value = cc.url;
  document.getElementById("cloud-token").value = cc.token;
  updateCloudStatus();
  document.getElementById("btn-cloud-save").addEventListener("click", () => {
    setCloudConfig(document.getElementById("cloud-url").value, document.getElementById("cloud-token").value);
    updateCloudStatus();
    alert("저장되었습니다.");
  });
  document.getElementById("btn-cloud-test").addEventListener("click", async () => {
    setCloudConfig(document.getElementById("cloud-url").value, document.getElementById("cloud-token").value);
    const st = document.getElementById("cloud-status");
    st.innerHTML = "연결 확인 중…";
    try { await cloudPing(); st.innerHTML = '<span style="color:var(--ok);font-weight:700;">✓ 연결 정상 — 자동 저장 준비됨</span>'; }
    catch (e) { st.innerHTML = '<span style="color:var(--danger);font-weight:700;">✗ ' + escHtml(e.message) + '</span>'; }
  });

  // 직원 결과 화면 비밀번호 설정
  const spNone = document.getElementById("sp-none");
  const spValue = document.getElementById("sp-value");
  const spNoneLabel = document.getElementById("sp-none-label");
  const curPw = getStaffPassword();
  spNone.checked = !curPw;
  spValue.value = curPw;
  const spSync = () => {
    spValue.disabled = spNone.checked;
    spValue.style.opacity = spNone.checked ? "0.5" : "1";
    spNoneLabel.classList.toggle("selected", spNone.checked);
  };
  spNone.addEventListener("change", spSync);
  spSync();
  document.getElementById("btn-sp-save").addEventListener("click", () => {
    if (spNone.checked) {
      persistStaffPassword("");
      alert("직원 결과 화면 잠금을 해제했습니다. 비밀번호 없이 열립니다.");
      return;
    }
    const v = spValue.value.trim();
    if (!v) return alert("비밀번호를 입력하거나 '비밀번호 없이 열기'를 선택하세요.");
    persistStaffPassword(v);
    alert("직원 결과 화면 비밀번호를 저장했습니다.");
  });

  document.getElementById("btn-done").addEventListener("click", screenStart);
}

// -------------------------------------------------------------
//  서류 관리 (직원 메뉴) : 서류 목록 · 추가 · 편집 · 삭제 · 초기화
// -------------------------------------------------------------
// 서류 순서 바꾸기 (i번째와 j번째 서로 맞바꿈). FORMS 객체의 키 순서를 다시 만든다.
function reorderForms(i, j) {
  const ids = Object.keys(FORMS);
  if (i < 0 || j < 0 || i >= ids.length || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  const saved = {};
  ids.forEach((id) => { saved[id] = FORMS[id]; });
  Object.keys(FORMS).forEach((id) => { delete FORMS[id]; });
  ids.forEach((id) => { FORMS[id] = saved[id]; });
  persistForms();
  screenFormManage();
}

// 서류 복사 : 원본을 그대로 복제해 바로 아래에 새 서류로 넣는다.
function duplicateForm(id) {
  const src = FORMS[id];
  if (!src) return;
  const clone = JSON.parse(JSON.stringify(src));
  clone.id = genId("form");
  clone.name = src.name + " (사본)";
  (clone.fields || []).forEach((fld) => { if (fld.key) fld.key = genId("k"); });
  // FORMS 객체의 키 순서를 다시 만들되, 원본 바로 뒤에 사본을 끼워 넣는다.
  const ids = Object.keys(FORMS);
  const saved = {};
  ids.forEach((fid) => { saved[fid] = FORMS[fid]; });
  Object.keys(FORMS).forEach((fid) => { delete FORMS[fid]; });
  ids.forEach((fid) => {
    FORMS[fid] = saved[fid];
    if (fid === id) FORMS[clone.id] = clone;
  });
  persistForms();
  screenFormManage();
}

function screenFormManage() {
  setStep("서류 관리");
  app.innerHTML = `
    <h2 class="screen-title">서류 관리</h2>
    <p class="screen-desc">서류를 추가하거나, 항목(질문)을 편집할 수 있습니다.</p>
    <div class="select-list" id="admin-forms"></div>
    <div style="margin-top:14px;">
      <button class="btn btn-ghost btn-block" id="btn-add-form">+ 새 서류 추가</button>
    </div>

    <div class="card" style="margin-top:26px;">
      <div style="font-weight:700; margin-bottom:8px;">기본값으로 초기화</div>
      <p style="font-size:14px; color:var(--text-soft); margin:0 0 14px;">
        편집한 모든 서류·환자군을 지우고 처음 상태로 되돌립니다.
      </p>
      <button class="btn btn-gray" id="btn-reset" style="color:var(--danger);">기본값으로 초기화</button>
    </div>

    <div class="footer-bar">
      <button class="btn btn-primary btn-block" id="btn-back">← 직원 메뉴</button>
    </div>
  `;

  const list = document.getElementById("admin-forms");
  const ids = Object.keys(FORMS);
  if (ids.length === 0) list.innerHTML = `<div style="color:var(--text-soft);">등록된 서류가 없습니다.</div>`;
  ids.forEach((id, idx) => {
    const f = FORMS[id];
    const usedBy = PATIENT_GROUPS.filter((g) => (g.formIds || []).includes(id)).map((g) => g.name);
    const item = document.createElement("div");
    item.className = "select-item";
    item.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:4px; margin-right:8px;">
        <button class="btn btn-gray adm-up" style="padding:4px 10px; min-height:30px; font-size:14px;" ${idx === 0 ? "disabled" : ""} title="위로">▲</button>
        <button class="btn btn-gray adm-down" style="padding:4px 10px; min-height:30px; font-size:14px;" ${idx === ids.length - 1 ? "disabled" : ""} title="아래로">▼</button>
      </div>
      <div style="flex:1;">
        <div style="font-weight:600;">${escHtml(f.name)}</div>
        <div style="font-size:14px; color:var(--text-soft); margin-top:4px;">
          항목 ${f.fields.filter((x) => x.type !== "section" && x.type !== "note").length}개 · ${usedBy.length ? "사용: " + usedBy.join(", ") : "연결된 환자군 없음"}${f.saveJpg ? ' · <span style="color:var(--brand);font-weight:600;">JPG저장</span>' : ""}
        </div>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
        <button class="btn btn-gray adm-preview" style="padding:8px 16px; min-height:42px; font-size:16px;">미리보기·출력</button>
        <button class="btn btn-gray adm-edit" style="padding:8px 16px; min-height:42px; font-size:16px;">편집</button>
        <button class="btn btn-gray adm-copy" style="padding:8px 16px; min-height:42px; font-size:16px;">복사</button>
        <button class="btn btn-gray adm-del" style="padding:8px 16px; min-height:42px; font-size:16px; color:var(--danger);">삭제</button>
      </div>
    `;
    item.querySelector(".adm-up").addEventListener("click", () => { reorderForms(idx, idx - 1); });
    item.querySelector(".adm-down").addEventListener("click", () => { reorderForms(idx, idx + 1); });
    item.querySelector(".adm-preview").addEventListener("click", () => openFormPreviewModal(id));
    item.querySelector(".adm-edit").addEventListener("click", () => screenEditForm(FORMS[id], false));
    item.querySelector(".adm-copy").addEventListener("click", () => duplicateForm(id));
    item.querySelector(".adm-del").addEventListener("click", () => {
      if (!confirm(`'${f.name}' 서류를 삭제할까요?`)) return;
      delete FORMS[id];
      PATIENT_GROUPS.forEach((g) => { g.formIds = (g.formIds || []).filter((x) => x !== id); });
      persistForms(); persistGroups();
      screenFormManage();
    });
    list.appendChild(item);
  });

  document.getElementById("btn-add-form").addEventListener("click", () => {
    const nf = { id: genId("form"), name: "새 서류", fields: [
      { type: "section", label: "기본 정보" },
      { type: "write", key: genId("k"), label: "성명", required: true },
      { type: "signature", key: genId("k"), label: "환자 서명", required: true },
    ] };
    screenEditForm(nf, true);
  });
  document.getElementById("btn-reset").addEventListener("click", () => {
    if (!confirm("모든 편집 내용을 지우고 기본값으로 되돌릴까요?")) return;
    resetToDefaults();
    screenFormManage();
  });
  document.getElementById("btn-back").addEventListener("click", screenStaffMenu);
}

// 서류 하나의 빈 양식 미리보기 + 인쇄/다운로드 (팝업)
function openFormPreviewModal(id) {
  const form = FORMS[id];
  if (!form) return;
  const overlay = document.createElement("div");
  overlay.className = "pv-modal";
  overlay.innerHTML = `
    <div class="pv-modal-box">
      <div class="pv-modal-head">
        <div class="pv-modal-title">${escHtml(form.name)}</div>
        <button class="btn btn-gray pv-close" style="padding:6px 14px; min-height:38px; font-size:15px;">닫기 ✕</button>
      </div>
      <div class="pv-modal-actions">
        <button class="btn btn-primary pv-print" style="padding:8px 16px; min-height:40px; font-size:15px;" disabled>🖨 인쇄</button>
        <button class="btn btn-gray pv-dl" style="padding:8px 16px; min-height:40px; font-size:15px;" disabled>⬇ 다운로드</button>
      </div>
      <div class="pv-modal-body" id="pv-modal-body">
        <div style="padding:20px; color:var(--text-soft);">미리보기를 준비하고 있습니다…</div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector(".pv-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  (async () => {
    try {
      const res = await generatePdf(form, {}, { blank: true, groupName: "" });
      if (!overlay.isConnected) return;
      const body = overlay.querySelector("#pv-modal-body");
      body.innerHTML = "";
      await renderPdfIntoElement(res.bytes, body);
      const safe = String(form.name).replace(/[\\/:*?"<>|\s]/g, "").trim() || "서류";
      const printBtn = overlay.querySelector(".pv-print");
      const dlBtn = overlay.querySelector(".pv-dl");
      printBtn.disabled = false; dlBtn.disabled = false;
      printBtn.addEventListener("click", () => printPdfBlob(res.blob));
      dlBtn.addEventListener("click", () => downloadPdf(res.blob, `${safe}_빈서류.pdf`));
    } catch (e) {
      if (!overlay.isConnected) return;
      overlay.querySelector("#pv-modal-body").innerHTML =
        `<div style="padding:20px; color:var(--danger);">미리보기 생성 중 문제가 발생했습니다: ${escHtml(e.message)}</div>`;
    }
  })();
}

// -------------------------------------------------------------
//  환자군별 서류 선택
//  - 환자군 추가/삭제, 이름 편집
//  - 각 환자군마다 어떤 서류를 쓸지 체크로 지정
// -------------------------------------------------------------
let _gfGroups = null;   // 편집용 작업 사본 (저장 전까지 원본은 건드리지 않음)

function screenGroupForms() {
  setStep("환자군별 서류");
  // 작업 사본 준비 (원본 깊은 복사)
  _gfGroups = PATIENT_GROUPS.map((g) => ({ id: g.id, name: g.name, formIds: (g.formIds || []).slice() }));
  drawGroupForms();
}

// 화면의 이름·체크 상태를 작업 사본(_gfGroups)에 반영
function captureGroupFormsDom() {
  [...document.querySelectorAll("#gf-groups .card")].forEach((card) => {
    const g = _gfGroups.find((x) => x.id === card.dataset.gid);
    if (!g) return;
    const nameEl = card.querySelector(".gf-name");
    if (nameEl) g.name = nameEl.value.trim() || g.name;
    g.formIds = [...card.querySelectorAll(".gf-check:checked")].map((c) => c.value);
  });
}

function drawGroupForms() {
  const formIds = Object.keys(FORMS);
  app.innerHTML = `
    <h2 class="screen-title">환자군별 서류 선택</h2>
    <p class="screen-desc">환자군을 추가·삭제하고, 각 환자군에서 작성할 서류를 체크하세요. 첫 화면에서 환자군 버튼을 누르면 여기 선택된 서류가 자동으로 체크됩니다.</p>
    <div id="gf-groups"></div>
    <button class="btn btn-ghost btn-block" id="btn-gf-add" style="margin-top:6px;">+ 새 환자군 추가</button>
    <div class="footer-bar">
      <button class="btn btn-gray" id="btn-gf-cancel">취소</button>
      <button class="btn btn-primary grow2" id="btn-gf-save">저장</button>
    </div>
  `;

  const wrap = document.getElementById("gf-groups");
  if (_gfGroups.length === 0) {
    wrap.innerHTML = `<div style="color:var(--text-soft); padding:8px 2px;">등록된 환자군이 없습니다. 아래에서 추가하세요.</div>`;
  }
  _gfGroups.forEach((g, gi) => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.marginBottom = "16px";
    card.dataset.gid = g.id;
    const set = new Set(g.formIds || []);
    card.innerHTML = `
      <div style="display:flex; gap:10px; align-items:center; margin-bottom:12px;">
        <div style="display:flex; flex-direction:column; gap:4px;">
          <button class="btn btn-gray gf-up" style="padding:3px 9px; min-height:28px; font-size:13px;" ${gi === 0 ? "disabled" : ""} title="위로">▲</button>
          <button class="btn btn-gray gf-down" style="padding:3px 9px; min-height:28px; font-size:13px;" ${gi === _gfGroups.length - 1 ? "disabled" : ""} title="아래로">▼</button>
        </div>
        <input class="gf-name box-input" style="flex:1; font-weight:700;" value="${escAttr(g.name)}" placeholder="환자군 이름 (예: 통증 초진)" />
        <button class="btn btn-gray gf-del" style="padding:8px 14px; min-height:42px; font-size:15px; color:var(--danger);">삭제</button>
      </div>
      <div class="choice-group">
        ${formIds.length === 0 ? '<div style="color:var(--text-soft);">등록된 서류가 없습니다.</div>' :
          formIds.map((fid) => {
            const checked = set.has(fid);
            return `<label class="choice${checked ? " selected" : ""}"><input type="checkbox" class="gf-check" value="${fid}" ${checked ? "checked" : ""}/> ${escHtml(FORMS[fid].name)}</label>`;
          }).join("")}
      </div>
    `;
    card.querySelectorAll(".gf-check").forEach((c) => {
      c.addEventListener("change", (e) => e.target.closest("label").classList.toggle("selected", e.target.checked));
    });
    card.querySelector(".gf-up").addEventListener("click", () => {
      captureGroupFormsDom();
      const i = _gfGroups.findIndex((x) => x.id === g.id);
      if (i > 0) { [_gfGroups[i-1], _gfGroups[i]] = [_gfGroups[i], _gfGroups[i-1]]; drawGroupForms(); }
    });
    card.querySelector(".gf-down").addEventListener("click", () => {
      captureGroupFormsDom();
      const i = _gfGroups.findIndex((x) => x.id === g.id);
      if (i < _gfGroups.length - 1) { [_gfGroups[i+1], _gfGroups[i]] = [_gfGroups[i], _gfGroups[i+1]]; drawGroupForms(); }
    });
    card.querySelector(".gf-del").addEventListener("click", () => {
      if (!confirm(`'${g.name}' 환자군을 삭제할까요?`)) return;
      captureGroupFormsDom();
      _gfGroups = _gfGroups.filter((x) => x.id !== g.id);
      drawGroupForms();
    });
    wrap.appendChild(card);
  });

  document.getElementById("btn-gf-add").addEventListener("click", () => {
    captureGroupFormsDom();
    _gfGroups.push({ id: genId("grp"), name: "새 환자군", formIds: [] });
    drawGroupForms();
  });
  document.getElementById("btn-gf-cancel").addEventListener("click", screenStaffMenu);
  document.getElementById("btn-gf-save").addEventListener("click", () => {
    captureGroupFormsDom();
    // 이름이 빈 환자군은 제외
    const cleaned = _gfGroups.filter((g) => (g.name || "").trim());
    // 원본 배열을 내용만 교체 (다른 곳에서 참조 중인 배열 유지)
    PATIENT_GROUPS.length = 0;
    cleaned.forEach((g) => PATIENT_GROUPS.push({ id: g.id, name: g.name.trim(), formIds: g.formIds }));
    persistGroups();
    alert("저장되었습니다.");
    screenStaffMenu();
  });
}

// -------------------------------------------------------------
//  서류 편집 (항목 추가/삭제/순서/유형)
// -------------------------------------------------------------
let editingForm = null;
let editingIsNew = false;
let efSel = -1;   // 현재 선택된 항목 index (상단 메뉴로 서식 편집)

function screenEditForm(formObj, isNew) {
  editingForm = _clone(formObj);
  editingIsNew = !!isNew;
  efSel = -1;
  drawEditor();
}

// 정렬(문장 전체 공통)을 텍스트 블록(라벨/구역제목/안내문구)에 적용.
// 색·크기·굵게는 글자 단위(run)로 runsToHtml 이 span 에 직접 넣으므로 여기서 다루지 않는다.
function efApplyAlign(f, i) {
  const el = document.querySelector(`.wys-field[data-i="${i}"] .wys-text`);
  if (el && el.parentElement) el.parentElement.style.textAlign = f.align || "";
  scheduleEfPdfPreview();
}

// 편집기 리치텍스트 선택영역 추적 (색/크기/굵게 버튼이 포커스를 가져가도 유지)
let efLastSel = null;   // { i, start, end }

// 현재 선택된 항목의 편집 가능한 텍스트 스팬
function efCurrentEditable() {
  if (efSel < 0) return null;
  return document.querySelector(`.wys-field[data-i="${efSel}"] .wys-text`);
}
// 노드의 글자 길이 (텍스트=길이, <br>=1)
function efNodeLen(node) {
  if (node.nodeType === 3) return node.nodeValue.length;
  if (node.nodeName === "BR") return 1;
  let n = 0; node.childNodes.forEach((c) => { n += efNodeLen(c); }); return n;
}
// (컨테이너,오프셋) → 편집영역 내 글자 오프셋
function efNodeOffset(el, container, offset) {
  let count = 0, done = false;
  const walk = (node) => {
    if (done) return;
    if (node === container) {
      if (node.nodeType === 3) count += offset;
      else for (let k = 0; k < offset; k++) count += efNodeLen(node.childNodes[k]);
      done = true; return;
    }
    if (node.nodeType === 3) { count += node.nodeValue.length; return; }
    if (node.nodeName === "BR") { count += 1; return; }
    node.childNodes.forEach(walk);
  };
  walk(el);
  return count;
}
// 현재 선택영역의 글자 오프셋 {start,end}
function efSelOffsets(el) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const r = sel.getRangeAt(0);
  if (!el.contains(r.startContainer) || !el.contains(r.endContainer)) return null;
  const s = efNodeOffset(el, r.startContainer, r.startOffset);
  const e = efNodeOffset(el, r.endContainer, r.endOffset);
  return { start: Math.min(s, e), end: Math.max(s, e) };
}
// 글자 오프셋 [start,end] 로 선택영역 복원
function efSetSelection(el, start, end) {
  const locate = (target) => {
    let count = 0, res = null;
    const walk = (node) => {
      if (res) return;
      if (node.nodeType === 3) {
        const len = node.nodeValue.length;
        if (target <= count + len) { res = { node, offset: target - count }; return; }
        count += len;
      } else if (node.nodeName === "BR") {
        const p = node.parentNode, idx = Array.prototype.indexOf.call(p.childNodes, node);
        if (target <= count) { res = { node: p, offset: idx }; return; }
        count += 1;
      } else node.childNodes.forEach(walk);
    };
    walk(el);
    return res || { node: el, offset: el.childNodes.length };
  };
  const a = locate(start), b = locate(end);
  const range = document.createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}
// 현재 선택(또는 첫 조각) 대표 스타일
function efSelStyle() {
  const f = editingForm.fields[efSel];
  if (!f) return null;
  const el = efCurrentEditable();
  const runs = el ? domToRuns(el, f) : fieldRuns(f);
  let idx = 0;
  const off = el ? efSelOffsets(el) : null;
  if (off && off.end > off.start) idx = off.start;
  else if (efLastSel && efLastSel.i === efSel && efLastSel.end > efLastSel.start) idx = efLastSel.start;
  let acc = 0, target = runs[0];
  for (const r of runs) { const len = (r.t || "").length; target = r; if (idx < acc + len) break; acc += len; }
  return runStyle(target || { t: "" }, f);
}
// 선택영역(없으면 전체)에 색/크기/굵게 적용
function efApplyRunFmt(attr, value) {
  const el = efCurrentEditable();
  const f = editingForm.fields[efSel];
  if (!el || !f) return;
  el.focus();
  let off = efSelOffsets(el);
  if ((!off || off.start === off.end) && efLastSel && efLastSel.i === efSel) off = { start: efLastSel.start, end: efLastSel.end };
  if (!off) off = { start: 0, end: 0 };
  const runs = domToRuns(el, f);
  const newRuns = runsSetAttr(runs, off.start, off.end, attr, value);
  f.runs = newRuns;
  f.label = runsToText(newRuns);
  el.innerHTML = runsToHtml(newRuns, f);
  const total = f.label.length;
  const sel = (off.start === off.end) ? { start: 0, end: total } : off;
  efSetSelection(el, sel.start, sel.end);
  efLastSel = { i: efSel, start: sel.start, end: sel.end };
  efSyncToolbar();
  scheduleEfPdfPreview();
}

// 글자 색 팔레트 — 설문지에 어울리는 차분한 기본 계열 + 강조 계열
const EF_THEME_COLORS = ["#2c3e50", "#5f7481", "#34739e", "#2e7d6b", "#7a8a99", "#4a4a4a"];
const EF_ACCENT_COLORS = ["#c0392b", "#e67e22", "#d4a017", "#27ae60", "#2980b9", "#8e44ad"];
function efSwatches(list) {
  return list
    .map((c) => `<button type="button" class="ft-sw" data-color="${c}" style="background:${c}" title="${c}"></button>`)
    .join("");
}

function drawEditor() {
  setStep(editingIsNew ? "새 서류" : "서류 편집");
  app.innerHTML = `
    <h2 class="screen-title">${editingIsNew ? "새 서류 만들기" : "서류 편집"}</h2>

    <div class="ef-toolbar" id="ef-toolbar">
      <div class="ft-sel" id="ft-sel">편집할 항목을 눌러 선택하세요</div>
      <div class="ft-controls disabled" id="ft-controls">
        <div class="ft-aligns">
          <button type="button" class="ft-align" data-align="left" title="왼쪽 정렬">좌</button>
          <button type="button" class="ft-align" data-align="center" title="가운데 정렬">가운데</button>
          <button type="button" class="ft-align" data-align="right" title="오른쪽 정렬">우</button>
        </div>
        <button type="button" class="ft-btn" id="ft-bold" title="굵게"><b>굵게</b></button>
        <div class="ft-size">
          <button type="button" class="ft-btn" id="ft-size-dn" title="작게">A−</button>
          <span class="ft-size-val" id="ft-size-val">100%</span>
          <button type="button" class="ft-btn" id="ft-size-up" title="크게">A+</button>
        </div>
        <div class="ft-color-group">
          <div class="ft-pal" title="설문지에 어울리는 기본 색">
            <span class="ft-pal-lbl">기본</span>
            ${efSwatches(EF_THEME_COLORS)}
          </div>
          <div class="ft-pal" title="강조용 색">
            <span class="ft-pal-lbl">강조</span>
            ${efSwatches(EF_ACCENT_COLORS)}
          </div>
          <label class="ft-color" title="직접 선택(스포이드)">
            <span class="ft-color-dot" id="ft-color-dot"></span>
            <input type="color" id="ft-color-input" value="#5f7481" />
            <span>직접</span>
          </label>
          <button type="button" class="ft-btn" id="ft-color-reset">기본색</button>
        </div>
      </div>
    </div>

    <div class="ef-layout">
      <div class="ef-main">
        <div class="card">
          <label class="field-label">서류 이름</label>
          <input id="ef-name" class="box-input" value="${escAttr(editingForm.name)}" placeholder="예) 초진기록지" />

          <label class="field-label" style="margin-top:18px;">전체 크기(밀도) <span id="ef-scale-val" class="scale-val"></span></label>
          <input type="range" id="ef-scale" class="scale-range" min="70" max="150" step="5" />
          <div class="scale-ends"><span>작게 (한 페이지에 많이)</span><span>크게</span></div>

          <label class="choice" id="ef-jpg-label" style="margin-top:18px; display:flex; align-items:center; gap:10px;">
            <input type="checkbox" id="ef-savejpg" />
            <span>JPG로도 저장 <span style="color:var(--text-soft); font-size:14px;">(PDF와 함께 그림파일로도 남깁니다)</span></span>
          </label>
        </div>

        <div style="font-weight:700; margin:14px 2px 6px;">항목 편집 <span style="color:var(--text-soft); font-weight:400; font-size:14px;">— 항목을 눌러 위 메뉴로 꾸미세요</span></div>
        <div class="wys-preview" id="ef-preview"></div>
        <button class="btn btn-ghost btn-block" id="btn-add-field" style="margin-top:8px;">+ 항목 추가</button>

        <div class="card" style="margin-top:22px;">
          <label class="field-label">이 서류를 사용할 환자군</label>
          <div class="choice-group" id="ef-groups"></div>
        </div>
      </div>

      <div class="ef-side">
        <div class="ef-pdf-panel">
          <div class="ef-pdf-panel-head">
            <span>실제 출력 미리보기 <span style="color:var(--text-soft); font-weight:400; font-size:13px;">— 수정하면 자동으로 갱신됩니다</span></span>
            <button type="button" class="btn btn-gray" id="ef-pdf-toggle" style="padding:5px 12px; min-height:34px; font-size:14px;">숨기기</button>
          </div>
          <div class="ef-pdf-preview" id="ef-pdf-preview"></div>
        </div>
      </div>
    </div>

    <div class="footer-bar">
      <button class="btn btn-gray" id="btn-ef-cancel">취소</button>
      <button class="btn btn-primary grow2" id="btn-ef-save">저장</button>
    </div>
  `;

  renderEfPreview();
  wireEfToolbar();

  // 실제 출력(PDF) 미리보기 — 접기/펼치기 + 편집 시 자동 갱신
  const pdfToggle = document.getElementById("ef-pdf-toggle");
  pdfToggle.addEventListener("click", () => {
    const box = document.getElementById("ef-pdf-preview");
    const hidden = box.classList.toggle("hidden");
    pdfToggle.textContent = hidden ? "보이기" : "숨기기";
    if (!hidden) renderEfPdfPreview();
  });
  // 편집영역(항목·설정 입력)에서 값이 바뀌면 PDF 미리보기를 자동 갱신
  const efPrev = document.getElementById("ef-preview");
  efPrev.addEventListener("input", scheduleEfPdfPreview);
  efPrev.addEventListener("change", scheduleEfPdfPreview);

  // 환자군 체크
  const gc = document.getElementById("ef-groups");
  PATIENT_GROUPS.forEach((g) => {
    const checked = (g.formIds || []).includes(editingForm.id);
    const el = document.createElement("label");
    el.className = "choice" + (checked ? " selected" : "");
    el.innerHTML = `<input type="checkbox" class="eg-check" value="${g.id}" ${checked ? "checked" : ""}/> ${escHtml(g.name)}`;
    el.querySelector("input").addEventListener("change", (e) => el.classList.toggle("selected", e.target.checked));
    gc.appendChild(el);
  });

  // 크기 슬라이더
  const scaleEl = document.getElementById("ef-scale");
  const scaleVal = document.getElementById("ef-scale-val");
  const curScale = Math.round((editingForm.scale || 1) * 100);
  scaleEl.value = curScale;
  scaleVal.textContent = curScale + "%";
  scaleEl.addEventListener("input", () => {
    editingForm.scale = Number(scaleEl.value) / 100;
    scaleVal.textContent = scaleEl.value + "%";
    scheduleEfPdfPreview();
  });

  // JPG로도 저장 옵션
  const jpgEl = document.getElementById("ef-savejpg");
  const jpgLabel = document.getElementById("ef-jpg-label");
  jpgEl.checked = !!editingForm.saveJpg;
  jpgLabel.classList.toggle("selected", jpgEl.checked);
  jpgEl.addEventListener("change", () => {
    editingForm.saveJpg = jpgEl.checked;
    jpgLabel.classList.toggle("selected", jpgEl.checked);
  });

  // 서류 이름 실시간 반영
  document.getElementById("ef-name").addEventListener("input", (e) => {
    editingForm.name = e.target.value;
    scheduleEfPdfPreview();
  });

  document.getElementById("btn-add-field").addEventListener("click", () => {
    editingForm.fields.push({ type: "write", key: genId("k"), label: "새 항목" });
    efSel = editingForm.fields.length - 1;
    renderEfPreview();
    efSyncToolbar();
    const last = document.querySelector(`.wys-field[data-i="${efSel}"]`);
    if (last) last.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  document.getElementById("btn-ef-cancel").addEventListener("click", screenFormManage);
  document.getElementById("btn-ef-save").addEventListener("click", saveEditor);

  efSyncToolbar();
}

// 미리보기 전체를 다시 그림
function renderEfPreview() {
  const wrap = document.getElementById("ef-preview");
  if (!wrap) return;
  wrap.innerHTML = "";
  editingForm.fields.forEach((f, i) => wrap.appendChild(efFieldBlock(f, i)));
  scheduleEfPdfPreview();
}

// 실제 출력(PDF) 미리보기 — 잦은 편집에 대비해 잠깐 모아서 다시 그린다
let _efPdfTimer = null;
let _efPdfToken = 0;
function scheduleEfPdfPreview() {
  const box = document.getElementById("ef-pdf-preview");
  if (!box || box.classList.contains("hidden")) return;
  clearTimeout(_efPdfTimer);
  _efPdfTimer = setTimeout(renderEfPdfPreview, 500);
}
async function renderEfPdfPreview() {
  const box = document.getElementById("ef-pdf-preview");
  if (!box || box.classList.contains("hidden") || !editingForm) return;
  const token = ++_efPdfToken;
  try {
    const res = await generatePdf(editingForm, {}, { blank: true, groupName: "" });
    if (token !== _efPdfToken) return;   // 그 사이 또 바뀌었으면 버림
    const cur = document.getElementById("ef-pdf-preview");
    if (!cur) return;
    await renderPdfIntoElement(res.bytes, cur);
  } catch (e) {
    if (token !== _efPdfToken) return;
    const cur = document.getElementById("ef-pdf-preview");
    if (cur) cur.innerHTML = `<div style="padding:14px; color:var(--danger); font-size:14px;">미리보기를 만들 수 없습니다: ${escHtml(e.message)}</div>`;
  }
}

// 빈 편집영역에 옅게 보일 안내 문구
function efPlaceholder(f) {
  if (f.type === "section") return "구역 제목 입력";
  if (f.type === "note") return "안내 문구 입력";
  if (f.type === "youtube") return "영상 설명 입력 (선택)";
  return "제목 입력 (비우면 출력에서 한 줄 줄어듭니다)";
}
// 유튜브 항목 미리보기 박스 (썸네일 또는 안내). 설정(⚙)에서 링크 입력.
function efYtBoxHtml(f) {
  const id = youtubeId(f.url);
  if (id) {
    return `<div class="yt-box" data-vid="${escAttr(id)}"><img class="yt-thumb" src="https://img.youtube.com/vi/${escAttr(id)}/hqdefault.jpg" alt="유튜브 미리보기" /><span class="yt-play">▶</span></div>`;
  }
  return `<div class="yt-box yt-empty" data-vid="">유튜브 링크를 설정(⚙)에서 입력하세요</div>`;
}
// 편집 가능한 리치텍스트 스팬 (글자 단위 색·크기·굵게)
function efEditableHtml(f) {
  // 비어 있으면 자식 없이 두어 CSS :empty 로 안내문구가 보이게 함
  const html = runsToText(fieldRuns(f)).length ? runsToHtml(fieldRuns(f), f) : "";
  return `<span class="wys-text" contenteditable="true" spellcheck="false" data-ph="${escAttr(efPlaceholder(f))}">${html}</span>`;
}
// 실제 화면(미리보기)처럼 보이는 항목 본문 HTML
function efBodyHtml(f) {
  const req = f.required ? '<span class="req">*</span>' : "";
  const ed = efEditableHtml(f);
  if (f.type === "section") return `<div class="section-head">${ed}</div>`;
  if (f.type === "note") return `<div class="note-text">${ed}</div>`;
  if (f.type === "youtube") return `<div class="note-text yt-desc">${ed}</div>${efYtBoxHtml(f)}`;
  const label = `<label class="field-label">${ed}${req}</label>`;
  if (f.type === "write") return `${label}<div class="wys-box">${escHtml(f.hint || "여기에 손으로 써주세요")}</div>`;
  if (f.type === "writeBig") return `${label}<div class="wys-box tall">${escHtml(f.hint || "여기에 손으로 써주세요")}</div>`;
  if (f.type === "number") return `${label}<div class="wys-box">${escHtml(f.format ? "표시형식: " + f.format : "숫자 입력 (표시형식 미지정)")}</div>`;
  if (f.type === "signature") return `${label}<div class="wys-box dashed">여기에 서명해 주세요</div>`;
  if (f.type === "radio" || f.type === "checkbox") {
    const opts = (f.options && f.options.length) ? f.options : ["선택지 1", "선택지 2"];
    const mark = f.type === "radio" ? "○" : "☐";
    // 선택 항목은 제목(텍스트)을 지울 수 있는 X 버튼을 둔다(지우면 출력에서 제목 줄이 사라짐)
    const clabel = `<label class="field-label">${ed}${req}<button type="button" class="wys-label-del" title="제목 삭제 (출력에서 한 줄 줄임)">✕</button></label>`;
    return `${clabel}<div class="choice-group">${opts.map((o) => `<span class="choice">${mark} ${escHtml(o)}</span>`).join("")}</div>`;
  }
  return label;
}

// 항목 하나를 미리보기 블록으로 만듦 (클릭 시 선택 → 상단 메뉴로 서식 편집)
function efFieldBlock(f, i) {
  const block = document.createElement("div");
  block.className = "wys-field" + (i === efSel ? " sel" : "");
  block.dataset.i = i;

  const tools = document.createElement("div");
  tools.className = "wys-tools";
  tools.innerHTML = `
    <span class="wys-type">${escHtml(typeName(f.type))}</span>
    <button type="button" data-act="up" title="위로">▲</button>
    <button type="button" data-act="down" title="아래로">▼</button>
    <button type="button" data-act="add" title="아래에 항목 추가">＋</button>
    <button type="button" data-act="gear" title="자세히 편집">⚙</button>
    <button type="button" data-act="del" title="삭제">✕</button>`;

  const body = document.createElement("div");
  body.className = "wys-body";
  body.innerHTML = efBodyHtml(f);

  const settings = efSettingsPanel(f, i);
  settings.classList.add("hidden");

  block.appendChild(tools);
  block.appendChild(body);
  block.appendChild(settings);

  // 리치텍스트 편집영역: 정렬 적용 + 입력/선택 연결
  const edit = body.querySelector(".wys-text");
  if (edit) {
    if (edit.parentElement) edit.parentElement.style.textAlign = f.align || "";
    const track = () => {
      const o = efSelOffsets(edit);
      if (o) { efSel = i; efLastSel = { i, start: o.start, end: o.end }; efSyncToolbar(); }
    };
    edit.addEventListener("focus", () => efSelect(i));
    edit.addEventListener("keyup", track);
    edit.addEventListener("mouseup", track);
    edit.addEventListener("input", () => {
      f.runs = domToRuns(edit, f);
      f.label = runsToText(f.runs);
      efSyncToolbar();
    });
    edit.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (f.type === "note") document.execCommand("insertLineBreak");
      }
    });
  }

  // 선택 항목 제목 삭제(X) → 텍스트를 비워 출력에서 제목 줄을 없앤다
  const labelDel = body.querySelector(".wys-label-del");
  if (labelDel) {
    labelDel.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      f.label = ""; delete f.runs;
      renderEfPreview();
      efSyncToolbar();
    });
  }

  // 본문 클릭 → 선택 (도구/설정/편집영역 제외)
  block.addEventListener("click", (e) => {
    if (e.target.closest(".wys-tools") || e.target.closest(".wys-settings") || e.target.closest(".wys-text") || e.target.closest(".wys-label-del")) return;
    efSelect(i);
  });

  tools.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const act = b.dataset.act;
      if (act === "gear") { settings.classList.toggle("hidden"); return; }
      if (act === "add") {
        // 이 항목 바로 아래에 새 항목을 추가하고 선택
        editingForm.fields.splice(i + 1, 0, { type: "write", key: genId("k"), label: "새 항목" });
        efSel = i + 1;
        renderEfPreview();
        efSyncToolbar();
        const nf = document.querySelector(`.wys-field[data-i="${efSel}"]`);
        if (nf) nf.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (act === "del") {
        editingForm.fields.splice(i, 1);
        if (efSel === i) efSel = -1; else if (efSel > i) efSel--;
      } else if (act === "up" && i > 0) {
        const a = editingForm.fields; [a[i-1], a[i]] = [a[i], a[i-1]];
        if (efSel === i) efSel = i-1; else if (efSel === i-1) efSel = i;
      } else if (act === "down" && i < editingForm.fields.length - 1) {
        const a = editingForm.fields; [a[i+1], a[i]] = [a[i], a[i+1]];
        if (efSel === i) efSel = i+1; else if (efSel === i+1) efSel = i;
      } else return;
      renderEfPreview();
      efSyncToolbar();
    });
  });
  return block;
}

// 항목 구조 편집 패널 (종류·이름·선택지·필수)
function efSettingsPanel(f, i) {
  const panel = document.createElement("div");
  panel.className = "wys-settings";
  const isChoice = f.type === "radio" || f.type === "checkbox";
  const isText = f.type === "section" || f.type === "note" || f.type === "youtube";
  panel.innerHTML = `
    <label class="wys-set-label">종류</label>
    <select class="s-type box-input">
      ${FIELD_TYPES.map((t) => `<option value="${t.v}" ${t.v === f.type ? "selected" : ""}>${t.t}</option>`).join("")}
    </select>
    <p class="wys-set-hint">${isText ? "내용" : "항목 이름"}은 위 미리보기에서 직접 입력하세요. 글자를 선택한 뒤 상단 메뉴로 색·크기·굵게를 글자별로 지정할 수 있습니다.</p>
    <div class="s-opt-wrap ${isChoice ? "" : "hidden"}">
      <label class="wys-set-label">선택지 (한 줄에 하나씩)</label>
      <textarea class="s-options box-textarea">${escHtml((f.options || []).join("\n"))}</textarea>
    </div>
    <div class="s-fmt-wrap ${f.type === "number" ? "" : "hidden"}">
      <label class="wys-set-label">표시형식 <span style="color:var(--text-soft); font-weight:400;">— 0 자리에 숫자가 들어가고, 다른 글자는 그대로 표시됩니다. 예) 00kg, 000-0000-0000</span></label>
      <input class="s-format box-input" value="${escAttr(f.format || "")}" placeholder="예) 00kg 또는 000-0000-0000" />
    </div>
    <div class="s-hint-wrap ${(f.type === "write" || f.type === "writeBig" || f.type === "number") ? "" : "hidden"}">
      <label class="wys-set-label">빈칸 안내 문구 <span style="color:var(--text-soft); font-weight:400;">— 빈칸에 옅게 표시되는 문구</span></label>
      <input class="s-hint box-input" value="${escAttr(f.hint || "")}" placeholder="예) 여기에 손으로 써주세요" />
    </div>
    <div class="s-yt-wrap ${f.type === "youtube" ? "" : "hidden"}">
      <label class="wys-set-label">유튜브 링크 <span style="color:var(--text-soft); font-weight:400;">— 작성 화면에서만 재생되며, 출력·저장(PDF·JPG)에는 포함되지 않습니다</span></label>
      <input class="s-youtube box-input" value="${escAttr(f.url || "")}" placeholder="예) https://youtu.be/xxxxxxxxxxx" />
    </div>
    <label class="ef-req ${isText ? "hidden" : ""}"><input type="checkbox" class="s-required" ${f.required ? "checked" : ""}/> 필수 항목</label>
  `;

  // 종류 변경
  panel.querySelector(".s-type").addEventListener("change", (e) => {
    f.type = e.target.value;
    if (f.type === "section" || f.type === "note" || f.type === "youtube") { delete f.key; delete f.required; }
    else if (!f.key) f.key = genId("k");
    renderEfPreview();
    const np = document.querySelector(`.wys-field[data-i="${i}"] .wys-settings`);
    if (np) np.classList.remove("hidden");
    efSyncToolbar();
  });

  // 이름/내용은 미리보기(contenteditable)에서 직접 편집한다.

  // 선택지 (실시간, 선택지 목록만 갱신)
  const optEl = panel.querySelector(".s-options");
  if (optEl) optEl.addEventListener("input", () => {
    f.options = optEl.value.split("\n").map((s) => s.trim()).filter(Boolean);
    const cg = document.querySelector(`.wys-field[data-i="${i}"] .choice-group`);
    if (cg) {
      const opts = f.options.length ? f.options : ["선택지 1", "선택지 2"];
      const mark = f.type === "radio" ? "○" : "☐";
      cg.innerHTML = opts.map((o) => `<span class="choice">${mark} ${escHtml(o)}</span>`).join("");
    }
  });

  // 표시형식(마스크) — 숫자형식 항목만
  const fmtEl = panel.querySelector(".s-format");
  if (fmtEl) fmtEl.addEventListener("input", () => {
    f.format = fmtEl.value.trim();
    const box = document.querySelector(`.wys-field[data-i="${i}"] .wys-box`);
    if (box) box.textContent = f.format ? "표시형식: " + f.format : "숫자 입력 (표시형식 미지정)";
  });

  // 유튜브 링크 — 입력 시 미리보기 썸네일과 출력 미리보기 갱신
  const ytEl = panel.querySelector(".s-youtube");
  if (ytEl) ytEl.addEventListener("input", () => {
    f.url = ytEl.value.trim();
    const box = document.querySelector(`.wys-field[data-i="${i}"] .yt-box`);
    if (box && box.dataset.vid !== youtubeId(f.url)) {
      const tmp = document.createElement("div");
      tmp.innerHTML = efYtBoxHtml(f);
      box.replaceWith(tmp.firstElementChild);
    }
    scheduleEfPdfPreview();
  });

  // 빈칸 안내 문구 — 손글씨(write/writeBig)·숫자형식(number) 항목
  const hintEl = panel.querySelector(".s-hint");
  if (hintEl) hintEl.addEventListener("input", () => {
    f.hint = hintEl.value;
    // 미리보기 박스는 손글씨 칸에서만 안내문구를 보여준다(숫자칸은 표시형식 미리보기 유지)
    if (f.type === "write" || f.type === "writeBig") {
      const box = document.querySelector(`.wys-field[data-i="${i}"] .wys-box`);
      if (box) box.textContent = f.hint || "여기에 손으로 써주세요";
    }
  });

  // 필수 (실시간, * 표시만 갱신)
  const reqEl = panel.querySelector(".s-required");
  if (reqEl) reqEl.addEventListener("change", () => {
    f.required = reqEl.checked;
    const t = document.querySelector(`.wys-field[data-i="${i}"] .wys-body .wys-text`);
    if (t) {
      const ex = t.querySelector(".req");
      if (f.required && !ex) { const s = document.createElement("span"); s.className = "req"; s.textContent = "*"; t.appendChild(s); }
      else if (!f.required && ex) ex.remove();
    }
  });

  return panel;
}

// 항목 선택
function efSelect(i) {
  efSel = i;
  document.querySelectorAll(".wys-field").forEach((el) => el.classList.toggle("sel", +el.dataset.i === i));
  efSyncToolbar();
}

// 글씨 크기 조절 (0.6~2.0) — 선택한 글자(없으면 문장 전체)에 적용
function efBumpSize(d) {
  const st = efSelStyle();
  if (!st) return;
  let s = Math.round(((st.size || 1) + d) * 10) / 10;
  s = Math.max(0.6, Math.min(2, s));
  efApplyRunFmt("size", s);   // s===1 이면 기본 크기로 되돌아감(정규화 시 제거)
}

// 상단 서식 메뉴 동작 연결
function wireEfToolbar() {
  const tb = document.getElementById("ef-toolbar");
  // 버튼 클릭이 편집영역의 선택을 잃지 않도록 mousedown 기본동작 차단
  tb.querySelectorAll(".ft-align, .ft-btn").forEach((b) => {
    b.addEventListener("mousedown", (e) => e.preventDefault());
  });
  tb.querySelectorAll(".ft-align").forEach((b) => {
    b.addEventListener("click", () => {
      const f = editingForm.fields[efSel]; if (!f) return;
      f.align = b.dataset.align;
      efApplyAlign(f, efSel); efSyncToolbar();
    });
  });
  document.getElementById("ft-bold").addEventListener("click", () => {
    const st = efSelStyle(); if (!st) return;
    efApplyRunFmt("bold", !st.bold);
  });
  document.getElementById("ft-size-dn").addEventListener("click", () => efBumpSize(-0.1));
  document.getElementById("ft-size-up").addEventListener("click", () => efBumpSize(0.1));
  tb.querySelectorAll(".ft-sw").forEach((b) => {
    b.addEventListener("click", () => efApplyRunFmt("color", b.dataset.color));
  });
  const ci = document.getElementById("ft-color-input");
  ci.addEventListener("input", () => {
    document.getElementById("ft-color-dot").style.background = ci.value;
    efApplyRunFmt("color", ci.value);
  });
  document.getElementById("ft-color-reset").addEventListener("click", () => {
    efApplyRunFmt("color", null);
  });
}

// 상단 메뉴 상태를 선택된 항목(또는 선택한 글자)에 맞게 갱신
function efSyncToolbar() {
  const controls = document.getElementById("ft-controls");
  const selLabel = document.getElementById("ft-sel");
  if (!controls || !selLabel) return;
  const f = editingForm.fields[efSel];
  if (!f) {
    controls.classList.add("disabled");
    selLabel.textContent = "편집할 항목을 눌러 선택하세요";
    return;
  }
  controls.classList.remove("disabled");
  const name = (f.label || "").trim();
  const shortName = name.length > 12 ? name.slice(0, 12) + "…" : name;
  selLabel.textContent = `선택: ${typeName(f.type)}${name ? " · " + shortName : ""}`;
  const align = f.align || "left";
  document.querySelectorAll(".ft-align").forEach((b) => b.classList.toggle("on", b.dataset.align === align));
  const st = efSelStyle() || runStyle(fieldRuns(f)[0], f);
  document.getElementById("ft-bold").classList.toggle("on", !!st.bold);
  document.getElementById("ft-size-val").textContent = Math.round((st.size || 1) * 100) + "%";
  document.getElementById("ft-color-dot").style.background = st.color || "#5f7481";
  document.getElementById("ft-color-input").value = st.color || "#5f7481";
}

function saveEditor() {
  const nameEl = document.getElementById("ef-name");
  editingForm.name = (nameEl.value || "").trim();
  // runs → label 동기화. 서식이 없는(플레인) 텍스트면 runs 를 없애 데이터를 단순화.
  editingForm.fields.forEach((f) => {
    const runs = normalizeRuns(fieldRuns(f));
    f.label = runsToText(runs).trim();
    const plain = runs.length === 1 && runs[0].color == null && runs[0].size == null && runs[0].bold == null;
    if (plain) delete f.runs; else f.runs = runs;
  });
  if (!editingForm.name) return alert("서류 이름을 입력하세요.");
  if (editingForm.fields.length === 0) return alert("항목을 최소 하나 이상 추가하세요.");
  // 선택 항목인데 선택지가 없으면 경고
  for (const f of editingForm.fields) {
    if ((f.type === "radio" || f.type === "checkbox") && (!f.options || f.options.length === 0)) {
      return alert(`'${f.label || "선택 항목"}'의 선택지를 입력하세요.`);
    }
  }
  // 저장 (FORMS 에는 사본을 넣어, 편집을 이어가도 저장 전 내용이 섞이지 않게 함)
  FORMS[editingForm.id] = _clone(editingForm);
  persistForms();
  // 환자군 연결 갱신
  const selected = [...document.querySelectorAll(".eg-check:checked")].map((c) => c.value);
  PATIENT_GROUPS.forEach((g) => {
    g.formIds = g.formIds || [];
    const has = g.formIds.includes(editingForm.id);
    const want = selected.includes(g.id);
    if (want && !has) g.formIds.push(editingForm.id);
    if (!want && has) g.formIds = g.formIds.filter((x) => x !== editingForm.id);
  });
  persistGroups();
  // 편집 메뉴에 그대로 머무르며 계속 편집할 수 있게, 페이지 이동 없이 버튼에만 저장 표시
  editingIsNew = false;
  setStep("서류 편집");
  efFlashSaved();
}

// 저장 버튼에 잠깐 '저장됨' 을 표시(화면 이동 없이 편집 계속)
let _efSavedTimer = null;
function efFlashSaved() {
  const btn = document.getElementById("btn-ef-save");
  if (!btn) return;
  btn.textContent = "저장됨 ✓";
  btn.classList.add("btn-saved");
  clearTimeout(_efSavedTimer);
  _efSavedTimer = setTimeout(() => {
    const b = document.getElementById("btn-ef-save");
    if (b) { b.textContent = "저장"; b.classList.remove("btn-saved"); }
  }, 1600);
}
