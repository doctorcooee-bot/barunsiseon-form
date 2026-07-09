// =============================================================
//  메인 흐름 제어
//  시작 → 서류선택 → (서류 작성) → 동의 → 완료(PDF)
// =============================================================

const app = document.getElementById("app");
const topbarStep = document.getElementById("topbarStep");
const loadingEl = document.getElementById("loading");
const loadingText = document.getElementById("loadingText");

// 진행 상태 저장
let state = {};
function resetState() {
  state = {
    patientName: "",
    chartNo: "",
    groupId: "",
    groupName: "",
    selectedFormIds: [],
    currentIndex: 0,
    answers: {},          // { formId: { key: value } }
    consentAgreed: false,
    consentSignImg: null,
    files: [],            // { formName, fileName, blob, url, bytes, mimeType, kind:"pdf"|"jpg" }
    uploadStatus: [],     // files 와 같은 순서
  };
}

function showLoading(text) {
  loadingText.textContent = text || "처리 중입니다…";
  loadingEl.classList.remove("hidden");
}
function hideLoading() { loadingEl.classList.add("hidden"); }
function setStep(text) { topbarStep.textContent = text || ""; }

// -------------------------------------------------------------
//  작성 중 자동 저장 (새로고침·앱 종료 시 데이터 유실 방지)
//  - 작성 내용을 브라우저(localStorage)에 계속 저장했다가,
//    앱을 다시 열면 "이어서 작성" 할 수 있게 합니다.
//  - 제출이 끝나면 자동으로 지워집니다.
// -------------------------------------------------------------
const DRAFT_KEY = "barunsiseon_draft_v1";
let saveInProgressForm = null;   // 현재 작성 화면의 입력을 state 로 옮기는 함수
let preferredInputMode = "type"; // 전체 입력 방식 : "hand"(손글씨) | "type"(키보드) — 기본은 키보드
let annotBlocks = [];            // 현재 작성 화면의 강조 필기 블록들(전체 그리기 모드 제어용)

function serializeDraft() {
  return {
    patientName: state.patientName,
    chartNo: state.chartNo,
    groupId: state.groupId,
    groupName: state.groupName,
    selectedFormIds: state.selectedFormIds,
    currentIndex: state.currentIndex,
    answers: state.answers,
    savedAt: Date.now(),
  };
}

// 손글씨·서명 이미지를 빼고 선택 항목만 남긴다 (용량 초과 대비)
function stripImageAnswers(answers) {
  const out = {};
  Object.keys(answers || {}).forEach((formId) => {
    const form = FORMS[formId];
    const vals = answers[formId] || {};
    const kept = {};
    Object.keys(vals).forEach((key) => {
      const field = form && form.fields.find((f) => f.key === key);
      const isImg = field && (field.type === "write" || field.type === "writeBig" || field.type === "signature");
      if (!isImg) kept[key] = vals[key];
    });
    out[formId] = kept;
  });
  return out;
}

function saveDraft() {
  if (!state.selectedFormIds || !state.selectedFormIds.length) return;
  const draft = serializeDraft();
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (e) {
    // 용량 초과 등: 손글씨·서명 이미지는 빼고 선택 항목만이라도 저장
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, answers: stripImageAnswers(draft.answers) }));
    } catch (_) { /* 저장 실패 시 조용히 무시 */ }
  }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.selectedFormIds) || !d.selectedFormIds.length) return null;
    // 저장된 서류가 현재 서류 정의에 모두 존재할 때만 복구 (편집으로 사라진 서류 방지)
    if (!d.selectedFormIds.every((id) => FORMS[id])) return null;
    return d;
  } catch (e) { return null; }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
}

// 앱을 벗어나거나 화면이 가려질 때(아이패드 백그라운드 전환·탭 이탈 등) 즉시 저장
window.addEventListener("pagehide", () => { if (saveInProgressForm) saveInProgressForm(); saveDraft(); });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") { if (saveInProgressForm) saveInProgressForm(); saveDraft(); }
});

