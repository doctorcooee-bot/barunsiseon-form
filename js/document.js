// =============================================================
//  공용 도우미 : 날짜/시각, 동의 문구
//  (PDF는 pdf.js 에서 pdf-lib 로 직접 그립니다)
// =============================================================

// 날짜/시각 문자열 (파일명·문서표시에 사용)
function nowParts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return {
    dateNum: `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`, // 20260704
    timeNum: `${p(d.getHours())}${p(d.getMinutes())}`,                     // 1432
    dateText: `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`,
    timeText: `${p(d.getHours())}:${p(d.getMinutes())}`,
  };
}

// 전자문서 클라우드 보관 동의 - 본문 (화면·PDF 공용)
function consentParagraph() {
  return `본인은 「${CONFIG.hospitalName}」에서 작성하는 초진기록지 및 각종 동의서가 ` +
    `전자문서(PDF)로 생성되어, 진료 및 기록 보관을 목적으로 병원이 관리하는 ` +
    `클라우드 저장소에 안전하게 보관되는 것에 동의합니다.`;
}
const CONSENT_BULLETS = [
  "보관 정보 : 성명, 차트번호, 작성 내용, 서명",
  "보관 목적 : 진료기록 관리 및 관련 법령에 따른 보존",
  "보관 기간 : 의료법 등 관련 법령이 정한 기간",
  "본인은 해당 정보의 열람·정정·삭제를 요청할 수 있습니다.",
];

// 서류 크기(밀도) 규격 — 배율(scale)로 자유롭게 조절
//  scale 1.0 = 보통. 작게(0.7) 하면 한 페이지에 더 많이, 크게(1.5) 하면 큼직하게.
//  화면 입력칸 높이 & PDF 글자/여백에 함께 적용됩니다.
function formSizing(scale) {
  // 0.35까지 허용: JPG 저장 서류를 한 페이지에 맞추려고 자동으로 더 줄일 수 있음
  const s = Math.min(1.5, Math.max(0.35, Number(scale) || 1));
  const b = { label: 9.5, base: 10.5, writeH: 84, bigH: 150, signH: 200, pdfWrite: 30, pdfBig: 80, pdfSign: 55, rowGap: 6, sectionGap: 20 };
  return {
    scale: s,
    label: b.label * s,
    base: b.base * s,
    writeH: Math.round(b.writeH * s),
    bigH: Math.round(b.bigH * s),
    signH: Math.round(b.signH * s),
    pdfWrite: b.pdfWrite * s,
    pdfBig: b.pdfBig * s,
    pdfSign: b.pdfSign * s,
    rowGap: b.rowGap * s,
    sectionGap: b.sectionGap * s,
  };
}

// 화면(동의 페이지)에서 쓰는 HTML 버전
function consentBodyHTML() {
  return `${consentParagraph()}
    <ul style="margin:8px 0 0; padding-left:18px;">
      ${CONSENT_BULLETS.map((b) => `<li>${b}</li>`).join("")}
    </ul>`;
}
