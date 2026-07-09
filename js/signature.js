// =============================================================
//  손글씨 / 서명 입력 도우미
//  - 손가락·펜으로 캔버스에 쓰고 이미지(PNG)로 저장합니다.
//  - 서명뿐 아니라 이름·생년월일·주소 등 '손글씨 입력'에도 씁니다.
// =============================================================

// 문자열을 캔버스에 정자체로 그려 PNG dataURL 로 반환 (키보드 입력용)
function renderTextToImage(text, cssW, cssH) {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const c = document.createElement("canvas");
  c.width = Math.round(cssW * ratio);
  c.height = Math.round(cssH * ratio);
  const cx = c.getContext("2d");
  cx.scale(ratio, ratio);
  cx.fillStyle = "#111";
  cx.textBaseline = "top";
  const padX = 12, padY = 8;
  const fontSize = Math.min(24, Math.max(16, Math.floor(cssH / 3)));
  cx.font = `500 ${fontSize}px -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif`;
  const lineH = fontSize * 1.4;
  const maxW = cssW - padX * 2;
  // 줄바꿈: 문단(\n)별로 나눈 뒤 글자 단위로 폭에 맞게 감싼다 (한글 대응)
  const lines = [];
  String(text).split(/\n/).forEach((para) => {
    let line = "";
    for (const ch of para) {
      const test = line + ch;
      if (cx.measureText(test).width > maxW && line) { lines.push(line); line = ch; }
      else line = test;
    }
    lines.push(line);
  });
  let y = padY;
  for (const ln of lines) {
    if (y + lineH > cssH) break;
    cx.fillText(ln, padX, y);
    y += lineH;
  }
  return c.toDataURL("image/png");
}

// 숫자 입력값을 보기 좋게 구분자로 묶는다.
//  phone : 11자리 → 000-0000-0000
//  id    : 6자리 → 000000, 13자리 → 000000-0000000
function formatNumberValue(v, fmt) {
  const d = String(v).replace(/\D/g, "");
  if (fmt === "phone") {
    const s = d.slice(0, 11);
    if (s.length <= 3) return s;
    if (s.length <= 7) return s.slice(0, 3) + "-" + s.slice(3);
    return s.slice(0, 3) + "-" + s.slice(3, 7) + "-" + s.slice(7);
  }
  if (fmt === "id") {
    const s = d.slice(0, 13);
    if (s.length <= 6) return s;
    return s.slice(0, 6) + "-" + s.slice(6);
  }
  if (fmt === "decimal") {                 // 숫자 + 소수점 1개만 허용 (키/체중 등)
    let s = String(v).replace(/[^\d.]/g, "");
    const i = s.indexOf(".");
    if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, "");
    return s;
  }
  if (fmt === "week") {                     // 숫자 뒤에 '주' 표시 (임신 주수)
    const s = d.slice(0, 2);
    return s ? s + "주" : "";
  }
  if (fmt === "num") return d;              // 구분자 없는 순수 숫자
  // 그 외 문자열은 표시형식(마스크)으로 본다. 예) "00kg", "000-0000-0000", "kg", "주"
  if (fmt) return maskFormat(d, fmt);
  return v;
}

// 표시형식(마스크) 적용. 마스크의 '0' 자리에 숫자를 채우고, 그 외 글자는 그대로 표시한다.
//  예) mask "00kg", 입력 "70" → "70kg"   /   mask "000-0000-0000", 입력 "01012345678" → "010-1234-5678"
function maskFormat(digits, mask) {
  const maxDigits = (mask.match(/0/g) || []).length;
  if (maxDigits === 0) {                    // 0 자리 없음 → 숫자 뒤에 문자만 붙임 (예: "70" + "kg" → "70kg")
    const raw = String(digits).replace(/\D/g, "");
    return raw ? raw + mask : "";
  }
  const ds = String(digits).replace(/\D/g, "").slice(0, maxDigits);
  if (!ds) return "";
  let out = "", di = 0;
  for (let i = 0; i < mask.length; i++) {
    const c = mask[i];
    if (c === "0") {
      if (di < ds.length) out += ds[di++];
      else break;                            // 아직 안 채운 숫자 자리 → 멈춤
    } else {
      const moreDigits = di < ds.length;
      const zeroAfter = mask.indexOf("0", i + 1) >= 0;
      if (moreDigits || !zeroAfter) out += c; // 구분자는 뒤에 숫자가 더 있을 때만, 접미사(뒤에 0없음)는 항상
      else break;
    }
  }
  return out;
}