// -------------------------------------------------------------
//  1) 시작 화면 : 서류 전체 + 환자군 빠른 선택 (환자 정보 입력 없음)
//     - 환자군 버튼을 누르면 해당 서류가 자동 체크됩니다.
//     - 필요한 서류를 추가로 체크할 수 있습니다.
//     - 환자 이름·차트번호는 작성 완료 후 직원 화면에서 입력합니다.
// -------------------------------------------------------------
function screenStart() {
  resetState();
  saveInProgressForm = null;
  setStep("1 / 3  ·  서류 선택");
  app.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
      <h2 class="screen-title" style="margin:0;">작성할 서류 선택</h2>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-gray" id="btn-staff-menu" style="padding:6px 12px; min-height:36px; font-size:13px;">👤 직원 메뉴</button>
        <button class="btn btn-gray" id="btn-admin" style="padding:6px 12px; min-height:36px; font-size:13px;">⚙ 관리자 설정</button>
      </div>
    </div>
    <p class="screen-desc">환자군을 누르면 해당 서류가 자동 선택됩니다. 필요한 서류를 추가로 체크하세요.</p>
    <div class="group-quick" id="group-quick"></div>
    <div class="select-list compact" id="form-list"></div>
    <div class="footer-bar">
      <button class="btn btn-primary btn-lg btn-block" id="btn-start">작성 시작 →</button>
    </div>
  `;

  const selected = new Set();
  const formIds = Object.keys(FORMS);
  const gq = document.getElementById("group-quick");
  const list = document.getElementById("form-list");
  const itemEls = {};   // formId → 화면 요소

  // 전체 서류 목록 (체크 토글)
  formIds.forEach((id) => {
    const f = FORMS[id];
    const item = document.createElement("div");
    item.className = "select-item";
    item.innerHTML = `<div class="label-wrap"><span class="check">✓</span> ${escHtml(f.name)}</div>`;
    item.addEventListener("click", () => {
      if (selected.has(id)) { selected.delete(id); item.classList.remove("selected"); }
      else { selected.add(id); item.classList.add("selected"); }
      refreshGroups();
    });
    itemEls[id] = item;
    list.appendChild(item);
  });

  // 환자군 빠른 선택 버튼 (누르면 해당 서류 전체 체크/해제)
  const groupBtns = [];
  PATIENT_GROUPS.forEach((g) => {
    const ids = (g.formIds || []).filter((id) => FORMS[id]);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "gq-btn";
    b.textContent = g.name;
    b.addEventListener("click", () => {
      const allOn = ids.length && ids.every((id) => selected.has(id));
      ids.forEach((id) => {
        if (allOn) { selected.delete(id); itemEls[id].classList.remove("selected"); }
        else { selected.add(id); itemEls[id].classList.add("selected"); }
      });
      refreshGroups();
    });
    groupBtns.push({ el: b, ids, name: g.name });
    gq.appendChild(b);
  });

  // 현재 선택에 해당하는 "가장 구체적인" 환자군 목록 (부분집합 환자군은 제외).
  //  예: 통증(4종)을 고르면 그 부분집합인 피부관리(3종)는 강조/기록하지 않음.
  function effectiveGroups() {
    const active = groupBtns.filter(({ ids }) => ids.length && ids.every((id) => selected.has(id)));
    return active.filter((me) =>
      !active.some((o) => o !== me && o.ids.length > me.ids.length && me.ids.every((id) => o.ids.includes(id))));
  }
  function refreshGroups() {
    const eff = new Set(effectiveGroups());
    groupBtns.forEach((gb) => gb.el.classList.toggle("on", eff.has(gb)));
  }
  refreshGroups();

  document.getElementById("btn-admin").addEventListener("click", screenAdminLogin);
  document.getElementById("btn-staff-menu").addEventListener("click", () => requireStaff(screenStaffMenu));
  document.getElementById("btn-start").addEventListener("click", () => {
    if (selected.size === 0) return alert("작성할 서류를 하나 이상 선택해 주세요.");
    state.selectedFormIds = formIds.filter((id) => selected.has(id));
    const eff = effectiveGroups();
    state.groupName = eff.length ? eff.map((g) => g.name).join(", ") : "직접 선택";
    state.groupId = "";
    state.currentIndex = 0;
    screenPatientName();
  });
}

// -------------------------------------------------------------
//  2) 환자 성명 입력 : 모든 서류 작성 전, 키보드로 필수 입력
// -------------------------------------------------------------
function screenPatientName() {
  saveInProgressForm = null;
  setStep("환자 성명");
  app.innerHTML = `
    <h2 class="screen-title">환자 성명 입력</h2>
    <p class="screen-desc">환자분의 성명을 키보드로 입력해 주세요.</p>
    <div class="card">
      <div class="field">
        <label class="field-label">환자 성명<span class="req">*</span></label>
        <input id="pn-name" class="box-input" placeholder="예) 홍길동" autocomplete="off" value="${escAttr(state.patientName)}" />
      </div>
    </div>
    <div class="footer-bar">
      <button class="btn btn-gray" id="btn-back">← 뒤로</button>
      <button class="btn btn-primary grow2" id="btn-next">다음 : 서류 작성 →</button>
    </div>
  `;
  const input = document.getElementById("pn-name");
  const go = () => {
    const name = input.value.trim();
    if (!name) { input.focus(); return alert("환자 성명을 입력해 주세요."); }
    state.patientName = name;
    state.currentIndex = 0;
    saveDraft();
    screenFill();
  };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  document.getElementById("btn-back").addEventListener("click", screenStart);
  document.getElementById("btn-next").addEventListener("click", go);
  setTimeout(() => input.focus(), 120);
  scrollTop();
}

// 정렬(문장 전체 공통)만 요소에 적용. 색·크기·굵게는 글자 단위(run)로
// runsToHtml 이 span 에 직접 넣는다.
function applyFieldTextStyle(el, f) {
  if (f.align) el.style.textAlign = f.align;
}

// -------------------------------------------------------------
//  3) 서류 작성 : 선택한 서류를 하나씩 작성
// -------------------------------------------------------------
function screenFill() {
  const formId = state.selectedFormIds[state.currentIndex];
  const form = FORMS[formId];
  const total = state.selectedFormIds.length;
  setStep(`2 / 3  ·  작성 (${state.currentIndex + 1}/${total})`);

  app.innerHTML = `
    <h2 class="screen-title">${form.name}</h2>
    <p class="screen-desc">빈칸에 손으로 작성하고, 해당하는 항목은 체크해 주세요.</p>
    <div class="card" id="form-card"></div>
    <div class="footer-bar">
      <button class="btn btn-gray" id="btn-back">← 뒤로</button>
      <button class="btn btn-primary grow2" id="btn-next">
        ${state.currentIndex + 1 < total ? "다음 서류 →" : "다음 : 동의 →"}
      </button>
    </div>
  `;

  const card = document.getElementById("form-card");
  const sigRefs = {};      // { key: signatureFieldElement }
  const prev = state.answers[formId] || {};
  annotBlocks = [];        // 이 화면의 강조 필기 블록 목록 초기화

  form.fields.forEach((f, fi) => {
    if (f.type === "section" || f.type === "note") {
      const el = document.createElement("div");
      el.className = f.type === "section" ? "section-head" : "note-text";
      el.innerHTML = runsToHtml(fieldRuns(f), f);
      applyFieldTextStyle(el, f);
      card.appendChild(el);
      return;
    }

    const field = document.createElement("div");
    field.className = "field";
    const req = f.required ? '<span class="req">*</span>' : "";
    const labelHtml = `<label class="field-label">${runsToHtml(fieldRuns(f), f)}${req}</label>`;

    if (f.type === "write" || f.type === "writeBig" || f.type === "signature" || f.type === "number") {
      field.innerHTML = labelHtml;
      const sz = formSizing(form.scale);
      const h = f.type === "writeBig" ? sz.bigH : (f.type === "signature" ? sz.signH : sz.writeH);
      // 숫자 입력칸(핸드폰·주민번호·키/체중)은 숫자패드 + 자동 구분자 표시
      let numFormat = null;
      if (f.type === "number") {
        // 편집기에서 지정한 표시형식(마스크). 없으면 구분자 없는 순수 숫자.
        numFormat = f.format || "num";
      } else if (f.type === "write") {
        if (f.key === "phone" || /phone$/i.test(f.key) || /^핸드폰|^전화|연락처/.test((f.label || "").trim())) numFormat = "phone";
        else if (f.key === "birth" || /주민|생년월일/.test(f.label || "")) numFormat = "id";
        else if (/\(\s*cm\s*\)|\(\s*kg\s*\)/i.test(f.label || "")) numFormat = "decimal"; // 키·체중 등
        else if (f.key === "pregnantWeek" || /주\s*수/.test(f.label || "")) numFormat = "week"; // 임신 주수
      }
      const w = createWritingField({
        height: h,
        hint: f.type === "signature" ? "여기에 서명해 주세요"
            : f.type === "number" ? (f.hint || "")
            : (f.hint || "여기에 손으로 써주세요"),
        dashed: f.type === "signature",
        initial: prev[f.key] || null,
        initialText: prev["__t_" + f.key] || "",
        allowType: f.type !== "signature",
        format: numFormat,
      });
      field.appendChild(w);
      sigRefs[f.key] = w;
    } else if (f.type === "radio") {
      field.innerHTML = `${labelHtml}<div class="choice-group">${
        f.options.map((o) => `
          <label class="choice ${prev[f.key] === o ? "selected" : ""}">
            <input type="radio" name="r-${f.key}" value="${escAttr(o)}" ${prev[f.key] === o ? "checked" : ""}/> ${o}
          </label>`).join("")
      }</div>`;
      field.dataset.radio = f.key;
    } else if (f.type === "checkbox") {
      const arr = prev[f.key] || [];
      field.innerHTML = `${labelHtml}<div class="choice-group">${
        f.options.map((o) => `
          <label class="choice ${arr.includes(o) ? "selected" : ""}">
            <input type="checkbox" value="${escAttr(o)}" ${arr.includes(o) ? "checked" : ""}/> ${o}
          </label>`).join("")
      }</div>`;
      field.dataset.checkbox = f.key;
    } else if (f.type === "address") {
      const pv = prev[f.key] || {};
      field.innerHTML = `${labelHtml}
        <div class="addr-row">
          <input type="text" class="box-input addr-road" placeholder="도로명 주소 검색 결과" value="${escAttr(pv.road || "")}" readonly />
          <button type="button" class="btn btn-gray addr-search">주소 검색</button>
        </div>
        <input type="text" class="box-input addr-detail" placeholder="상세 주소 (동/호수 등)" value="${escAttr(pv.detail || "")}" style="margin-top:8px;" />`;
      field.dataset.address = f.key;
      const roadInput = field.querySelector(".addr-road");
      const detailInput = field.querySelector(".addr-detail");
      field.querySelector(".addr-search").addEventListener("click", () => openPostcode(roadInput, detailInput));
    }

    const _lbl = field.querySelector(".field-label");
    if (_lbl) applyFieldTextStyle(_lbl, f);

    card.appendChild(field);
  });

  // 선택 항목 클릭 시 강조 처리
  card.querySelectorAll(".choice").forEach((ch) => {
    const input = ch.querySelector("input");
    input.addEventListener("change", () => {
      if (input.type === "radio") {
        ch.parentElement.querySelectorAll(".choice").forEach((c) => c.classList.remove("selected"));
        ch.classList.add("selected");
      } else {
        ch.classList.toggle("selected", input.checked);
      }
    });
  });

  // "전체 동의" 버튼 : 서류 안의 "동의함" 선택지만 한 번에 선택
  //  - "동의함" 선택 항목이 여러 개일 때 맨 위에서 한 번에 처리할 수 있습니다.
  const agreeInputs = () => [...card.querySelectorAll('[data-radio] input[type="radio"]')].filter((b) => b.value === "동의함");
  if (agreeInputs().length >= 2) {
    const bar = document.createElement("div");
    bar.className = "agree-all-bar";
    bar.innerHTML = `<button type="button" class="choice agree-all">전체 동의</button>`;
    // 맨 위 설명 문구(note) 바로 아래에 배치 (필기 오버레이 블록 바깥에)
    const firstNote = card.querySelector(".note-text");
    if (firstNote) (firstNote.closest(".annot-wrap") || firstNote).after(bar);
    else card.insertBefore(bar, card.firstChild);
    const btn = bar.querySelector(".agree-all");
    const sync = () => {
      const boxes = agreeInputs();
      const all = boxes.length && boxes.every((b) => b.checked);
      btn.textContent = all ? "전체 동의 해제" : "전체 동의";
      btn.classList.toggle("selected", all);
    };
    btn.addEventListener("click", () => {
      const boxes = agreeInputs();
      const turnOn = !boxes.every((b) => b.checked);
      boxes.forEach((b) => {
        const grp = b.closest("[data-radio]");
        if (turnOn) {
          b.checked = true;
          grp.querySelectorAll(".choice").forEach((c) => c.classList.remove("selected"));
          b.closest(".choice").classList.add("selected");
        } else {
          b.checked = false;
          b.closest(".choice").classList.remove("selected");
        }
      });
      sync();
    });
    // 동의 항목의 선택이 바뀌면 버튼 문구를 갱신
    agreeInputs().forEach((b) => {
      b.closest("[data-radio]").querySelectorAll('input[type="radio"]').forEach((r) => r.addEventListener("change", sync));
    });
    sync();
  }

  // 텍스트 설명이 있는 서류는 화면 전체를 하나의 강조 필기 판으로 덮는다.
  if (form.fields.some((f) => f.type === "section" || f.type === "note")) setupAnnotOverlay(card);

  // 전체 입력방식 메뉴 (우측 상단 고정) — 손글씨/키보드/강조 표시 전환
  setupInputModeMenu(form, sigRefs);

  document.getElementById("btn-back").addEventListener("click", () => {
    // 현재 입력 저장 후 이동
    saveFormValues(form, card, sigRefs);
    saveDraft();
    if (state.currentIndex > 0) { state.currentIndex--; screenFill(); }
    else screenPatientName();
  });

  document.getElementById("btn-next").addEventListener("click", () => {
    const values = readFormValues(form, card, sigRefs);
    // 필수 항목 확인
    for (const f of form.fields) {
      if (!f.required) continue;
      const v = values[f.key];
      const isHand = (f.type === "write" || f.type === "writeBig" || f.type === "signature");
      const empty = isHand ? !v : (!v || (Array.isArray(v) && !v.length));
      if (empty) {
        return alert(`'${f.label}' 항목은 필수입니다.`);
      }
    }
    state.answers[formId] = values;
    saveDraft();
    if (state.currentIndex + 1 < state.selectedFormIds.length) {
      state.currentIndex++;
      screenFill();
    } else {
      screenConsent();
    }
  });

  // 이 화면을 벗어날 때(백그라운드 전환 등) 현재 입력을 저장할 수 있도록 등록
  saveInProgressForm = () => saveFormValues(form, card, sigRefs);
  saveDraft();

  // 다음 서류로 넘어갈 때 항상 맨 위부터 보이도록 (렌더 후 실행해야 확실함)
  scrollTop();
}

// 화면을 맨 위로 (모바일 브라우저 호환)
function scrollTop() {
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  });
}

// 서류 화면(작성 카드) 전체를 하나의 강조 필기 판으로 덮는다.
//  - 상단 "강조 표시" 버튼으로 켜면 카드 어디에나 손으로 그을 수 있다(경계 없음).
//  - 강조는 화면 표시 전용이며 PDF/이미지 출력에는 포함되지 않는다.
function setupAnnotOverlay(card) {
  card.classList.add("annot-host");
  const cv = document.createElement("canvas");
  cv.className = "annot-overlay";
  card.appendChild(cv);
  const ctx = cv.getContext("2d");
  let active = false, drawing = false, last = null;

  const size = () => {
    const dpr = window.devicePixelRatio || 1;
    const w = card.clientWidth, h = card.scrollHeight;
    if (!w || !h) return;
    const prev = (cv.width && cv.height) ? ctx.getImageData(0, 0, cv.width, cv.height) : null;
    cv.width = w * dpr; cv.height = h * dpr;
    cv.style.width = w + "px"; cv.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = "#e0403a"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (prev) { try { ctx.putImageData(prev, 0, 0); } catch (_) {} }
  };
  requestAnimationFrame(size);
  if (window.ResizeObserver) { const ro = new ResizeObserver(size); ro.observe(card); }

  const pt = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener("pointerdown", (e) => {
    if (!active) return;
    drawing = true; last = pt(e);
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  });
  cv.addEventListener("pointermove", (e) => {
    if (!active || !drawing) return;
    const p = pt(e);
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last = p; e.preventDefault();
  });
  const end = () => { drawing = false; };
  cv.addEventListener("pointerup", end);
  cv.addEventListener("pointercancel", end);

  annotBlocks.push({
    setActive: (v) => {
      active = v;
      card.classList.toggle("annot-on", v);
      cv.style.pointerEvents = v ? "auto" : "none";
      cv.style.touchAction = v ? "none" : "auto";
    },
    clear: () => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.restore();
    },
  });
}

// 화면에서 입력값 읽기
function readFormValues(form, card, sigRefs) {
  const out = {};
  form.fields.forEach((f) => {
    if (f.type === "section") return;
    if (f.type === "write" || f.type === "writeBig" || f.type === "signature" || f.type === "number") {
      const w = sigRefs[f.key];
      out[f.key] = w ? w.toDataURL() : null;
      // 키보드로 입력한 글자는 따로 보관 (파일명 자동 생성용). 손글씨면 빈 값.
      if (w && w.getText) { const tx = w.getText(); if (tx) out["__t_" + f.key] = tx; }
      return;
    }
    if (f.type === "radio") {
      const c = card.querySelector(`input[name="r-${f.key}"]:checked`);
      out[f.key] = c ? c.value : "";
      return;
    }
    if (f.type === "checkbox") {
      const wrap = [...card.querySelectorAll(`[data-checkbox="${f.key}"] input:checked`)];
      out[f.key] = wrap.map((i) => i.value);
      return;
    }
    if (f.type === "address") {
      const wrap = card.querySelector(`[data-address="${f.key}"]`);
      const road = wrap ? wrap.querySelector(".addr-road").value.trim() : "";
      const detail = wrap ? wrap.querySelector(".addr-detail").value.trim() : "";
      out[f.key] = { road, detail };
      return;
    }
  });
  return out;
}

// 도로명 주소 검색창(카카오/다음 우편번호)을 열고, 선택 결과를 입력칸에 채운다.
function openPostcode(roadInput, detailInput) {
  if (!(window.daum && window.daum.Postcode)) {
    return alert("주소 검색을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  new daum.Postcode({
    oncomplete: (data) => {
      const road = data.roadAddress || data.jibunAddress || "";
      roadInput.value = (data.zonecode ? "[" + data.zonecode + "] " : "") + road;
      if (detailInput) detailInput.focus();
    },
  }).open();
}
// 뒤로 갈 때 입력 보존용 (검증 없이 저장)
function saveFormValues(form, card, sigRefs) {
  state.answers[form.id] = readFormValues(form, card, sigRefs);
}

// 우측 상단에 고정되어 따라오는 "입력 방식" 메뉴 (손글씨 ↔ 키보드 전체 전환)
function setupInputModeMenu(form, sigRefs) {
  const typeable = form.fields
    .filter((f) => (f.type === "write" || f.type === "writeBig") && sigRefs[f.key] && sigRefs[f.key].allowType && !sigRefs[f.key].typeOnly)
    .map((f) => ({ key: f.key, w: sigRefs[f.key] }));
  const hasAnnot = annotBlocks.length > 0;
  if (!typeable.length && !hasAnnot) return;

  // 처음 화면을 그릴 때 선택된 방식 적용. 단, 이미 입력된 칸은 건드리지 않는다.
  const prev = state.answers[form.id] || {};
  typeable.forEach(({ key, w }) => { if (!prev[key]) w.setMode(preferredInputMode); });

  const menu = document.createElement("div");
  menu.className = "input-mode-menu";
  const modeHtml = typeable.length ? `
    <button type="button" class="imm-btn imm-hand" data-m="hand">✍ 손글씨</button>
    <button type="button" class="imm-btn imm-type" data-m="type">⌨ 키보드</button>` : "";
  const annotHtml = hasAnnot ? `
    <button type="button" class="imm-btn imm-annot" id="annot-global">✏️ 강조 표시</button>
    <button type="button" class="imm-btn imm-annot-clear" id="annot-clear-all" style="display:none;">지우기</button>` : "";
  menu.innerHTML = modeHtml + annotHtml;

  if (typeable.length) {
    const refresh = () => {
      menu.querySelector(".imm-hand").classList.toggle("on", preferredInputMode === "hand");
      menu.querySelector(".imm-type").classList.toggle("on", preferredInputMode === "type");
    };
    menu.querySelectorAll(".imm-hand, .imm-type").forEach((b) => {
      b.addEventListener("click", () => {
        preferredInputMode = b.dataset.m;
        // 전환해도 각 방식에 입력한 내용은 그대로 보존된다.
        typeable.forEach(({ w }) => w.setMode(preferredInputMode));
        refresh();
      });
    });
    refresh();
  }

  if (hasAnnot) {
    let on = false;
    const tg = menu.querySelector("#annot-global");
    const cl = menu.querySelector("#annot-clear-all");
    tg.addEventListener("click", () => {
      on = !on;
      annotBlocks.forEach((b) => b.setActive(on));
      tg.textContent = on ? "✓ 강조 완료" : "✏️ 강조 표시";
      tg.classList.toggle("on", on);
      cl.style.display = on ? "" : "none";
    });
    cl.addEventListener("click", () => {
      if (confirm("이 서류의 강조 표시를 모두 지울까요?")) annotBlocks.forEach((b) => b.clear());
    });
  }

  app.appendChild(menu);
}

// -------------------------------------------------------------
//  4) 전자문서 클라우드 보관 동의
// -------------------------------------------------------------
function screenConsent() {
  saveInProgressForm = null;
  setStep("3 / 3  ·  동의");
  app.innerHTML = `
    <h2 class="screen-title">전자문서 클라우드 보관 동의</h2>
    <p class="screen-desc">아래 내용을 확인하고 동의 후 서명해 주세요.</p>
    <div class="card">
      <div class="consent-box">
        <h3>[전자문서 클라우드 보관 동의]</h3>
        <div>${consentBodyHTML()}</div>
      </div>
      <label class="consent-agree">
        <input type="checkbox" id="agree" /> 위 내용에 모두 동의합니다.
      </label>
      <div class="field" style="margin-top:20px;">
        <label class="field-label">동의 서명<span class="req">*</span></label>
        <div id="consent-sign"></div>
      </div>
    </div>
    <div class="footer-bar">
      <button class="btn btn-gray" id="btn-back">← 뒤로</button>
      <button class="btn btn-primary grow2" id="btn-submit">제출하기
    </div>
  `;

  const sig = createSignatureField("여기에 서명해 주세요", state.consentSignImg);
  document.getElementById("consent-sign").appendChild(sig);
  if (state.consentAgreed) document.getElementById("agree").checked = true;

  document.getElementById("btn-back").addEventListener("click", () => {
    state.currentIndex = state.selectedFormIds.length - 1;
    screenFill();
  });

  document.getElementById("btn-submit").addEventListener("click", async () => {
    if (!document.getElementById("agree").checked) return alert("동의 체크가 필요합니다.");
    if (sig.isEmpty()) return alert("동의 서명을 해주세요.");
    state.consentAgreed = true;
    state.consentSignImg = sig.toDataURL();
    await generateAllPdfs();
  });

  scrollTop();
}

// -------------------------------------------------------------
//  PDF 생성 (선택한 서류마다 1개씩)
// -------------------------------------------------------------
// 환자가 작성한 내용에서 성명을 자동으로 가져온다.
//  - 키보드로 입력한 성명 → 그 글자
//  - 손글씨로만 작성 → "무기명"
//  - 성명 항목이 없거나 미작성 → "" (직원이 입력)
function derivePatientName() {
  const isNameField = (x) =>
    (x.type === "write" || x.type === "writeBig") &&
    (x.key === "name" ||
      (/^(성\s*명|이\s*름|환자\s*명|환자\s*성명)$/.test((x.label || "").trim()) &&
        !/대리인|보호자/.test(x.label || "")));
  // 1순위: 키보드로 입력한 성명 텍스트
  for (const formId of state.selectedFormIds) {
    const form = FORMS[formId];
    if (!form) continue;
    const vals = state.answers[formId] || {};
    for (const f of form.fields) {
      if (!isNameField(f)) continue;
      const tx = vals["__t_" + f.key];
      if (tx && tx.trim()) return tx.trim();
    }
  }
  // 2순위: 손글씨로 작성된 성명 → 무기명
  for (const formId of state.selectedFormIds) {
    const form = FORMS[formId];
    if (!form) continue;
    const vals = state.answers[formId] || {};
    for (const f of form.fields) {
      if (isNameField(f) && vals[f.key]) return "무기명";
    }
  }
  return "";
}

// 선택한 서류로 PDF(필요시 JPG)를 만들어 state.files 를 채운다.
//  - 환자명은 작성 내용에서 자동으로 가져온다(직원이 입력했으면 그 값 우선).
//  - state.chartNo / groupName 을 머리말에 사용.
//  - 직원이 이름·차트번호를 입력한 뒤 다시 호출하면 그 정보로 새로 만든다.
async function buildFiles() {
  if (!state.patientName) state.patientName = derivePatientName();
  state.files = [];
  const meta = {
    patientName: state.patientName,
    chartNo: state.chartNo,
    groupName: state.groupName,
    consentAgreed: state.consentAgreed,
    consentSignImg: state.consentSignImg,
  };
  // 당일 작성한 모든 서류를 하나의 PDF 로 (서류마다 새 페이지 + 동의 페이지)
  const items = state.selectedFormIds
    .map((formId) => ({ form: FORMS[formId], values: state.answers[formId] || {} }))
    .filter((it) => it.form);
  const res = await generateCombinedPdf(items, meta);
  state.files.push({
    formName: `전체 서류 (${items.length}개)`,
    fileName: res.fileName, blob: res.blob,
    url: res.url, bytes: res.bytes, mimeType: "application/pdf", kind: "pdf",
  });
  // "JPG로도 저장" 으로 지정된 서류는, 합본 PDF에서 그 서류가 있는 페이지만 JPG 로 저장
  const jpgForms = (res.formPages || []).filter((fp) => fp.form.saveJpg);
  if (jpgForms.length) {
    const pageOwners = [];   // 각 JPG 페이지가 어느 서류인지
    jpgForms.forEach((fp) => { for (let p = fp.start; p <= fp.end; p++) pageOwners.push({ page: p, form: fp.form }); });
    const jpgs = await pdfBytesToJpegs(res.bytes, res.fileName, pageOwners.map((x) => x.page));
    jpgs.forEach((j, idx) => {
      const owner = pageOwners[idx];
      state.files.push({
        formName: owner ? owner.form.name : "서류",
        fileName: j.fileName, blob: j.blob, url: j.url,
        mimeType: "image/jpeg", kind: "jpg",
      });
    });
  }
  state.uploadStatus = state.files.map(() => ({ status: "pending" }));
}

async function generateAllPdfs() {
  showLoading("파일을 만들고 있습니다…");
  try {
    await buildFiles();
    clearDraft();
    screenDone();
  } catch (e) {
    console.error(e);
    alert("파일 생성 중 문제가 발생했습니다: " + e.message);
  } finally {
    hideLoading();
  }
}

// -------------------------------------------------------------
//  5) 완료 화면 : 구글드라이브 자동 저장 · 작성한 서류 확인 · 처음으로
// -------------------------------------------------------------
function screenDone() {
  setStep("완료");
  let uploading = cloudConfigured();   // 저장 중이면 "처리중..." 표시

  const render = () => {
    const pdf = state.files.find((f) => f.kind === "pdf");
    app.innerHTML = `
      <div style="text-align:center;">
        ${uploading
          ? `<div class="spinner" style="margin:28px auto 0;"></div>`
          : `<div class="done-icon">✓</div>`}
        <h2 class="screen-title" style="margin-top:16px;">${uploading ? "처리중..." : "작성이 완료되었습니다"}</h2>
        ${uploading ? "" : `<p class="screen-desc" style="font-size:18px; margin-top:10px; line-height:1.6;">${escHtml(state.patientName || "")}님, 감사합니다.<br>직원에게 전달해 주세요.</p>`}
      </div>
      ${uploading ? "" : `
      <div style="display:flex; flex-direction:column; gap:12px; max-width:420px; margin:24px auto 0;">
        ${pdf ? `<button class="btn btn-ghost btn-block" id="btn-view-pdf" style="min-height:58px; font-size:17px;">작성한 서류 확인하기</button>` : ""}
        <button class="btn btn-ghost btn-block" id="btn-edit" style="min-height:58px; font-size:17px;">내용 수정하기</button>
        <button class="btn btn-primary btn-block" id="btn-home" style="min-height:58px; font-size:17px;">처음으로</button>
      </div>`}
    `;
    if (!uploading) {
      if (pdf) document.getElementById("btn-view-pdf").addEventListener("click", () => window.open(pdf.url, "_blank"));
      document.getElementById("btn-edit").addEventListener("click", () => {
        state.currentIndex = 0;
        saveDraft();
        screenFill();
      });
      document.getElementById("btn-home").addEventListener("click", screenStart);
    }
    scrollTop();
  };

  render();
  // 구글드라이브 자동 저장 → 끝나면 완료 화면으로 전환
  if (cloudConfigured()) {
    runCloudUpload().then(() => { uploading = false; render(); });
  }
}

// 직원 비밀번호 확인 후 콜백 실행 (비번이 없으면 바로 실행)
//  - 관리자 메뉴처럼 숫자 키패드 화면으로 입력받습니다.
//  - onCancel: 취소(나가기) 시 돌아갈 화면 함수 (기본: 첫 화면)
function requireStaff(onOk, onCancel) {
  const set = getStaffPassword();
  if (!set) return onOk();   // 비밀번호 없음(잠금 해제)
  if (/\D/.test(set)) {       // 숫자가 아닌 비번은 입력창으로 처리
    const pw = prompt("직원 비밀번호를 입력하세요.");
    if (pw === null) return (onCancel || screenStart)();
    if (pw === set) onOk();
    else alert("비밀번호가 올바르지 않습니다.");
    return;
  }
  screenStaffLogin(set, onOk, onCancel || screenStart);
}

// 직원 비밀번호 키패드 화면
let _staffPin = "";
function screenStaffLogin(expected, onOk, onCancel) {
  _staffPin = "";
  setStep("직원 인증");
  app.innerHTML = `
    <h2 class="screen-title">직원 인증</h2>
    <p class="screen-desc">직원 비밀번호를 입력하세요.</p>
    <div class="card" style="max-width:360px; margin:0 auto;">
      <div class="pin-dots" id="staff-pin-dots"></div>
      <div class="keypad" id="staff-keypad"></div>
    </div>
    <div class="footer-bar">
      <button class="btn btn-gray btn-block" id="btn-staff-cancel">← 나가기</button>
    </div>
  `;
  const keys = ["1","2","3","4","5","6","7","8","9","지움","0","←"];
  const kp = document.getElementById("staff-keypad");
  keys.forEach((k) => {
    const b = document.createElement("button");
    b.className = "key" + (k === "지움" || k === "←" ? " key-fn" : "");
    b.textContent = k;
    b.addEventListener("click", () => onStaffPinKey(k, expected, onOk));
    kp.appendChild(b);
  });
  document.getElementById("btn-staff-cancel").addEventListener("click", onCancel);
  renderStaffPinDots(expected.length);
}
function renderStaffPinDots(n) {
  const d = document.getElementById("staff-pin-dots");
  if (!d) return;
  d.innerHTML = Array.from({ length: n }, (_, i) => `<span class="dot ${i < _staffPin.length ? "on" : ""}"></span>`).join("");
}
function onStaffPinKey(k, expected, onOk) {
  if (k === "지움") _staffPin = "";
  else if (k === "←") _staffPin = _staffPin.slice(0, -1);
  else if (_staffPin.length < expected.length) _staffPin += k;
  renderStaffPinDots(expected.length);
  if (_staffPin.length === expected.length) {
    if (_staffPin === expected) onOk();
    else setTimeout(() => { alert("비밀번호가 올바르지 않습니다."); _staffPin = ""; renderStaffPinDots(expected.length); }, 120);
  }
}

// -------------------------------------------------------------
//  직원 메뉴 : 저장된 서류 보기 · 기본 서류 출력하기
// -------------------------------------------------------------
function screenStaffMenu() {
  setStep("직원 메뉴");
  app.innerHTML = `
    <h2 class="screen-title">직원 메뉴</h2>
    <p class="screen-desc">직원용 기능입니다.</p>
    <div style="display:flex; flex-direction:column; gap:14px; margin-top:8px;">
      <button class="btn btn-ghost btn-block" id="sm-search" style="min-height:64px; font-size:18px;">📁 저장된 서류 보기</button>
      <button class="btn btn-ghost btn-block" id="sm-forms" style="min-height:64px; font-size:18px;">📋 서류 관리</button>
      <button class="btn btn-ghost btn-block" id="sm-groups" style="min-height:64px; font-size:18px;">🗂 환자군별 서류 선택</button>
    </div>
    <div class="footer-bar">
      <button class="btn btn-primary btn-block" id="btn-back">← 처음으로</button>
    </div>
  `;
  document.getElementById("sm-search").addEventListener("click", screenSearch);
  document.getElementById("sm-forms").addEventListener("click", screenFormManage);
  document.getElementById("sm-groups").addEventListener("click", screenGroupForms);
  document.getElementById("btn-back").addEventListener("click", screenStart);
}

// PDF를 숨겨진 프레임에서 인쇄 (실패하면 새 탭으로 열어 인쇄)
function printPdfBlob(blob) {
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed; right:0; bottom:0; width:1px; height:1px; border:0; opacity:0;";
  iframe.onload = () => {
    setTimeout(() => {
      try { iframe.contentWindow.focus(); iframe.contentWindow.print(); }
      catch (e) { window.open(url, "_blank"); }
    }, 300);
  };
  iframe.src = url;
  document.body.appendChild(iframe);
}

// -------------------------------------------------------------
//  구글드라이브 업로드 (완료 화면)
// -------------------------------------------------------------
function cloudMeta() {
  return { patientName: state.patientName, chartNo: state.chartNo, groupName: state.groupName };
}

function renderCloud() {
  const box = document.getElementById("cloud-box");
  if (!box) return;

  if (!cloudConfigured()) {
    box.className = "info-note";
    box.innerHTML = `📌 구글드라이브 <b>자동 저장이 아직 설정되지 않았습니다.</b> 관리자 메뉴(⚙)의 <b>구글드라이브 연동</b>에서 설정하거나, 아래 <b>전체 다운로드</b>로 저장하세요.`;
    return;
  }

  box.className = "card";
  const allDone = state.uploadStatus.every((s) => s.status === "done");
  const anyErr = state.uploadStatus.some((s) => s.status === "error");

  const rows = state.files.map((r, i) => {
    const s = state.uploadStatus[i] || {};
    let right;
    if (s.status === "uploading") right = `<span style="color:var(--text-soft);">⏳ 저장 중…</span>`;
    else if (s.status === "done") right = `<span style="color:var(--ok);font-weight:700;">✓ 저장됨</span>` +
      (s.link ? ` <a href="${s.link}" target="_blank" class="btn btn-gray" style="padding:5px 12px;min-height:34px;font-size:14px;">드라이브에서 열기</a>` : "");
    else if (s.status === "error") right = `<span style="color:var(--danger);font-weight:700;">✗ 실패</span> <span style="font-size:13px;color:var(--text-soft);">${escHtml(s.error || "")}</span>`;
    else right = `<span style="color:var(--text-soft);">대기 중…</span>`;
    return `<div class="review-row"><div class="rk">${escHtml(r.formName)}</div><div class="rv" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">${right}</div></div>`;
  }).join("");

  const header = allDone
    ? `<div style="font-weight:700;color:var(--ok);margin-bottom:8px;">✓ 구글드라이브 저장 완료</div>`
    : `<div style="font-weight:700;margin-bottom:8px;">구글드라이브 저장</div>`;
  const retry = anyErr ? `<div style="margin-top:12px;"><button class="btn btn-ghost btn-block" id="btn-retry-upload">실패한 항목 다시 저장</button></div>` : "";

  box.innerHTML = header + rows + retry;
  const rb = document.getElementById("btn-retry-upload");
  if (rb) rb.addEventListener("click", runCloudUpload);
}

