// =============================================================
//  PDF 생성 (pdf-lib 로 직접 그리기)
//  - 한글 폰트(나눔고딕)를 PDF 안에 심어 한글이 항상 정확히 나옵니다.
//  - 모든 서류가 같은 레이아웃 함수를 쓰므로 디자인이 통일됩니다.
// =============================================================

const FONT_URL = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/nanumgothic/NanumGothic-Regular.ttf";

// 폰트는 한 번만 내려받아 재사용
let _fontBufferPromise = null;
function getFontBuffer() {
  if (!_fontBufferPromise) {
    _fontBufferPromise = fetch(FONT_URL).then((r) => {
      if (!r.ok) throw new Error("폰트를 불러오지 못했습니다 (인터넷 연결 확인)");
      return r.arrayBuffer();
    });
  }
  return _fontBufferPromise;
}

// A4 (pt)
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

// 색상
function colors() {
  const { rgb } = PDFLib;
  return {
    brand: rgb(0.184, 0.435, 0.561),
    brandDark: rgb(0.141, 0.345, 0.435),
    text: rgb(0.11, 0.16, 0.19),
    gray: rgb(0.37, 0.45, 0.51),
    line: rgb(0.83, 0.87, 0.89),
    faint: rgb(0.6, 0.66, 0.69),
    white: rgb(1, 1, 1),
  };
}