// 손글씨 입력칸을 만들어 반환
//  opts = { height:px, hint:'안내문구', dashed:true|false, initial:dataURL, allowType:true|false, format:'phone'|'id' }
function createWritingField(opts) {
  opts = opts || {};
  let height = opts.height || 90;
  const baseHeight = height;         // 원래 높이 (이보다 작게는 못 줄임)
  const dashed = !!opts.dashed;
  const allowType = !!opts.allowType;

  const wrap = document.createElement("div");
  wrap.className = "write-wrap";
  wrap.innerHTML = `
    <div class="write-box ${dashed ? "dashed" : ""}" style="height:${height}px;">
      <canvas style="height:${height}px;"></canvas>
      <textarea class="write-type" style="display:none;"></textarea>
      <div class="write-hint">${opts.hint || "여기에 손으로 써주세요"}</div>
    </div>
    <div class="write-actions">
      ${allowType ? `<div class="write-size">
        <button type="button" class="btn btn-gray write-smaller" aria-label="칸 줄이기">－ 줄이기</button>
        <button type="button" class="btn btn-gray write-bigger" aria-label="칸 키우기">＋ 칸 키우기</button>
      </div>` : ``}
      <button type="button" class="btn btn-gray write-clear">지우기</button>
    </div>
  `;

  const box = wrap.querySelector(".write-box");
  const canvas = wrap.querySelector("canvas");
  const hint = wrap.querySelector(".write-hint");
  const ta = wrap.querySelector(".write-type");
  let mode = "hand";   // "hand" | "type"

  // 숫자 입력칸(핸드폰·주민번호·키/체중)은 키보드 전용 + 숫자패드
  const numFormat = opts.format || null;   // "phone" | "id" | "decimal" | null
  const typeOnly = !!numFormat;            // 손글씨 없이 키보드로만 입력
  const numHint = opts.hint || "숫자를 입력해 주세요.";   // 숫자칸 빈칸 안내 문구
  if (numFormat) {
    // 숫자 칸은 숫자패드만 뜨게 한다. (소수점이 필요한 decimal 은 소수점 키가 있는 십진 키패드)
    ta.setAttribute("inputmode", numFormat === "decimal" ? "decimal" : "numeric");
    ta.setAttribute("enterkeyhint", "done");
    ta.setAttribute("autocapitalize", "off");
    ta.setAttribute("autocorrect", "off");
    ta.setAttribute("spellcheck", "false");
  } else if (allowType) {
    // 글씨 칸(이름·주소 등)은 기기(아이패드·안드로이드) 기본 일반 키보드가 뜨도록 한다.
    ta.setAttribute("inputmode", "text");
    ta.setAttribute("enterkeyhint", "done");
  }
  if (typeOnly) {
    wrap.typeOnly = true;
    mode = "type";
    canvas.style.display = "none";
    ta.style.display = "block";
    hint.textContent = numHint;
    const sizeEl = wrap.querySelector(".write-size");
    if (sizeEl) sizeEl.style.display = "none";
  }

  // 키보드로 친 글자가 있으면 즉시(동기) 복원한다.
  //  - 렌더 직후 '다음' 검증에서 빈칸으로 오인되는 것을 막고
  //  - 텍스트를 계속 편집할 수 있게 이미지로 굳히지 않는다.
  if (allowType && opts.initialText) {
    ta.value = numFormat ? formatNumberValue(opts.initialText, numFormat) : opts.initialText;
  }

  const pad = new SignaturePad(canvas, {
    penColor: "#111",
    minWidth: 1.1,
    maxWidth: 2.6,
    backgroundColor: "rgba(255,255,255,0)",
  });

  // 고해상도(선명하게) 대응
  function resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    // 기존 그림 보존
    const data = pad.isEmpty() ? null : pad.toData();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    pad.clear();
    if (data) pad.fromData(data);
  }

  pad.addEventListener("beginStroke", () => { hint.style.display = "none"; });

  wrap.querySelector(".write-clear").addEventListener("click", () => {
    if (mode === "type") ta.value = "";
    else pad.clear();
    refreshDisplay();
    if (mode === "type") ta.focus();
  });

  ta.addEventListener("input", () => {
    if (numFormat) {
      const f = formatNumberValue(ta.value, numFormat);
      if (f !== ta.value) {
        ta.value = f;
        // 접미사(단위 등 뒤에 붙는 글자)가 있으면 커서를 숫자 뒤·접미사 앞에 둬야 지우기가 됨
        const pos = f.replace(/\D+$/, "").length;
        if (pos < f.length) { try { ta.setSelectionRange(pos, pos); } catch (e) {} }
      }
    }
    refreshDisplay();
  });

  // 외부(전체 입력방식 메뉴)에서 손글씨 ↔ 키보드 전환.
  //  이미 입력한 내용이 있으면 그 방식으로 계속 "보여주고", 빈 칸만 선택한 방식으로 바꾼다.
  let wantedMode = "hand";                 // 메뉴에서 선택한 방식 (빈 칸에 적용)
  function refreshDisplay() {
    if (!allowType) return;
    if (typeOnly) {                       // 숫자칸: 키보드 전용, 손글씨로 전환 안 함
      mode = "type";
      ta.style.display = "block";
      canvas.style.display = "none";
      hint.textContent = numHint;
      hint.style.display = ta.value ? "none" : "";
      return;
    }
    const hasType = !!ta.value.trim();
    const hasHand = !pad.isEmpty();
    mode = hasType ? "type" : (hasHand ? "hand" : wantedMode);
    const typing = mode === "type";
    ta.style.display = typing ? "block" : "none";
    canvas.style.display = typing ? "none" : "block";
    hint.textContent = typing
      ? "자판 입력이 어려운 경우 우측 상단의 손글씨를 누르고, 직접 써주세요."
      : "키보드 입력을 원하시면 우측 상단의 키보드를 눌러주세요.";
    hint.style.display = (typing ? !ta.value : pad.isEmpty()) ? "" : "none";
  }
  function applyMode(m) {
    if (!allowType) return;               // 서명란 등은 손글씨 고정
    if (typeOnly) return;                 // 숫자칸은 전체 메뉴 영향 안 받음
    wantedMode = m;
    refreshDisplay();
  }
  wrap.setMode = applyMode;
  wrap.getMode = () => mode;
  wrap.allowType = allowType;
  // 키보드로 입력한 글자(있으면). 손글씨만 쓴 경우엔 빈 문자열.
  wrap.getText = () => (allowType ? ta.value.trim() : "");

  // 칸 크기 조절 (＋ 키우기 / － 줄이기). 손글씨 내용은 유지된다.
  if (allowType) {
    const STEP = 60, MAX_ADD = 400;
    function setBoxHeight(h) {
      height = Math.max(baseHeight, Math.min(h, baseHeight + MAX_ADD));
      box.style.height = height + "px";
      canvas.style.height = height + "px";
      resizeCanvas();   // 캔버스 재설정 (기존 손글씨 보존)
    }
    wrap.querySelector(".write-bigger").addEventListener("click", () => setBoxHeight(height + STEP));
    wrap.querySelector(".write-smaller").addEventListener("click", () => setBoxHeight(height - STEP));
  }

  // 화면에 붙은 뒤 크기 계산 → 초기값 있으면 복원 (텍스트는 위에서 이미 복원됨)
  setTimeout(() => {
    resizeCanvas();
    if (typeOnly) { refreshDisplay(); return; }
    // 키보드로 친 글자가 있으면 손글씨 이미지로 굳히지 않고 '글자'로 계속 편집 가능하게 둔다
    if (allowType && opts.initialText) { refreshDisplay(); return; }
    if (opts.initial) {
      const img = new Image();
      img.onload = () => {
        pad.fromDataURL(opts.initial);
        if (allowType) refreshDisplay(); else hint.style.display = "none";
      };
      img.src = opts.initial;
    }
  }, 50);
  window.addEventListener("resize", resizeCanvas);

  wrap._signaturePad = pad;
  function handURL() { return pad.isEmpty() ? null : pad.toDataURL("image/png"); }
  function typeURL() {
    if (!ta.value.trim()) return null;
    const rect = canvas.getBoundingClientRect();
    return renderTextToImage(ta.value, rect.width || 300, height);
  }
  // 손글씨·키보드 어느 쪽이든 입력이 있으면 비어있지 않음
  wrap.isEmpty = () => pad.isEmpty() && !ta.value.trim();
  // 현재 방식의 입력을 우선, 없으면 다른 방식 입력을 사용 (전환해도 내용 유지)
  wrap.toDataURL = () => {
    const cur = mode === "type" ? typeURL() : handURL();
    if (cur) return cur;
    return mode === "type" ? handURL() : typeURL();
  };

  return wrap;
}

// 서명용 (손글씨 입력의 특수한 경우)
function createSignatureField(hintText, initial) {
  return createWritingField({ height: 200, hint: hintText || "여기에 서명해 주세요", dashed: true, initial: initial || null });
}