let _uploading = false;
async function runCloudUpload() {
  if (_uploading) return;
  _uploading = true;
  const results = state.files;
  const status = state.uploadStatus;
  const meta = cloudMeta();
  try {
    for (let i = 0; i < results.length; i++) {
      if (status[i].status === "done") continue;
      status[i].status = "uploading";
      renderCloud();
      try {
        const r = await cloudUploadOne(results[i], meta);
        status[i] = { status: "done", link: r.link };
      } catch (e) {
        status[i] = { status: "error", error: e.message };
      }
      renderCloud();
    }
  } finally {
    _uploading = false;
  }
}

// -------------------------------------------------------------
//  저장된 서류 다시 보기 (검색)
// -------------------------------------------------------------
function screenSearch() {
  setStep("저장된 서류 다시 보기");
  app.innerHTML = `
    <h2 class="screen-title">저장된 서류 다시 보기</h2>
    <p class="screen-desc">환자명 또는 작성일로 검색해 이전에 저장한 서류를 다시 볼 수 있습니다.</p>
    <div class="card">
      <label class="field-label">검색어 (환자명, 작성일 ex. 260909)</label>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <input id="q" class="box-input" style="flex:1; min-width:180px;" placeholder="예) 홍길동 또는 260909" autocomplete="off" />
        <button class="btn btn-primary" id="btn-do-search">검색</button>
      </div>
      <p style="font-size:13px; color:var(--text-soft); margin:10px 0 0;">비워두고 검색하면 최근 저장한 서류가 나옵니다.</p>
    </div>
    <div id="search-results"></div>
    <div class="footer-bar">
      <button class="btn btn-primary btn-block" id="btn-back">← 직원 메뉴</button>
    </div>
  `;
  document.getElementById("btn-back").addEventListener("click", screenStaffMenu);

  if (!cloudConfigured()) {
    document.getElementById("search-results").innerHTML =
      `<div class="info-note">📌 구글드라이브 연동이 설정되지 않아 검색할 수 없습니다. 관리자 메뉴(⚙)에서 먼저 연동하세요.</div>`;
    document.getElementById("btn-do-search").disabled = true;
    return;
  }

  const run = async () => {
    const q = document.getElementById("q").value.trim();
    const box = document.getElementById("search-results");
    box.innerHTML = `<div class="card" style="color:var(--text-soft);">검색 중…</div>`;
    try {
      let items = await cloudSearch(q);
      // 검색어가 없으면(최근 목록) 오늘 포함 최근 3일 이내 작성분만 보여준다.
      if (!q) items = filterRecentDays(items, 3);
      renderSearchResults(items);
    } catch (e) {
      box.innerHTML = `<div class="card" style="color:var(--danger);">검색 실패 — ${escHtml(e.message)}</div>`;
    }
  };
  document.getElementById("btn-do-search").addEventListener("click", run);
  document.getElementById("q").addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
  run(); // 처음엔 최근 목록
}