// 긴 글을 폭에 맞춰 줄바꿈 (한글/영문 혼용 대응 - 글자 단위)
function wrapText(text, font, size, maxW) {
  const out = [];
  String(text == null ? "" : text).split("\n").forEach((para) => {
    let line = "";
    for (const ch of para) {
      const test = line + ch;
      if (line !== "" && font.widthOfTextAtSize(test, size) > maxW) {
        out.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    out.push(line);
  });
  return out;
}

// dataURL(png) → 바이트
function dataUrlToBytes(dataUrl) {
  const b64 = dataUrl.split(",")[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// 굵게 흉내 (같은 글자를 살짝 겹쳐 그림)
function drawBold(page, text, x, y, opts) {
  page.drawText(text, Object.assign({ x, y }, opts));
  page.drawText(text, Object.assign({ x: x + 0.4, y }, opts));
}

// #rrggbb → pdf-lib rgb (없거나 형식이 틀리면 fallback)
function hexToPdfColor(hex, fallback) {
  if (!hex || !/^#?[0-9a-fA-F]{6}$/.test(hex)) return fallback;
  const h = hex.replace("#", "");
  return PDFLib.rgb(parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255);
}
// 정렬에 따른 x 좌표 (좌/가운데/우)
function alignedX(lineW, align) {
  if (align === "center") return MARGIN + (CONTENT_W - lineW) / 2;
  if (align === "right") return PAGE_W - MARGIN - lineW;
  return MARGIN;
}

// 다음 줄 공간이 없으면 새 페이지
function ensureSpace(ctx, need) {
  if (ctx.y - need < MARGIN) {
    ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
    ctx.y = PAGE_H - MARGIN;
  }
}

// 새 PDF 문서 + 한글 폰트 준비 (같은 세션에서 여러 번 만들어도 안전)
async function newPdfDoc() {
  const { PDFDocument } = PDFLib;
  const fontBuf = await getFontBuffer();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  // 중요: subset:true 는 같은 세션에서 여러 PDF를 만들 때 폰트가 손상되어
  //       두 번째 PDF부터 한글이 깨진다. 전체 폰트를 심어 안정성을 확보한다.
  //       (버퍼는 매번 복사본을 넘겨 원본 캐시를 보존)
  const font = await doc.embedFont(fontBuf.slice(0));
  return { doc, font };
}

// 머리말 (병원명 · 서류 제목 · 메타 · 구분선)
function drawFormHeader(ctx, title, meta, t, C) {
  const { font } = ctx;
  const page = ctx.page;
  page.drawText(CONFIG.hospitalName, { x: MARGIN, y: ctx.y - 10, size: 10, font, color: C.brand });
  drawBold(page, title, MARGIN, ctx.y - 34, { size: 20, font, color: C.text });
  const metaLines = [
    `차트번호 : ${meta.chartNo || "-"}`,
    `환자군 : ${meta.groupName || "-"}`,
    `작성일 : ${t.dateText} ${t.timeText}`,
  ];
  metaLines.forEach((m, i) => {
    const w = font.widthOfTextAtSize(m, 9);
    page.drawText(m, { x: PAGE_W - MARGIN - w, y: ctx.y - 8 - i * 13, size: 9, font, color: C.gray });
  });
  ctx.y -= 48;
  page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_W - MARGIN, y: ctx.y }, thickness: 1.5, color: C.brand });
  ctx.y -= 22;
}

// 꼬리말 (페이지 하단 병원명)
function drawFooter(page, C, font) {
  const fw = font.widthOfTextAtSize(CONFIG.hospitalName, 9);
  page.drawText(CONFIG.hospitalName, { x: (PAGE_W - fw) / 2, y: 26, size: 9, font, color: C.faint });
}

// 텍스트 설명 위에 그린 강조 필기(밑줄·동그라미)를 PDF에 다시 그린다.
//  - 획은 블록 기준 상대좌표(0~1). 가로는 본문 폭, 세로는 boxTop~boxBottom 범위에 맞춘다.
function drawMarksFor(ctx, values, fi, boxTop, boxBottom) {
  const marks = values && values.__marks && values.__marks[fi];
  if (!marks || !marks.length) return;
  const h = boxTop - boxBottom;
  if (h <= 0) return;
  const col = PDFLib.rgb(0.88, 0.15, 0.14);
  const X = (nx) => MARGIN + nx * CONTENT_W;
  const Y = (ny) => boxTop - ny * h;
  marks.forEach((stroke) => {
    if (!stroke || !stroke.length) return;
    for (let i = 1; i < stroke.length; i++) {
      const a = stroke[i - 1], b = stroke[i];
      ctx.page.drawLine({ start: { x: X(a.x), y: Y(a.y) }, end: { x: X(b.x), y: Y(b.y) }, thickness: 1.6, color: col });
    }
    if (stroke.length === 1) {
      const a = stroke[0];
      ctx.page.drawCircle({ x: X(a.x), y: Y(a.y), size: 1.2, color: col });
    }
  });
}

// 서류 한 개의 본문 항목들 그리기 (동의 내용은 제외)
async function drawFormBody(ctx, form, values, meta, C) {
  const { doc, font } = ctx;
  const blank = !!meta.blank;   // 빈 서류(종이 출력용): 손글씨 칸을 빈 작성란으로 그림
  const sz = formSizing(form.scale);
  const size = sz.base;
  const RIGHT = PAGE_W - MARGIN;

  // 항목 라벨 (윗줄) — 항목별 서식(정렬·굵기·색상·크기) 반영
  function drawLabel(f) {
    const lsize = sz.label * (f.size || 1);
    const step = lsize + 4.5;
    const color = hexToPdfColor(f.color, C.gray);
    const bold = !!f.bold;
    const align = f.align || "left";
    ensureSpace(ctx, step + 2);
    const tx = align === "left" ? MARGIN : alignedX(font.widthOfTextAtSize(f.label, lsize), align);
    if (bold) drawBold(ctx.page, f.label, tx, ctx.y, { size: lsize, font, color });
    else ctx.page.drawText(f.label, { x: tx, y: ctx.y, size: lsize, font, color });
    ctx.y -= step;
  }
  // 항목 구분선
  function sep() {
    ctx.y -= sz.rowGap;
    ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y + 6 }, end: { x: RIGHT, y: ctx.y + 6 }, thickness: 0.5, color: C.line });
  }
  // 손글씨 이미지 값
  async function drawImageValue(dataUrl, maxH) {
    if (blank) {
      // 빈 서류: 손으로 쓸 수 있도록 아래쪽에 밑줄을 둔 빈 영역을 확보
      ensureSpace(ctx, maxH + sz.rowGap);
      ctx.y -= maxH;
      ctx.page.drawLine({ start: { x: MARGIN + 4, y: ctx.y + 3 }, end: { x: RIGHT, y: ctx.y + 3 }, thickness: 0.7, color: C.line });
      ctx.y -= sz.rowGap;
      return;
    }
    if (!dataUrl) {
      ensureSpace(ctx, size + 5);
      ctx.page.drawText("(미작성)", { x: MARGIN + 6, y: ctx.y, size, font, color: C.gray });
      ctx.y -= size + 5;
      return;
    }
    const img = await doc.embedPng(dataUrlToBytes(dataUrl));
    const s = Math.min(CONTENT_W / img.width, maxH / img.height);
    const w = img.width * s, h = img.height * s;
    ensureSpace(ctx, h + sz.rowGap);
    ctx.page.drawImage(img, { x: MARGIN + 4, y: ctx.y - h + 4, width: w, height: h });
    ctx.y -= h + sz.rowGap;
  }
  // 텍스트 값 (주소 등) — 여러 줄이면 자동 줄바꿈
  function drawTextValue(text) {
    if (blank) {
      ensureSpace(ctx, sz.pdfWrite + sz.rowGap);
      ctx.y -= sz.pdfWrite;
      ctx.page.drawLine({ start: { x: MARGIN + 4, y: ctx.y + 3 }, end: { x: RIGHT, y: ctx.y + 3 }, thickness: 0.7, color: C.line });
      ctx.y -= sz.rowGap;
      return;
    }
    if (!text) {
      ensureSpace(ctx, size + 5);
      ctx.page.drawText("(미작성)", { x: MARGIN + 6, y: ctx.y, size, font, color: C.gray });
      ctx.y -= size + 5;
      return;
    }
    const lh = size + 5;
    wrapText(text, font, size, CONTENT_W - 8).forEach((ln) => {
      ensureSpace(ctx, lh);
      ctx.page.drawText(ln, { x: MARGIN + 6, y: ctx.y, size, font, color: C.text });
      ctx.y -= lh;
    });
    ctx.y -= sz.rowGap - 2;
  }
  // 주소 값 { road, detail } → 한 문장
  function addrToText(v) {
    if (!v) return "";
    if (typeof v === "string") return v;
    return [v.road, v.detail].filter(Boolean).join(" ");
  }
  // 선택 항목 → 체크박스 목록 (항목별 글씨 크기·색상 반영)
  function drawChoices(f, val) {
    const selected = Array.isArray(val) ? val : (val ? [val] : []);
    const csize = size * (f.size || 1);         // 선택지 글씨 크기
    const cstep = csize + 9;                     // 선택지 줄 높이
    const ccolor = hexToPdfColor(f.color, C.text);
    const box = Math.round(csize * 0.95);        // 체크박스 크기
    const gap = 6;                              // 박스와 글자 사이 간격
    let x = MARGIN + 4;
    ensureSpace(ctx, cstep);
    f.options.forEach((o) => {
      const tw = font.widthOfTextAtSize(o, csize);
      const itemW = box + gap + tw + 20;
      if (x + itemW > RIGHT) { ctx.y -= cstep; x = MARGIN + 4; ensureSpace(ctx, cstep); }
      const boxY = ctx.y + csize * 0.34 - box / 2;   // 글자 시각 중심에 박스를 맞춤
      ctx.page.drawRectangle({ x, y: boxY, width: box, height: box, borderColor: C.text, borderWidth: 1, color: C.white });
      if (selected.indexOf(o) >= 0) {
        ctx.page.drawLine({ start: { x: x + box * 0.20, y: boxY + box * 0.50 }, end: { x: x + box * 0.40, y: boxY + box * 0.24 }, thickness: box * 0.12, color: C.brand });
        ctx.page.drawLine({ start: { x: x + box * 0.40, y: boxY + box * 0.24 }, end: { x: x + box * 0.80, y: boxY + box * 0.80 }, thickness: box * 0.12, color: C.brand });
      }
      ctx.page.drawText(o, { x: x + box + gap, y: ctx.y, size: csize, font, color: ccolor });
      x += itemW;
    });
    ctx.y -= cstep - 2;
  }

  for (let fi = 0; fi < form.fields.length; fi++) {
    const f = form.fields[fi];
    if (f.type === "section") {
      ensureSpace(ctx, sz.sectionGap + 8);
      ctx.y -= sz.rowGap;
      const secSize = Math.round(sz.base + 1.5);
      const secColor = hexToPdfColor(f.color, C.brandDark);
      const align = f.align || "left";
      const bold = f.bold !== false;   // 구역 제목은 기본 굵게
      // 좌측 정렬일 때만 브랜드 색 세로 막대 표시
      let tx = MARGIN;
      if (align === "left") {
        ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 2, width: 4, height: 13, color: secColor });
        tx = MARGIN + 10;
      } else {
        const lineW = font.widthOfTextAtSize(f.label, secSize);
        tx = alignedX(lineW, align);
      }
      const boxTop = ctx.y + secSize;
      if (bold) drawBold(ctx.page, f.label, tx, ctx.y, { size: secSize, font, color: secColor });
      else ctx.page.drawText(f.label, { x: tx, y: ctx.y, size: secSize, font, color: secColor });
      drawMarksFor(ctx, values, fi, boxTop, ctx.y - secSize * 0.28);
      ctx.y -= sz.sectionGap;
      continue;
    }
    if (f.type === "note") {
      const nSize = Math.max(9, sz.base - 1);
      const nLineH = nSize + 4;
      const nColor = hexToPdfColor(f.color, C.gray);
      const align = f.align || "left";
      const bold = !!f.bold;
      ctx.y -= 2;
      const boxTop = ctx.y + nSize;
      wrapText(f.label, font, nSize, CONTENT_W).forEach((ln) => {
        ensureSpace(ctx, nLineH);
        const tx = align === "left" ? MARGIN : alignedX(font.widthOfTextAtSize(ln, nSize), align);
        if (bold) drawBold(ctx.page, ln, tx, ctx.y, { size: nSize, font, color: nColor });
        else ctx.page.drawText(ln, { x: tx, y: ctx.y, size: nSize, font, color: nColor });
        ctx.y -= nLineH;
      });
      drawMarksFor(ctx, values, fi, boxTop, ctx.y + nLineH - nSize * 0.28);
      ctx.y -= 6;
      continue;
    }
    if (f.type === "write" || f.type === "writeBig" || f.type === "signature" || f.type === "number") {
      drawLabel(f);
      // 키보드로 친 답변은 텍스트로 그려 밑줄이 바로 아래 오도록 함 (이미지 여백 제거)
      const typed = values["__t_" + f.key];
      if (!blank && f.type !== "signature" && typed) {
        drawTextValue(typed);
      } else {
        const maxH = f.type === "writeBig" ? sz.pdfBig : (f.type === "signature" ? sz.pdfSign : sz.pdfWrite);
        await drawImageValue(values[f.key], maxH);
      }
      sep();
      continue;
    }
    if (f.type === "address") {
      drawLabel(f);
      drawTextValue(addrToText(values[f.key]));
      sep();
      continue;
    }
    if (f.type === "radio" || f.type === "checkbox") {
      drawLabel(f);
      drawChoices(f, values[f.key]);
      sep();
      continue;
    }
  }
}

