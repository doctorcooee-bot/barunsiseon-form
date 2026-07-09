// =============================================================
//  바른시선한의원 서류작성 시스템 - 기본 설정
//  (이 파일의 값만 바꾸면 병원 정보/비밀번호를 수정할 수 있습니다)
// =============================================================

const CONFIG = {
  // 병원 이름 (서류 상단 제목, 동의서 문구에 사용)
  hospitalName: "바른시선한의원",

  // 관리 메뉴(서류·환자군 관리) 진입 비밀번호 (4자리 숫자)
  adminPassword: "1233",

  // 완료 후 직원 결과 화면(우측 하단 ⚙) 진입 비밀번호.
  //  - 관리자 메뉴에서 바꾸거나 "없음(잠금 해제)"으로 설정할 수 있습니다.
  //  - 빈 문자열("")이면 비밀번호 없이 바로 들어갑니다.
  staffPassword: "1575",

  // 구글드라이브 저장 폴더 이름
  driveFolderName: "바른시선한의원_환자서류",

  // 구글 앱스크립트 연동 (여기에 넣어두면 모든 기기에서 바로 자동 저장됨)
  //  - appsScriptUrl : 배포한 앱스크립트 웹앱 주소
  //  - appsScriptToken : 앱스크립트와 똑같이 맞춘 비밀 문구
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbzcG0VUYQobMKkPpxe4vsHCduD-HxmTZEeykSqpKPGGHR5SOJiyl7tVax7ilHRhyb2k/exec",
  appsScriptToken: "barun-2026-secret",
};