// 파일명 앞 8자리(YYYYMMDD)로 작성 날짜를 구한다. 없으면 null.
function fileDateFromName(name) {
  const m = /^(\d{4})(\d{2})(\d{2})_/.exec(String(name || ""));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

// 최근 목록: 오늘 포함 최근 days일(예: 3 → 오늘·어제·그제) 이내 작성분만 남긴다.
function filterRecentDays(items, days) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  return items.filter((it) => {
    const d = fileDateFromName(it.fileName);
    return d && d >= start;
  });
}

function renderSearchResults(items) {
  const box = document.getElementById("search-results");
  if (!items.length) {
    box.innerHTML = `<div class="card" style="color:var(--text-soft);">결과가 없습니다.</div>`;
    return;
  }
  box.className = "";
  box.innerHTML = `<div class="card"><div style="font-weight:700; margin-bottom:10px;">검색 결과 ${items.length}건</div><div id="sr-list"></div></div>`;
  const list = box.querySelector("#sr-list");

  const isJpg = (n) => /\.jpe?g$/i.test(String(n || ""));
  const baseOf = (n) => String(n || "").replace(/\.[^.]+$/, "");   // 확장자 제거
  const jpgItems = items.filter((it) => isJpg(it.fileName));
  const usedJpg = new Set();

  const downloadItem = async (it) => {
    showLoading("파일을 불러오는 중…");
    try {
      const file = await cloudGetFile(it.fileId);
      hideLoading();
      downloadPdf(file.blob, file.fileName);
    } catch (e) {
      hideLoading();
      alert("다운로드하지 못했습니다: " + e.message);
    }
  };

  const renderRow = (it, relatedJpgs) => {
    const row = document.createElement("div");
    row.className = "review-row";
    const jpgLinks = (relatedJpgs || []).map((j, k) =>
      `<div class="sr-jpg" data-k="${k}" style="font-size:12px; color:#2f6f9f; margin-top:4px; cursor:pointer; word-break:break-all;">📷 ${escHtml(j.fileName)}</div>`
    ).join("");
    row.innerHTML = `
      <div class="rk" style="min-width:0;">
        <div style="font-weight:600;">${escHtml(it.patientName)} <span style="color:var(--text-soft);font-weight:400;">(${escHtml(it.chartNo)})</span></div>
        <div style="font-size:13px; color:var(--text-soft); margin-top:3px;">${escHtml(it.formName)}</div>
        <div style="font-size:12px; color:#8698a3; margin-top:2px; word-break:break-all;">${escHtml(it.fileName)}</div>
        ${jpgLinks}
      </div>
      <div class="rv" style="display:flex; gap:8px; align-items:center;">
        <button class="btn btn-gray sr-view" style="padding:6px 14px; min-height:38px; font-size:15px;">보기</button>
        <button class="btn btn-gray sr-dl" style="padding:6px 14px; min-height:38px; font-size:15px;">다운로드</button>
        <button class="btn btn-gray sr-del" style="padding:6px 14px; min-height:38px; font-size:15px; color:var(--danger);">삭제</button>
      </div>`;
    row.querySelector(".sr-view").addEventListener("click", () => screenViewFile(it));
    row.querySelector(".sr-dl").addEventListener("click", () => downloadItem(it));
    row.querySelectorAll(".sr-jpg").forEach((el) => {
      el.addEventListener("click", () => downloadItem(relatedJpgs[+el.dataset.k]));
    });
    row.querySelector(".sr-del").addEventListener("click", async () => {
      if (!confirm(`'${it.patientName}' 님의 서류(${it.formName})를 정말 삭제할까요?\n삭제하면 되돌릴 수 없습니다.`)) return;
      showLoading("삭제하는 중…");
      try {
        await cloudDeleteFile(it.fileId);
      } catch (e) {
        hideLoading();
        return alert("삭제하지 못했습니다: " + e.message);
      }
      hideLoading();
      row.remove();
      const remaining = list.querySelectorAll(".review-row").length;
      const head = box.querySelector(".card > div");
      if (head) head.textContent = `검색 결과 ${remaining}건`;
      if (remaining === 0) box.innerHTML = `<div class="card" style="color:var(--text-soft);">결과가 없습니다.</div>`;
    });
    list.appendChild(row);
  };

  // PDF(합본) 행마다 같은 세션의 JPG 파일들을 묶어서 파일명 링크로 보여준다.
  items.forEach((it) => {
    if (isJpg(it.fileName)) return;
    const base = baseOf(it.fileName);
    const related = jpgItems.filter((j) => {
      if (!j.fileName.startsWith(base)) return false;
      usedJpg.add(j.fileId);
      return true;
    });
    renderRow(it, related);
  });
  // 짝이 되는 PDF가 없는 JPG는 단독 행으로 표시
  jpgItems.forEach((j) => { if (!usedJpg.has(j.fileId)) renderRow(j, []); });
}