// 전자문서 클라우드 보관 동의 (withHeading=true 면 구분선+소제목을 함께 그림)
async function drawConsentBody(ctx, meta, C, withHeading) {
  const { doc, font } = ctx;
  if (withHeading) {
    ctx.y -= 14;
    ensureSpace(ctx, 60);
    ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y + 6 }, end: { x: PAGE_W - MARGIN, y: ctx.y + 6 }, thickness: 1, color: C.brand });
    ctx.y -= 8;
    drawBold(ctx.page, "[전자문서 클라우드 보관 동의]", MARGIN, ctx.y, { size: 12, font, color: C.brandDark });
    ctx.y -= 20;
  }

  const cSize = 9.5, cLineH = 14;
  wrapText(consentParagraph(), font, cSize, CONTENT_W).forEach((ln) => {
    ensureSpace(ctx, cLineH);
    ctx.page.drawText(ln, { x: MARGIN, y: ctx.y, size: cSize, font, color: C.text });
    ctx.y -= cLineH;
  });
  ctx.y -= 2;
  CONSENT_BULLETS.forEach((b) => {
    wrapText("· " + b, font, cSize, CONTENT_W - 8).forEach((ln) => {
      ensureSpace(ctx, cLineH);
      ctx.page.drawText(ln, { x: MARGIN + 8, y: ctx.y, size: cSize, font, color: C.text });
      ctx.y -= cLineH;
    });
  });

  // 동의 체크 + 서명
  ctx.y -= 8;
  ensureSpace(ctx, 46);
  const cTextY = ctx.y - 8;
  const cBox = 13;
  const boxY = cTextY + 11 * 0.34 - cBox / 2;   // 글자 시각 중심에 박스를 맞춤
  ctx.page.drawRectangle({ x: MARGIN, y: boxY, width: cBox, height: cBox, borderColor: C.text, borderWidth: 1, color: C.white });
  if (meta.consentAgreed) {
    ctx.page.drawLine({ start: { x: MARGIN + cBox * 0.20, y: boxY + cBox * 0.50 }, end: { x: MARGIN + cBox * 0.40, y: boxY + cBox * 0.24 }, thickness: 1.5, color: C.brand });
    ctx.page.drawLine({ start: { x: MARGIN + cBox * 0.40, y: boxY + cBox * 0.24 }, end: { x: MARGIN + cBox * 0.80, y: boxY + cBox * 0.80 }, thickness: 1.5, color: C.brand });
  }
  ctx.page.drawText("위 내용에 모두 동의합니다.", { x: MARGIN + cBox + 8, y: cTextY, size: 11, font, color: C.text });

  // 동의 서명 (오른쪽)
  ctx.page.drawText("서명 :", { x: PAGE_W - MARGIN - 210, y: ctx.y - 8, size: 10, font, color: C.gray });
  if (meta.consentSignImg) {
    const img = await doc.embedPng(dataUrlToBytes(meta.consentSignImg));
    let h = 34, w = img.width * (h / img.height);
    if (w > 150) { w = 150; h = img.height * (w / img.width); }
    ctx.page.drawImage(img, { x: PAGE_W - MARGIN - 165, y: ctx.y - h + 6, width: w, height: h });
  }
  ctx.y -= 40;
}

