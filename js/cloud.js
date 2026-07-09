// =============================================================
//  구글드라이브 자동 저장 (앱스크립트 방식)
//  - 로그인 없이, 병원 구글계정으로 배포한 앱스크립트에 PDF를 보냅니다.
//  - 앱스크립트가 드라이브 저장 + 기록대장(구글시트) 기록을 처리합니다.
// =============================================================

// 연동 설정 값 (관리 메뉴에서 저장한 값 우선, 없으면 config.js)
function getCloudConfig() {
  return {
    url: (localStorage.getItem("barun_cloud_url") || CONFIG.appsScriptUrl || "").trim(),
    token: (localStorage.getItem("barun_cloud_token") || CONFIG.appsScriptToken || "").trim(),
  };
}
function setCloudConfig(url, token) {
  localStorage.setItem("barun_cloud_url", (url || "").trim());
  localStorage.setItem("barun_cloud_token", (token || "").trim());
}
function cloudConfigured() {
  return !!getCloudConfig().url;
}

// Blob(PDF) → base64 문자열
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(new Error("파일 변환 실패"));
    r.readAsDataURL(blob);
  });
}

// 앱스크립트로 POST (text/plain 으로 보내 CORS 사전요청을 피함)
async function cloudPost(payload) {
  const { url } = getCloudConfig();
  if (!url) throw new Error("구글드라이브 연동이 설정되지 않았습니다.");
  let res;
  try {
    res = await fetch(url, { method: "POST", body: JSON.stringify(payload) });
  } catch (e) {
    throw new Error("연결 실패 — 인터넷 또는 주소를 확인하세요.");
  }
  let j;
  try {
    j = await res.json();
  } catch (e) {
    throw new Error('응답 확인 실패 — 앱스크립트 배포 권한을 "모든 사용자"로 했는지 확인하세요.');
  }
  if (!j.ok) throw new Error(j.error || "처리 실패");
  return j;
}

// 파일 1개 업로드 (PDF 또는 JPG)
async function cloudUploadOne(file, meta) {
  const { token } = getCloudConfig();
  const fileBase64 = await blobToBase64(file.blob);
  const j = await cloudPost({
    token,
    patientName: meta.patientName,
    chartNo: meta.chartNo,
    groupName: meta.groupName,
    formName: file.formName,
    fileName: file.fileName,
    mimeType: file.mimeType || "application/pdf",
    fileBase64,
    pdfBase64: fileBase64, // 구버전 앱스크립트 호환용
  });
  return { link: j.link };
}

// 연결 테스트 (저장하지 않고 응답만 확인)
async function cloudPing() {
  const { token } = getCloudConfig();
  await cloudPost({ token, ping: true });
  return true;
}

// 저장된 서류 검색 (환자명/차트번호/파일명) → [{when,patientName,chartNo,groupName,formName,fileName,link,fileId}]
async function cloudSearch(query) {
  const { token } = getCloudConfig();
  const j = await cloudPost({ token, action: "list", query: query || "" });
  return j.items || [];
}

// 서류/환자군 편집 설정 불러오기 (기기간 공유) → config 객체 또는 null
async function cloudLoadConfig() {
  const { token } = getCloudConfig();
  const j = await cloudPost({ token, action: "getConfig" });
  return j.config || null;
}

// 서류/환자군 편집 설정 저장 (기기간 공유)
async function cloudSaveConfig(config) {
  const { token } = getCloudConfig();
  await cloudPost({ token, action: "saveConfig", config });
  return true;
}

// 저장된 파일 삭제 (드라이브 파일 휴지통 이동 + 기록대장 행 삭제)
async function cloudDeleteFile(fileId) {
  const { token } = getCloudConfig();
  await cloudPost({ token, action: "delete", fileId });
  return true;
}

// 파일 다시 받기 (다시 보기) → { blob, mimeType, fileName }
async function cloudGetFile(fileId) {
  const { token } = getCloudConfig();
  const j = await cloudPost({ token, action: "get", fileId });
  const bin = atob(j.base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const blob = new Blob([arr], { type: j.mimeType || "application/octet-stream" });
  return { blob, mimeType: j.mimeType, fileName: j.fileName, bytes: arr };
}