// 저장된 파일 1건 열어서 보기 (드라이브에서 받아 화면에 표시)
async function screenViewFile(item) {
  showLoading("파일을 불러오는 중…");
  let file;
  try {
    file = await cloudGetFile(item.fileId);
  } catch (e) {
    hideLoading();
    return alert("파일을 불러오지 못했습니다: " + e.message);
  }
  hideLoading();

  setStep("서류 보기");
  app.innerHTML = `
    <h2 class="screen-title" style="font-size:22px;">${escHtml(item.patientName)} · ${escHtml(item.formName)}</h2>
    <p class="screen-desc">${escHtml(item.fileName)}</p>
    <div class="card">
      <div id="view-box" class="doc-viewer"></div>
    </div>
    <div class="footer-bar">
      <button class="btn btn-gray" id="btn-view-download">다운로드</button>
      <button class="btn btn-primary grow2" id="btn-view-back">← 검색으로</button>
    </div>
  `;
  document.getElementById("btn-view-back").addEventListener("click", screenSearch);
  document.getElementById("btn-view-download").addEventListener("click", () => downloadPdf(file.blob, file.fileName));

  const box = document.getElementById("view-box");
  const isImg = (file.mimeType || "").indexOf("image") === 0 || /\.jpe?g$/i.test(file.fileName);
  if (isImg) {
    const url = URL.createObjectURL(file.blob);
    box.innerHTML = `<img src="${url}" alt="서류" style="width:100%;border-radius:8px;display:block;box-shadow:0 1px 6px rgba(0,0,0,.12);" />`;
  } else {
    box.innerHTML = `<div style="color:var(--text-soft);font-size:14px;">문서를 그리는 중…</div>`;
    try { await renderPdfIntoElement(file.bytes, box); }
    catch (e) { box.innerHTML = `<div style="color:var(--text-soft);font-size:14px;">미리보기를 표시할 수 없습니다. <b>다운로드</b>로 확인하세요.</div>`; }
  }
}