// 단일 서류 PDF (동의 내용 포함) — 빈 서류 인쇄 미리보기 등에 사용
async function generatePdf(form, values, meta) {
  const C = colors();
  const { doc, font } = await newPdfDoc();
  const t = nowParts();
  const ctx = { doc, font, page: doc.addPage([PAGE_W, PAGE_H]), y: PAGE_H - MARGIN };

  drawFormHeader(ctx, form.name, meta, t, C);
  await drawFormBody(ctx, form, values, meta, C);
  await drawConsentBody(ctx, meta, C, true);
  drawFooter(ctx.page, C, font);

  const bytes = await doc.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  return { blob, url, bytes, fileName: makeFileName(meta, form.name) };
}

// 첫 페이지 상단에 환자 성명을 크게 표시
function drawPatientNameLine(ctx, meta, C) {
  const { font, page } = ctx;
  ensureSpace(ctx, 30);
  drawBold(page, "환자 성명 : " + (meta.patientName || "-"), MARGIN, ctx.y, { size: 14, font, color: C.text });
  ctx.y -= 26;
}

// 여러 서류를 하나의 PDF 로 합침
//  - 가장 앞장 : 환자 성명 + 전자문서 클라우드 보관 동의
//  - 이후 서류마다 새 페이지에서 시작 (서로 이어 붙지 않음)
//  - 파일명은 날짜_이름_시각.pdf
async function generateCombinedPdf(items, meta) {
  const C = colors();
  const { doc, font } = await newPdfDoc();
  const t = nowParts();

  // 첫 페이지 : 환자 성명 + 클라우드 보관 동의
  const cctx = { doc, font, page: doc.addPage([PAGE_W, PAGE_H]), y: PAGE_H - MARGIN };
  drawFormHeader(cctx, "전자문서 클라우드 보관 동의", meta, t, C);
  drawPatientNameLine(cctx, meta, C);
  await drawConsentBody(cctx, meta, C, false);
  drawFooter(cctx.page, C, font);

  // JPG 저장 서류가 한 페이지에 들어오는 배율을 미리 재기 위한 스크래치 문서(폰트 1회만 심음)
  let _scratch = null, _scratchFont = null;
  async function measurePages(form, values, scale) {
    if (!_scratch) {
      _scratch = await PDFLib.PDFDocument.create();
      _scratch.registerFontkit(fontkit);
      const fb = await getFontBuffer();
      _scratchFont = await _scratch.embedFont(fb.slice(0));
    }
    const start0 = _scratch.getPageCount();
    const mctx = { doc: _scratch, font: _scratchFont, page: _scratch.addPage([PAGE_W, PAGE_H]), y: PAGE_H - MARGIN };
    drawFormHeader(mctx, form.name, meta, t, C);
    await drawFormBody(mctx, Object.assign({}, form, { scale }), values, meta, C);
    return _scratch.getPageCount() - start0;
  }

  // 이후 : 서류마다 새 페이지 (서류가 차지하는 페이지 범위를 기록해 둔다)
  const formPages = [];
  for (const it of items) {
    let effForm = it.form;
    // "JPG로도 저장" 서류는 글씨를 전체적으로 줄여 한 페이지에 담는다(자동 맞춤).
    if (it.form.saveJpg) {
      const startScale = Math.min(1.5, Number(it.form.scale) || 1);
      let chosen = startScale;
      for (let s = startScale; s >= 0.35 - 1e-9; s -= 0.05) {
        chosen = Math.round(s * 100) / 100;
        if ((await measurePages(it.form, it.values, chosen)) <= 1) break;
      }
      effForm = Object.assign({}, it.form, { scale: chosen });
    }
    const start = doc.getPageCount() + 1;
    const ctx = { doc, font, page: doc.addPage([PAGE_W, PAGE_H]), y: PAGE_H - MARGIN };
    drawFormHeader(ctx, effForm.name, meta, t, C);
    await drawFormBody(ctx, effForm, it.values, meta, C);
    drawFooter(ctx.page, C, font);
    formPages.push({ form: it.form, start, end: doc.getPageCount() });
  }

  const bytes = await doc.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  return { blob, url, bytes, fileName: makeSessionFileName(meta, t), formPages };
}