// ---- 작은 도우미 ----
function escHtml(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function escAttr(s) { return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;"); }

// ---- 시작 ----
function init() {
  const draft = loadDraft();
  if (draft) screenResume(draft);
  else screenStart();
  // 백그라운드로 구글드라이브의 최신 편집 내용을 받아온다.
  // 받아왔고 아직 시작 화면에 있으면 다시 그린다 (환자군 버튼 등 갱신).
  syncConfigFromCloud().then((changed) => {
    if (!changed || loadDraft() || !document.getElementById("btn-admin")) return;
    // 사용자가 이미 서류를 선택 중이면 다시 그리지 않는다 (선택이 풀리는 문제 방지)
    if (document.querySelector(".select-item.selected")) return;
    screenStart();
  });
}

// 작성하던 내용이 남아 있으면 "이어서 작성 / 새로 시작"을 먼저 물어본다
function screenResume(draft) {
  resetState();
  saveInProgressForm = null;
  setStep("이어서 작성");
  const forms = draft.selectedFormIds.map((id) => FORMS[id]).filter(Boolean);
  const when = new Date(draft.savedAt || Date.now());
  const pad = (n) => String(n).padStart(2, "0");
  const whenStr = `${when.getFullYear()}.${pad(when.getMonth() + 1)}.${pad(when.getDate())} ${pad(when.getHours())}:${pad(when.getMinutes())}`;
  app.innerHTML = `
    <h2 class="screen-title">작성하던 서류가 있습니다</h2>
    <p class="screen-desc">
      아래 작성 내용이 저장되어 있습니다. <b>이어서 작성</b>하거나, 새 환자를 위해 <b>새로 시작</b>할 수 있습니다.
    </p>
    <div class="card">
      <div class="field"><label class="field-label">환자군</label>
        <div style="font-size:16px;">${escHtml(draft.groupName || "직접 선택")}</div></div>
      <div class="field"><label class="field-label">서류</label>
        <div style="font-size:15px;">${forms.map((f) => escHtml(f.name)).join(" · ")}</div></div>
      <div class="field"><label class="field-label">저장 시각</label>
        <div style="font-size:15px;color:var(--text-soft);">${whenStr}</div></div>
    </div>
    <div class="footer-bar">
      <button class="btn btn-gray" id="btn-fresh">새로 시작</button>
      <button class="btn btn-primary grow2" id="btn-resume">이어서 작성 →</button>
    </div>
  `;
  document.getElementById("btn-fresh").addEventListener("click", () => {
    if (!confirm("저장된 작성 내용을 지우고 새로 시작할까요?")) return;
    clearDraft();
    screenStart();
  });
  document.getElementById("btn-resume").addEventListener("click", () => {
    state.patientName = draft.patientName;
    state.chartNo = draft.chartNo;
    state.groupId = draft.groupId;
    state.groupName = draft.groupName;
    state.selectedFormIds = draft.selectedFormIds.slice();
    state.answers = draft.answers || {};
    state.currentIndex = Math.min(draft.currentIndex || 0, state.selectedFormIds.length - 1);
    screenFill();
  });
}

init();