// =============================================================
//  PDF → JPG 변환 (일부 양식을 그림파일로도 저장할 때)
//  - 이미 만든 PDF를 pdf.js로 페이지마다 캔버스에 그린 뒤 JPG로 뽑습니다.
//    (레이아웃을 그대로 재사용하므로 PDF와 디자인이 같습니다.)
//  - 여러 페이지면 페이지별로 여러 장의 JPG가 나옵니다.
// =============================================================
const PDFJS_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js";

async function pdfBytesToJpegs(pdfBytes, pdfFileName, onlyPages) {
  const lib = window.pdfjsLib;
  if (!lib) throw new Error("JPG 변환 모듈을 불러오지 못했습니다 (인터넷 연결 확인)");
  if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) {
    lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  }
  // getDocument 는 넘긴 버퍼를 소비하므로 복사본을 넘긴다 (원본 PDF 보존)
  const pdf = await lib.getDocument({ data: pdfBytes.slice(0) }).promise;
  const n = pdf.numPages;
  const base = pdfFileName.replace(/\.pdf$/i, "");
  // onlyPages 가 있으면 그 페이지들만 JPG 로 (JPG 저장 대상 서류가 있는 페이지)
  const pageList = (onlyPages && onlyPages.length ? onlyPages : Array.from({ length: n }, (_, i) => i + 1))
    .filter((p) => p >= 1 && p <= n);
  const multi = pageList.length > 1;
  const out = [];
  for (const p of pageList) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 2 }); // 2배 해상도 (선명하게)
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const cctx = canvas.getContext("2d");
    cctx.fillStyle = "#ffffff"; // JPG는 투명 없음 → 흰 배경
    cctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: cctx, viewport }).promise;
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.92));
    const fileName = multi ? `${base}_${p}.jpg` : `${base}.jpg`;
    out.push({ blob, url: URL.createObjectURL(blob), fileName, page: p, pages: pageList.length });
  }
  try { await pdf.cleanup(); } catch (e) { /* 무시 */ }
  return out;
}

// PDF를 화면 요소 안에 페이지별 캔버스로 그림 (아이패드에서도 잘 보임)
//  - 아이패드 사파리는 <iframe src=blob.pdf> 가 빈칸이 될 때가 있어 캔버스로 그린다.
async function renderPdfIntoElement(pdfBytes, el) {
  const lib = window.pdfjsLib;
  if (!lib) throw new Error("미리보기 모듈을 불러오지 못했습니다 (인터넷 연결 확인)");
  if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) {
    lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  }
  const pdf = await lib.getDocument({ data: pdfBytes.slice(0) }).promise;
  el.innerHTML = "";
  const cssW = Math.max(280, el.clientWidth || 600);         // 컨테이너 폭
  const dpr = Math.min(window.devicePixelRatio || 1, 2);     // 선명도(과하지 않게)
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const base = page.getViewport({ scale: 1 });
    const scale = (cssW / base.width) * dpr;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    canvas.style.display = "block";
    canvas.style.marginBottom = "10px";
    canvas.style.borderRadius = "8px";
    canvas.style.boxShadow = "0 1px 6px rgba(0,0,0,.12)";
    const cctx = canvas.getContext("2d");
    cctx.fillStyle = "#ffffff";
    cctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: cctx, viewport }).promise;
    el.appendChild(canvas);
  }
  try { await pdf.cleanup(); } catch (e) { /* 무시 */ }
}

// 파일 이름 : 날짜_환자명_양식종류_시각.pdf
//  - 차트번호는 넣지 않는다. (날짜·시각으로 나중에 구분 가능)
//  - 환자명이 없으면(손글씨 등) "무기명" 으로 저장한다.
function makeFileName(meta, formName) {
  const t = nowParts();
  const safe = (s) => String(s || "").replace(/[\\/:*?"<>|\s]/g, "").trim();
  const name = safe(meta.patientName) || "무기명";
  return `${t.dateNum}_${name}_${safe(formName) || "서류"}_${t.timeNum}.pdf`;
}

// 합본(하루 작성분 전체) 파일 이름 : 날짜_이름_시각.pdf
//  - 여러 서류를 하나로 묶으므로 서류종류는 넣지 않는다.
function makeSessionFileName(meta, t) {
  const parts = t || nowParts();
  const safe = (s) => String(s || "").replace(/[\\/:*?"<>|\s]/g, "").trim();
  const name = safe(meta.patientName) || "무기명";
  return `${parts.dateNum}_${name}_${parts.timeNum}.pdf`;
}

// 내려받기
function downloadPdf(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
