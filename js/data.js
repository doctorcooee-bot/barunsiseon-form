// =============================================================
//  양식(서류) 정의 · 환자군 정의
//  - 스캔 설문지(CamScanner)를 태블릿용 항목으로 옮겨 정의했습니다.
//  - 관리 메뉴(⚙)에서 항목을 자유롭게 추가/삭제/수정할 수 있습니다.
// =============================================================

// ---- 입력 항목 종류 ----
//  section   : 구역 제목 (입력칸 없음)
//  note      : 안내 문구 (환자가 읽는 설명·약관, 입력칸 없음)
//  write     : 손글씨 한 줄 (이름·생년월일·주소 등 → 손으로 씀)
//  writeBig  : 손글씨 여러 줄 (증상 설명·과거력 등)
//  radio     : 하나만 선택 (탭해서 체크)
//  checkbox  : 여러 개 선택 (탭해서 체크)
//  signature : 서명 (손글씨)

const DEFAULT_FORMS = {
  // -----------------------------------------------------------
  //  [공통] 개인정보 수집·이용·제공 동의서
  // -----------------------------------------------------------
  privacy: {
    id: "privacy",
    name: "개인정보 수집·이용 동의서",
    fields: [
      { type: "note", label: "본인은 한약 건강보험 적용 2단계 시범사업 참여 안내 및 개인정보 수집·이용, 제공에 관한 설명을 듣고 아래와 같이 동의 여부를 결정합니다." },

      { type: "section", label: "가. 개인정보 수집·이용 동의" },
      { type: "note", label: "· 수집·이용 목적 : 한약 건강보험 적용 2단계 시범사업 실시 및 진료·기록 관리\n· 수집 항목 : 성명, 생년월일, 성별, 연락처, 주소, 진료(처방) 내역 등\n· 보유·이용 기간 : 의료법 등 관련 법령이 정한 기간" },
      { type: "radio", key: "agreeCollect", label: "개인정보 수집·이용에 동의하십니까?", options: ["동의함", "동의하지 않음"], required: true },

      { type: "section", label: "나. 고유식별정보 수집·이용 동의" },
      { type: "note", label: "주민등록번호 등 고유식별정보의 수집·이용에 관한 동의입니다." },
      { type: "radio", key: "agreeUniqueId", label: "고유식별정보 수집·이용에 동의하십니까?", options: ["동의함", "동의하지 않음"] },

      { type: "section", label: "다. 개인정보 제3자 제공 동의" },
      { type: "note", label: "건강보험심사평가원 등 시범사업 운영기관에 개인정보를 제공하는 것에 대한 동의입니다." },
      { type: "radio", key: "agreeThirdParty", label: "개인정보 제3자 제공에 동의하십니까?", options: ["동의함", "동의하지 않음"] },

      { type: "section", label: "확인" },
      { type: "write", key: "guardian", label: "법정대리인 성명·관계 (만 14세 미만인 경우)" },
      { type: "signature", key: "sign", label: "본인(환자) 서명", required: true },
    ],
  },

  // -----------------------------------------------------------
  //  [공통] 초진 접수증
  // -----------------------------------------------------------
  chojin: {
    id: "chojin",
    name: "초진 접수증",
    scale: 0.9,
    fields: [
      { type: "section", label: "기본 정보" },
      { type: "write", key: "phone", label: "핸드폰" },
      { type: "write", key: "birth", label: "주민번호(생년월일)" },
      { type: "write", key: "job", label: "직업" },
      { type: "address", key: "address", label: "주소" },

      { type: "section", label: "01 저희 병원을 어떻게 알고 오셨나요?" },
      {
        type: "checkbox", key: "howKnown", label: "알게 된 경로",
        options: ["지인 소개", "입소문", "네이버 검색(지식iN)", "홈페이지", "블로그", "카페", "인스타", "외부 간판", "지나가다", "기타"],
      },
      { type: "write", key: "referrer", label: "소개자 성함 (지인 소개 시)" },
      { type: "write", key: "referrerPhone", label: "소개자 연락처 (지인 소개 시)" },

      { type: "section", label: "02 방문 목적" },
      { type: "writeBig", key: "visitReason", label: "내원 이유" },
      {
        type: "checkbox", key: "treatWant", label: "환자분이 원하시는 치료",
        options: ["통증 치료", "자동차 사고", "아이·어깨 상담", "한약 상담", "여성 질환", "원장님 상담 후 결정", "일반 치료", "기타"],
      },

      { type: "section", label: "03 현재 매일 복용 중인 약물" },
      {
        type: "checkbox", key: "meds", label: "복용 중인 약물",
        options: ["없음", "고혈압", "고지혈증", "당뇨", "심장질환", "신장질환", "간질환", "소화제", "알러지 약물", "한약", "기타"],
      },

      { type: "section", label: "04 수술 이력" },
      { type: "radio", key: "surgery", label: "수술 이력", options: ["없다", "있다"] },
      { type: "write", key: "surgeryWhen", label: "수술 시기 (있는 경우)" },

      { type: "section", label: "05 여성이신 경우" },
      { type: "checkbox", key: "female", label: "해당 사항 (여성인 경우)", options: ["임신 가능성이 없다", "현재 임신 중", "최근 1년 이내 출산"] },
      { type: "write", key: "pregnantWeek", label: "임신 중인 경우 주수" },

      { type: "section", label: "06 실비보험 안내" },
      { type: "note", label: "실비보험이 있으시면 한의원에서 진료비 환급 및 전자서류 청구를 도와드릴 수 있습니다." },
      { type: "radio", key: "hasInsurance", label: "실비 보험이 있으신가요?", options: ["네", "아니요", "잘 모르겠다"] },
      { type: "radio", key: "wantInsuranceInfo", label: "받으실 수 있는 혜택을 안내해 드릴까요?", options: ["네", "아니요"] },

      { type: "section", label: "07 기본 검사 시행 안내" },
      { type: "note", label: "본원에서는 환자분의 몸 상태를 정확히 진단하고 맞춤형 진료를 제공하기 위해 기본 검사를 시행하고 있습니다.\n(소요시간 약 10분 · 혈압맥, 자율신경, 뇌파, 스트레스, 피로도 검사)" },
      { type: "radio", key: "wantBasicTest", label: "기본 검사를 받아 보시겠습니까?", options: ["네", "아니요"] },

      { type: "section", label: "개인정보 수집 및 활용 동의" },
      { type: "note", label: "진료·상담·병원 안내 등을 위하여 위 개인정보를 수집·활용하는 것에 동의합니다." },
      { type: "radio", key: "agreePrivacy", label: "개인정보 수집·활용에 동의하십니까?", options: ["동의함", "동의하지 않음"], required: true },

      { type: "section", label: "확인" },
      { type: "signature", key: "sign", label: "본인(및 대리인) 서명", required: true },
    ],
  },

  // -----------------------------------------------------------
  //  [공통] 한약 자가체크 설문 (한약 치료효과가 뛰어난 6대 질환)
  // -----------------------------------------------------------
  herbCheck: {
    id: "herbCheck",
    name: "한약 자가체크 설문",
    scale: 0.9,
    fields: [
      { type: "note", label: "한약의 치료 효과가 뛰어난 6대 질환 중 해당되는 질환에 체크해 주세요. 각 설문지에서 해당하는 증상을 모두 선택하시면 상담에 도움이 됩니다." },
      {
        type: "checkbox", key: "sixDisease", label: "6대 질환",
        options: ["기능성 소화불량", "월경통", "알레르기 비염", "요추 추간판 탈출증(디스크)", "안면신경마비", "뇌혈관질환 후유증", "기타"],
      },

      { type: "section", label: "체질 설문지" },
      {
        type: "checkbox", key: "constitution", label: "해당하는 항목",
        options: ["추위를 잘 탄다", "조금 활동해도 땀이 잘 난다", "아랫배가 잘 차다", "더위를 잘 탄다", "손·발이 잘 저리다", "얼굴이 쉽게 붉어지고 열이 오른다", "평소 나른하고 피곤하다", "입안·입술이 잘 마른다"],
      },

      { type: "section", label: "순환·호흡기 설문지" },
      {
        type: "checkbox", key: "circulation", label: "해당하는 항목",
        options: ["쉽게 붓는다", "자주 어지럽다", "가슴이 두근거린다", "숨이 잘 찬다", "기침·가래가 있다", "손발이 차다", "몸이 자주 무겁다"],
      },

      { type: "section", label: "소화기능 설문지" },
      {
        type: "checkbox", key: "digestion", label: "해당하는 항목",
        options: ["소화가 잘 안 된다", "배에 가스가 잘 찬다", "명치가 아플 때가 있다", "속이 자주 쓰리다", "신물이 잘 오른다", "잘 체한다", "식사가 불편할 때가 많다"],
      },

      { type: "section", label: "대소변 설문지" },
      {
        type: "checkbox", key: "urineStool", label: "해당하는 항목",
        options: ["대변을 시원하게 못 본다", "변이 딱딱하거나 변비가 있다", "설사를 자주 한다", "소변을 자주 본다", "소변이 시원치 않다", "자다가 깨서 소변을 본다"],
      },

      { type: "section", label: "수면 설문지" },
      {
        type: "checkbox", key: "sleep", label: "해당하는 항목",
        options: ["잠들기 어렵다", "불면증이 있다", "자다가 잘 깬다", "커피를 마시면 잠이 잘 안 온다", "자주 뒤척인다"],
      },

      { type: "section", label: "통증 설문지" },
      {
        type: "checkbox", key: "pain", label: "해당하는 항목",
        options: ["목·어깨가 자주 아프다", "허리가 자주 아프다", "무릎·관절이 아프다", "손발이 저리다", "두통이 자주 있다"],
      },

      { type: "section", label: "상담 신청" },
      { type: "note", label: "상담을 원하시면 아래 내용을 작성해 주세요." },
      { type: "checkbox", key: "wantHerbConsult", label: "한약 상담", options: ["한약 상담을 원합니다"] },
      { type: "signature", key: "sign", label: "서명" },
    ],
  },

  // -----------------------------------------------------------
  //  [자동차보험] 자동차 보험 접수 설문지
  // -----------------------------------------------------------
  jaboSurvey: {
    id: "jaboSurvey",
    name: "자동차 보험 접수 설문지",
    scale: 0.9,
    fields: [
      { type: "note", label: "자동차보험 접수에 필요한 지불보증을 받기 위해 아래 항목을 작성해 주세요. 자동차 사고로 인한 피해를 입증하기 위한 자료이므로 자세히 적어주시기 바랍니다." },
      { type: "radio", key: "patientType", label: "환자 유형", options: ["운전자", "동승자", "보행자"], required: true },

      { type: "section", label: "01 사고 당시 상황" },
      {
        type: "checkbox", key: "accidentSituation", label: "사고 당시 상황 (해당 항목에 체크)",
        options: ["정차 중 추돌", "급정거", "안전 운행 중", "후방 추돌", "측면 충돌", "정면 충돌", "자동차 전복", "기타"],
      },
      { type: "write", key: "vehicleType", label: "사고 차종 (자동차/오토바이/버스/택시/자전거 등)" },
      { type: "write", key: "accidentSpeed", label: "사고 당시 속도 (km/h)" },

      { type: "section", label: "02 신체 손상 정도" },
      {
        type: "checkbox", key: "bodyDamage", label: "해당 항목에 체크",
        options: ["사고로 X-ray/CT/MRI 검사를 받았다", "사고 이후 물리치료를 받았다", "디스크·염좌 진단을 받았다", "정신적 불안 증상(우울·두통·불안)이 있다", "어지럼증·메스꺼움이 있다"],
      },
      { type: "write", key: "examPart", label: "검사 부위" },
      { type: "writeBig", key: "priorHistory", label: "사고 이전 진단 병력이나 치료 중인 곳 (있으면 적어주세요)" },

      { type: "section", label: "03 사고 이후 신체 건강 상태" },
      { type: "radio", key: "digest", label: "소화", options: ["양호", "불량"] },
      { type: "radio", key: "stool", label: "대변", options: ["양호", "불량", "변비"] },
      { type: "radio", key: "urine", label: "소변", options: ["양호", "불량"] },
      { type: "checkbox", key: "sleepState", label: "수면", options: ["양호", "천면(얕은 잠)", "야간뇨", "자다 깸", "불면"] },
      { type: "writeBig", key: "painArea", label: "통증 부위 (우측/좌측/전신/상하지 등)" },

      { type: "section", label: "04 현재 아픈 곳 (통증이 심한 순서대로)" },
      { type: "write", key: "pain1", label: "1순위" },
      { type: "write", key: "pain2", label: "2순위" },
      { type: "write", key: "pain3", label: "3순위" },
      { type: "write", key: "pain4", label: "4순위" },

      { type: "section", label: "05 가장 불편한 곳(1번 증상)의 통증 정도" },
      { type: "note", label: "0(통증 없음) ~ 10(극심한 통증). 7점 이상인 경우 심한 치료가 필요합니다." },
      { type: "radio", key: "painScore", label: "통증 점수", options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"], required: true },

      { type: "section", label: "06~09 치료·입원·처방" },
      { type: "checkbox", key: "prevTreat", label: "06 사고 이후 다른 의료기관에서 치료를 받으셨나요?", options: ["처음(없음)", "응급실", "입원 병원", "한방병원", "한의원"] },
      { type: "radio", key: "admitted", label: "07 사고 이후 입원하셨나요?", options: ["안 함", "입원함"] },
      { type: "write", key: "admitDetail", label: "입원한 경우 (병원·기간)" },
      { type: "radio", key: "wantAdmit", label: "08 현재 통증이 심해 입원을 원하시나요?", options: ["입원이 필요함", "통증 치료만 원함", "한의사 상담 후 결정"] },
      { type: "radio", key: "wantHerb", label: "09 사고 이후 한약 처방을 받으셨나요?", options: ["안 받음", "다른 의료기관에서 처방받음", "한의사 상담 후 결정"] },

      { type: "section", label: "확인" },
      { type: "signature", key: "sign", label: "환자 서명", required: true },
    ],
  },

  // -----------------------------------------------------------
  //  [자동차보험] 진료를 위한 개인정보 수집·이용·제3자 제공 동의서
  // -----------------------------------------------------------
  jaboConsent: {
    id: "jaboConsent",
    name: "자동차보험 진료 개인정보 동의서",
    fields: [
      { type: "note", label: "자동차보험 진료비 청구를 위하여 아래와 같이 개인정보를 수집·이용하고 제3자에게 제공하고자 합니다. 아래 내용을 자세히 읽으신 뒤 동의 여부를 결정하여 주시기 바랍니다." },

      { type: "section", label: "가. 개인정보 수집·이용 동의" },
      { type: "note", label: "· 수집·이용 목적 : 자동차보험 진료 청구 및 진료비 지급\n· 수집 항목 : 성명, 생년월일, 진료·처방 내역 등\n· 보유·이용 기간 : 관련 법령이 정한 기간" },
      { type: "radio", key: "agreeCollect", label: "개인정보 수집·이용에 동의하십니까?", options: ["동의함", "동의하지 않음"], required: true },

      { type: "section", label: "나. 민감정보 수집·이용 동의" },
      { type: "note", label: "건강정보 등 민감정보의 수집·이용에 관한 동의입니다." },
      { type: "radio", key: "agreeSensitive", label: "민감정보 수집·이용에 동의하십니까?", options: ["동의함", "동의하지 않음"] },

      { type: "section", label: "다. 고유식별정보 수집·이용 동의" },
      { type: "radio", key: "agreeUniqueId", label: "고유식별정보(주민등록번호 등) 수집·이용에 동의하십니까?", options: ["동의함", "동의하지 않음"] },

      { type: "section", label: "라. 개인정보 제3자 제공 동의" },
      { type: "note", label: "보험회사, 건강보험심사평가원 등에 진료 관련 개인정보를 제공하는 것에 대한 동의입니다." },
      { type: "radio", key: "agreeThird", label: "개인정보 제3자 제공에 동의하십니까?", options: ["동의함", "동의하지 않음"] },

      { type: "section", label: "확인" },
      { type: "write", key: "guardian", label: "법정대리인 성명·관계 (만 14세 미만인 경우)" },
      { type: "signature", key: "sign", label: "본인(환자) 서명", required: true },
    ],
  },

  // -----------------------------------------------------------
  //  [자동차보험] 한약(첩약) 처방 동의서
  //  ※ 원본 스캔 서식의 내용을 축소 없이 그대로 옮겼습니다.
  // -----------------------------------------------------------
  jaboHerbConsent: {
    id: "jaboHerbConsent",
    name: "자동차보험 한약 처방 동의서",
    fields: [
      { type: "note", label: "자동차보험 첩약 적정 청구 도모를 위하여 아래와 같이 개인정보를 수집·이용하고, 제3자에게 제공하고자 합니다.\n아래 내용을 자세히 읽으신 후 동의 여부를 결정하여 주시기 바랍니다." },

      { type: "write", key: "patientName", label: "환자성명", required: true },
      { type: "write", key: "birth", label: "생년월일" },
      { type: "write", key: "phone", label: "전화번호" },

      { type: "section", label: "가. 개인정보를 제공받는 기관" },
      { type: "note", label: "'첩약 등록 및 관리시스템'을 통해 환자의 첩약 관련 진료정보를 등록하는 의료기관 (바른시선한의원)" },

      { type: "section", label: "나. 개인정보 수집·이용에 관한 동의" },
      { type: "note", label: "· 항목 : 성명, 사고접수번호\n· 수집·이용 목적 : '첩약 등록 및 관리시스템'을 통해 수집된 환자 진료 정보(처방일수)를 타 기관에 제공하여, 첩약 중복 청구 방지 및 적정 청구 도모\n· 보유 및 이용기간 : 5년" },
      { type: "note", label: "※ 귀하는 위의 개인정보 수집·이용에 대한 동의를 거부할 권리가 있으며, 동의를 거부할 경우 첩약 진료에 제한을 받을 수 있습니다." },
      { type: "radio", key: "agreeCollect", label: "위와 같이 개인정보 수집·이용에 동의하십니까?", options: ["동의함", "동의하지 않음"], required: true },

      { type: "section", label: "다. 민감정보 수집·이용에 관한 동의" },
      { type: "note", label: "· 항목 : 환자 증상 등 첩약 관련 진료 정보(진료일자, 첩약의 총 투여일수, 환자 상병·변증, 주·부상병 여부, 투여할 첩약의 분류 및 구성 한약재 등)\n· 수집·이용 목적 : '첩약 등록 및 관리시스템'을 통해 수집한 환자 진료 정보(처방일수)를 타 기관에 제공하여, 첩약 중복 청구 방지 및 적정 청구 도모\n· 보유 및 이용기간 : 5년" },
      { type: "note", label: "※ 귀하는 위의 민감정보 수집·이용에 대한 동의를 거부할 권리가 있으며, 동의를 거부할 경우 첩약 진료에 제한을 받을 수 있습니다." },
      { type: "radio", key: "agreeSensitive", label: "위와 같이 민감정보 수집·이용에 동의하십니까?", options: ["동의함", "동의하지 않음"], required: true },

      { type: "section", label: "라. 고유식별정보 처리고지사항" },
      { type: "note", label: "개인정보보호법 제15조 제1항 제3호에 따라 정보주체의 동의 없이 개인정보를 처리합니다." },
      { type: "note", label: "· 항목 : 주민등록번호\n· 수집·이용 목적 : 첩약 청구일수 확인을 통한 중복 청구 방지\n· 처리근거 : 국민건강보험법 시행령 제63조" },

      { type: "section", label: "마. 개인정보 제3자 제공에 관한 동의" },
      { type: "note", label: "· 제공받는 기관 : '첩약 등록 및 관리시스템'을 통해 환자의 첩약 관련 진료정보(첩약 처방일수)를 확인하는 의료기관 (타 한의원)\n· 제공 목적 : 첩약 청구일수 확인을 통한 중복 청구 방지\n· 제공 항목 : 성명, 성별, 생년월일, 사고접수번호\n· 보유 및 이용기간 : 5년" },
      { type: "note", label: "※ 귀하는 위의 개인정보 제3자 제공에 대한 동의를 거부할 권리가 있으며, 동의를 거부할 경우 첩약 진료에 제한을 받을 수 있습니다." },
      { type: "radio", key: "agreeThird", label: "위와 같이 개인정보를 제3자에게 제공하는데 동의하십니까?", options: ["동의함", "동의하지 않음"], required: true },

      { type: "section", label: "바. 민감정보 제3자 제공에 관한 동의" },
      { type: "note", label: "· 제공받는 기관 : '첩약 등록 및 관리시스템'을 통해 환자의 첩약 관련 진료정보(첩약 처방일수)를 확인하는 의료기관\n· 제공 목적 : 첩약 청구일수 확인을 통한 중복 청구 방지\n· 제공 항목 : 첩약 진료일수, 투여일수, 첩약 진료정보 삭제여부\n· 보유 및 이용기간 : 5년" },
      { type: "note", label: "※ 귀하는 위의 민감정보 제3자 제공에 대한 동의를 거부할 권리가 있으며, 동의를 거부할 경우 첩약 진료에 제한을 받을 수 있습니다." },
      { type: "radio", key: "agreeThirdSensitive", label: "위와 같이 민감정보를 제3자에게 제공하는데 동의하십니까?", options: ["동의함", "동의하지 않음"], required: true },

      { type: "section", label: "사. 미성년자(만 14세 미만)의 개인정보 수집·제3자 제공 동의여부" },
      { type: "note", label: "· 본인(=환자)은 (          )의 법정대리인으로서 개인정보의 수집·이용·제3자 제공에 관하여 동의하십니까?" },
      { type: "radio", key: "agreeMinor", label: "미성년자 개인정보 수집·이용·제3자 제공에 동의하십니까?", options: ["동의함", "동의하지 않음"] },
      { type: "write", key: "guardianName", label: "법정대리인 성명" },
      { type: "write", key: "guardianPhone", label: "법정대리인 전화번호" },
      { type: "note", label: "※ 법정대리인은 법정대리인을 증명할 수 있는 서류(가족관계증명서, 주민등록등본) 확인 절차 필요" },

      { type: "section", label: "최종 확인" },
      { type: "note", label: "상기 본인은 「개인정보 보호법」 등 관련 법규에 의거하여 개인정보(민감정보, 고유식별정보 포함) 수집·이용·제3자 제공 동의 여부에 관하여 최종적으로 확인하였습니다." },
      { type: "write", key: "relation", label: "환자와의 관계" },
      { type: "signature", key: "sign", label: "성명 (서명 또는 인)", required: true },
    ],
  },

  // -----------------------------------------------------------
  //  [자동차보험/통증] 추나요법 시술 동의서
  // -----------------------------------------------------------
  chuna: {
    id: "chuna",
    name: "추나요법 시술 동의서",
    scale: 0.9,
    fields: [
      { type: "note", label: "담당 한의사로부터 추나요법의 정의, 시술방법과 적응증, 금기증, 부작용, 주의사항 등에 대하여 충분한 설명을 들었습니다." },

      { type: "section", label: "01 추나요법 안내" },
      { type: "note", label: "· 정의 : 한의사가 손 또는 신체의 일부분이나 추나 테이블 등 보조기구를 이용하여 환자의 신체 조직에 유효한 자극을 가해 구조나 기능상의 문제를 치료하는 한방 수기요법입니다." },
      { type: "note", label: "· 시술방법 : 근막이완추나, 정형추나, 신경학적 추나 등 관절·근육 등에 도수적 자극을 가하는 방법으로 시술합니다." },
      { type: "note", label: "· 적응증 : 변위된 관절·인대·근육·근막 등에 광범위하게 적용됩니다." },
      { type: "note", label: "· 금기증 : 골절, 탈구, 중증 골다공증, 종양, 출혈성 질환, 수술 후 감염이 있는 경우, 급성 척수 병증 등이 있는 경우 시술이 제한될 수 있습니다." },
      { type: "note", label: "· 부작용 : 근육의 경미한 통증, 일시적인 통증 증가 등이 나타날 수 있습니다." },
      { type: "note", label: "· 시술 후 주의사항 : 일시적으로 통증을 느낄 수 있으나 대부분 좋아지며, 통증이 다시 발생하면 내원해 주세요. 시술 후 2~3일간은 무리한 활동을 피해 주세요." },

      { type: "section", label: "동의 사항" },
      { type: "note", label: "02. 환자의 증상과 관련하여 담당 한의사와 충분히 상담한 후, 추나요법의 필요성에 대하여 인지하였고 시술에 동의합니다." },
      { type: "note", label: "03. 시술 시 보호자, 간호(조무)사 등의 참여를 요청할 수 있음을 충분히 숙지하였으며, 제3자의 참여 없이 진행하는 추나요법 시술에도 동의합니다." },
      { type: "note", label: "04. 추나요법 시술 과정에서 신체 접촉이나 통증이 수반될 수 있으며, 신체 접촉에 대한 불쾌감이나 과도한 통증을 느낄 경우 즉시 시술 중단을 요청할 수 있음을 충분히 숙지하였고, 중단을 요청하지 않은 경우에는 시술에 동의한 것으로 봅니다." },
      { type: "note", label: "05. 환자 본인은 담당 한의사로부터 충분한 설명을 듣고 추나요법 시술을 받기로 자발적으로 결정하였으며, 일반적으로 예측 불가능한 결과가 발생한 경우 주의의무를 다한 담당 한의사에게 민형사상 기타 법적 책임을 묻지 않겠습니다." },
      { type: "note", label: "06. 건강보험·자동차보험 급여 기준상 정해진 횟수를 초과한 추나요법은 비급여로 진행될 수 있음을 안내받았습니다. (※ 원본 흐림 - 종이 원본과 대조 확인 필요)" },
      { type: "note", label: "07. 개인 부담으로 추나요법을 계속 진행하기 어려운 경우, 기타 비급여 진료 가능 여부를 안내받았습니다. (※ 원본 흐림 - 종이 원본과 대조 확인 필요)" },
      { type: "note", label: "★ 실비 청구 여부는 보험 가입 상태에 따라 상이하므로, 첫 진료 이후 청구 가능 여부를 확인해 주시기 바랍니다." },

      { type: "section", label: "동의" },
      { type: "note", label: "위와 같은 설명을 모두 들었으며, 추나요법 시술에 동의합니다." },
      { type: "radio", key: "agree", label: "추나요법 시술에 동의하십니까?", options: ["동의함", "동의하지 않음"], required: true },
      { type: "write", key: "guardianRelation", label: "환자와의 관계 (보호자 작성 시)" },
      { type: "signature", key: "sign", label: "환자(보호자) 서명", required: true },
    ],
  },

  // -----------------------------------------------------------
  //  [자동차보험] 병원비 지불 확약서
  // -----------------------------------------------------------
  payment: {
    id: "payment",
    name: "병원비 지불 확약서",
    fields: [
      { type: "section", label: "기본 정보" },
      { type: "write", key: "birth", label: "주민등록번호" },
      { type: "write", key: "phone", label: "전화번호" },
      { type: "address", key: "address", label: "주소" },

      { type: "section", label: "확약 내용" },
      { type: "note", label: "본인은 바른시선 한의원에 입원(치료)하기로 결정하였습니다. 따라서 바른시선 한의원 입원 및 치료에 대한 대금 지불과 관련하여 발생한 치료비 및 입원비를 다음과 같이 정산하기로 약속합니다." },
      { type: "note", label: "1. 위 금액을 퇴원일에 반드시 납부한다.\n2. 납부일로부터 정산 없이 퇴원이 불가하며, 미납 시 연체이자(연 10%)를 추가로 납부한다.\n3. 관계 법령에 따라 본인의 각종 서류 발급에 동의한다.\n4. 지급 기일 전이라도 담보가 필요한 경우 본인의 재산을 제공하는 데 동의한다.\n5. 지급 기일까지 납부하지 않을 경우 병원의 법적 조치에 이의를 제기하지 않는다.\n6. 한의원은 환자분이 원할 경우 언제든 치료에 대한 정산 및 내역을 공개한다." },

      { type: "section", label: "확인" },
      { type: "signature", key: "sign", label: "환자 서명", required: true },
    ],
  },

  // -----------------------------------------------------------
  //  [입원] 입원 생활 안내문 (읽기용 · 서약서 포함)
  //  ※ 원본(스캔 p8~11) 구조를 그대로 옮겼습니다. 본문 세부 문장은
  //    스캔이 흐려 최선으로 옮긴 것이므로 종이 원본과 대조 확인 필요.
  // -----------------------------------------------------------
  admission: {
    id: "admission",
    name: "입원 생활 안내문",
    scale: 0.9,
    fields: [
      { type: "note", label: "입원 생활의 원활함과 안전을 위하여 아래 사항을 안내드립니다. 해당되는 항목을 읽으신 뒤, 마지막 서약란에 서명해 주세요. 궁금하신 점은 담당 직원에게 말씀해 주세요." },

      { type: "section", label: "한의원 입원기간" },
      { type: "note", label: "· 교통사고 등 후유증으로 입원하신 경우, 원장님의 진단 후 입원기간이 정해집니다.\n· 입원 중 의료진의 진찰·회진 등을 통해 입원 지속 및 통원치료 전환 여부를 결정합니다." },

      { type: "section", label: "입원기간 중 치료" },
      { type: "note", label: "· 한약은 입원 기간 동안 처방되며, 침구치료 등 하루 정해진 횟수의 치료가 진행됩니다.\n· 정해진 치료 시간을 지키지 않으실 경우 회복에 영향을 줄 수 있습니다.\n· [오전 치료] 오전 10시 ~ 오후 1시   [오후 치료] 오후 2시 ~ 오후 5시" },

      { type: "section", label: "입원기간 중 다양한 진료" },
      { type: "note", label: "· 입원 중 병실에서 받기 어려운 진료는 진료의뢰서를 지참하여 외부 의뢰진료가 가능합니다.\n· 입원 초기 X-ray 촬영 진료의뢰서를 발행해 드립니다.\n· 입원 2일 경과 후에도 증상 호전이 더딜 경우 CT 촬영 진료의뢰서를 발행해 드립니다.\n· 입원 7일 경과 후에도 증상 호전이 더딜 경우 MRI 촬영 진료의뢰서를 발행해 드립니다." },

      { type: "section", label: "입원 시 지참할 개인물품" },
      { type: "note", label: "· 칫솔, 치약, 수건, 로션, 화장품 등은 개인적으로 준비해 주세요.\n· 수건·양말·속옷 등의 세탁은 개별적으로 해결해 주세요.\n· 현금 및 귀중품은 분실 우려가 있으므로 되도록 소지하지 마시고, 부득이한 경우 잠금장치를 이용해 주세요." },

      { type: "section", label: "식사" },
      { type: "note", label: "· 입원기간 동안 1일 3식이 제공되며, 정해진 식사시간 외에는 제공되지 않습니다.\n· 특정 음식에 알러지가 있으신 경우 미리 알려주세요.\n· [아침] 오전 8시 ~ 10시   [점심] 오후 1시 ~ 2시   [저녁] 오후 6시 ~ 7시" },

      { type: "section", label: "취사도구 및 전열기구" },
      { type: "note", label: "· 취사도구 및 전열기구는 화재 위험이 있어 사용이 금지되며, 적발 시 즉시 회수됩니다." },

      { type: "section", label: "생활수칙" },
      { type: "note", label: "· 입원실 내 고성방가 및 소음 등 다른 환자분에게 피해를 주는 행동은 삼가 주세요.\n· 환자 보호와 물품 관리를 위해 입원실·다과실을 제외한 공간에 CCTV가 운영되고 있습니다." },

      { type: "section", label: "야간소음" },
      { type: "note", label: "· 환자분의 편안한 수면을 위하여 밤 11시에 소등하며, 이후 외부 출입을 통제합니다." },

      { type: "section", label: "쓰레기 분리수거" },
      { type: "note", label: "· 생활 쓰레기(휴지·플라스틱·유리병 등)는 분리하여 재활용 쓰레기통에 버려 주세요.\n· 음식물 쓰레기는 개인위생을 위해 정해진 곳에 처리해 주세요." },

      { type: "section", label: "샤워실 사용" },
      { type: "note", label: "· 샤워실 이용 시간은 오전 7시 ~ 오후 10시입니다. 다음 사람을 위해 시간을 지키고 깨끗이 사용해 주세요." },

      { type: "section", label: "낙상 주의" },
      { type: "note", label: "· 취침 시 침대에서 떨어지지 않도록 주의하시고, 샤워실·화장실 바닥은 미끄러우니 주의해 주세요." },

      { type: "section", label: "화재 시 대피요령" },
      { type: "note", label: "· 화재 시 입원실 복도의 소화기를 이용하시고, 안내에 따라 침착하게 대피해 주세요.\n· 화재 시 승강기 탑승을 삼가고 계단을 이용해 대피해 주세요." },

      { type: "section", label: "퇴원 안내" },
      { type: "note", label: "· 퇴원 하루 전날 오후 7시까지 담당 직원에게 요청하시면, 다음 날 원장님 진료 후 오전 중 퇴원하실 수 있습니다." },

      { type: "section", label: "문의처" },
      { type: "note", label: "· 평일·주말/공휴일 주간(오전 10시 ~ 오후 8시) : 한의원 데스크 (☎ 031-918-1275)\n· 야간·응급 상황 : 야간 당직 직원에게 문의해 주세요." },

      { type: "section", label: "입원환자 서약서" },
      { type: "note", label: "본인은 바른시선한의원에 입원하는 동안 병원 내규에 따라 본인의 치료 및 회복을 위해 성실히 임하며 병원의 요구에 협조할 것에 동의합니다. 아래 사항을 위반할 경우 그에 따른 불이익이 있을 수 있음을 인지하고, 이에 대해 병원에 민형사상 문제를 제기하지 않을 것을 서약합니다.\n· 하루 정해진 치료를 지속하지 않거나, 퇴실이 필요하다고 판단될 경우\n· 외출신청 없이 무단으로 외출·외박할 경우\n· 입원실에서 음주를 하거나 지정된 흡연 장소 외에서 흡연할 경우\n· 입원실 내에서 취사도구 및 전열기구를 사용할 경우" },
      { type: "radio", key: "agree", label: "위 입원 생활 안내와 서약 내용을 확인하고 동의하십니까?", options: ["확인·동의함"], required: true },
      { type: "write", key: "guardianRelation", label: "환자와의 관계 (보호자 작성 시)" },
      { type: "signature", key: "sign", label: "환자(보호자) 서명", required: true },
    ],
  },

  // -----------------------------------------------------------
  //  [다이어트] 린다이어트 문진표
  // -----------------------------------------------------------
  dietSurvey: {
    id: "dietSurvey",
    name: "린다이어트 문진표",
    scale: 0.85,
    fields: [
      { type: "section", label: "다이어트 목표와 경험" },
      { type: "write", key: "height", label: "현재 키 (cm)" },
      { type: "write", key: "weight", label: "현재 체중 (kg)" },
      { type: "write", key: "minWeight", label: "성인 이후 최소 체중 (kg)" },
      { type: "write", key: "maxWeight", label: "성인 이후 최대 체중 (kg)" },
      { type: "radio", key: "weightChange", label: "최근 1년간 체중 변화", options: ["급격하게 늘어남", "늘었다 줄었다 반복", "비슷하게 유지"] },
      { type: "checkbox", key: "familyObesity", label: "가족 내 과체중 여부", options: ["해당 없음", "아버지", "어머니", "형제자매"] },
      { type: "checkbox", key: "prevDiet", label: "경험한 다이어트", options: ["해당 없음", "단식", "디톡스", "원푸드", "다이어트 한약", "양약 식욕억제제", "주사", "지방흡입술", "기타"] },
      { type: "writeBig", key: "prevDietHard", label: "이전 다이어트에서 힘들었던 점" },
      { type: "radio", key: "recentDietWhen", label: "가장 최근 다이어트 시점", options: ["2주 내", "2주~1개월 내", "1~3개월 내", "3~6개월 내", "6개월~1년 내"] },
      { type: "write", key: "recentDietResult", label: "해당 다이어트 감량 결과" },

      { type: "section", label: "다이어트 목표" },
      { type: "write", key: "targetWeight", label: "목표 체중 (kg)" },
      { type: "writeBig", key: "reasonLose", label: "살을 빼야만 하는 이유" },
      { type: "radio", key: "dietStyle", label: "선호하는 다이어트 방식", options: ["조금 힘들어도 빠르고 확실한 감량", "조금 오래 걸려도 무리 없이 편안한 감량"] },
      { type: "radio", key: "hasScale", label: "체중계 보유 여부", options: ["있음", "없음"] },

      { type: "section", label: "생활 습관" },
      { type: "write", key: "job", label: "직업" },
      { type: "radio", key: "workTime", label: "근무 시간대", options: ["주간", "야간", "교대/유동적", "해당 없음", "기타"] },
      { type: "radio", key: "exerciseFreq", label: "숨이 찰 정도의 운동 빈도", options: ["주 3회 이상", "주 1~2회", "월 1회", "거의 하지 않음"] },
      { type: "checkbox", key: "exerciseType", label: "자주 하는 운동", options: ["헬스", "요가", "필라테스", "구기종목", "기타"] },

      { type: "section", label: "식습관" },
      { type: "radio", key: "coffee", label: "하루 커피 섭취량", options: ["마시지 않음", "1~2잔", "3잔 이상"] },
      { type: "radio", key: "caffeine", label: "커피 섭취 시 카페인 반응 (1 없음 ~ 5 민감)", options: ["1", "2", "3", "4", "5"] },
      { type: "checkbox", key: "caffeineSymptom", label: "주된 카페인 증상", options: ["두근거림", "답답함", "손 떨림", "어지러움", "두통", "불면", "기타"] },
      { type: "radio", key: "water", label: "하루 물 섭취량 (머그컵 기준)", options: ["7잔 이상", "5~7잔", "3~5잔", "3잔 미만"] },
      { type: "radio", key: "alcohol", label: "술 마시는 빈도", options: ["주 3회 이상", "주 1~2회", "월 1~2회", "거의 마시지 않음"] },
      { type: "radio", key: "breakfastTime", label: "평소 아침 먹는 시간", options: ["오전 7시 전", "오전 7~9시", "오전 9~11시", "오전 11시 후", "먹지 않음", "기타"] },
      { type: "radio", key: "lunchTime", label: "평소 점심 먹는 시간", options: ["오후 12시 전", "오후 12~1시", "오후 1~2시", "오후 2시 후", "먹지 않음", "기타"] },
      { type: "radio", key: "dinnerTime", label: "평소 저녁 먹는 시간", options: ["오후 6시 전", "오후 6~7시", "오후 7~8시", "오후 8시 후", "먹지 않음", "기타"] },
      { type: "checkbox", key: "eatHabit", label: "기타 식사 습관", options: ["해당 없음", "폭식", "과식", "야식", "오래 굶기", "간식 위주 식사", "불규칙한 식사", "기타"] },
      { type: "checkbox", key: "favFood", label: "특별히 자주 먹는 음식", options: ["채소", "과일", "육류(고기)", "밥", "빵류(면·빵)", "튀긴 음식", "기타"] },

      { type: "section", label: "수면 습관" },
      { type: "radio", key: "sleepTime", label: "잠자리에 드는 시간", options: ["밤 10시 이전", "밤 10시~새벽 2시 이전", "새벽 2시 이후", "매일 불규칙적"] },
      { type: "radio", key: "sleepHours", label: "평균 수면 시간", options: ["7시간 이상", "5~7시간", "5시간 미만"] },
      { type: "radio", key: "sleepStateDiet", label: "평소 수면 상황", options: ["잠들기 어려움", "금방 잠 듦"] },
      { type: "checkbox", key: "sleepQuality", label: "평소 수면의 질", options: ["깨지 않고 푹 잠", "자주 뒤척임", "자주 깸"] },
      { type: "checkbox", key: "weightGainFactor", label: "기타 체중 증가 요인", options: ["없음", "있음"] },
      { type: "write", key: "weightGainFactorEtc", label: "기타 체중 증가 요인 (있는 경우)" },

      { type: "section", label: "체질 정보 - 복용 이력" },
      { type: "checkbox", key: "healthFunc", label: "최근 한 달 내 복용한 건강기능식품/영양제", options: ["해당 없음", "가르시니아 캄보지아 추출물", "차 종류(녹차·보이차 등)", "세인트존스워트", "기타"] },
      { type: "checkbox", key: "recentDrug", label: "최근 한 달 내 복용한 약", options: ["해당 없음", "우울증약", "고혈압약", "천식약", "갑상선약", "당뇨약", "두통약", "기타"] },
      { type: "radio", key: "drugStart", label: "약 복용 시작일", options: ["특별히 복용 안 함", "일회성 복용", "최근 한 달간 주기적 복용", "최근 두 달간 주기적 복용"] },
      { type: "radio", key: "drugFreq", label: "약 복용 빈도", options: ["일회성", "일 1~2회", "주 1~2회", "월 1~2회"] },
      { type: "checkbox", key: "diagnosed", label: "질환 진단받은 경험", options: ["해당 없음", "심장질환", "당뇨병", "고혈압", "탈모", "신경정신질환", "간염", "호흡기질환", "아토피", "위장질환", "신장·비뇨기질환", "골다공증", "전립선질환", "갑상선질환", "기타"] },
      { type: "write", key: "diagnosisName", label: "진단명" },
      { type: "radio", key: "cured", label: "완치 여부", options: ["모두 완치", "치료 진행 중"] },
      { type: "radio", key: "surgery5y", label: "최근 5년 내 수술 경험", options: ["없음", "있음"] },
      { type: "write", key: "surgery5yDetail", label: "수술 경험 (있는 경우)" },
      { type: "radio", key: "colonoscopy", label: "대장내시경 경험", options: ["없음", "있음"] },
      { type: "writeBig", key: "colonoscopySide", label: "대장내시경 약 복용 시 불편 증상" },

      { type: "section", label: "체질 정보 - 여성/생활" },
      { type: "radio", key: "birthExp", label: "출산 경험", options: ["없음", "있음"] },
      { type: "write", key: "lastBirthYear", label: "가장 최근 출산 년도" },
      { type: "radio", key: "pregnancy", label: "임신 또는 수유 여부", options: ["해당 없음", "3개월 내 계획 중", "임신 중", "수유 중"] },
      { type: "radio", key: "menstrualCycle", label: "생리 주기", options: ["규칙적", "불규칙적", "일시 중단", "생리 종료"] },
      { type: "radio", key: "menstrualSwelling", label: "생리 후 부종(몸이 붓는 현상)", options: ["특별히 붓지 않음", "자주 붓는 편"] },
      { type: "radio", key: "digestState", label: "평소 소화 상태", options: ["소화 잘 됨", "소화가 잘 안 됨"] },
      { type: "checkbox", key: "digestSymptom", label: "식사 후 소화기 증상", options: ["체함", "더부룩·복부 팽만감", "메스꺼움·구토", "속쓰림·위산 역류", "기타"] },
      { type: "radio", key: "stoolFreq", label: "대변 보는 빈도", options: ["주 1회", "2~3일에 1회", "하루 1~2회", "하루 3회 이상"] },
      { type: "radio", key: "handFootTemp", label: "평소 손발 체감 온도", options: ["차가운 편", "보통", "뜨거운 편"] },
      { type: "radio", key: "sweat", label: "평소 땀의 양", options: ["적은 편", "보통", "많은 편"] },
      { type: "checkbox", key: "concernHealth", label: "그밖에 원장님이 참고해야 할 건강 상태", options: ["해당 없음", "만성 피로", "손발 붓기(부종)", "갱년기 증상", "목/어깨/허리 통증", "팔/다리 저림", "알레르기", "기타"] },
      { type: "checkbox", key: "howKnown", label: "린다이어트는 어떻게 알게 되었나요?", options: ["해당 없음", "유튜브", "인스타그램", "네이버", "구글", "카페/커뮤니티", "원내 포스터·리플릿", "한의원 권유", "지인 소개"] },
      { type: "write", key: "referrerInfo", label: "소개자 정보" },

      { type: "section", label: "확인" },
      { type: "signature", key: "sign", label: "환자 서명", required: true },
    ],
  },
};

// ---- 환자군 정의 (각 환자군에 연결된 서류 목록) ----
const DEFAULT_GROUPS = [
  { id: "pain", name: "통증 초진", formIds: ["privacy", "chojin", "herbCheck", "chuna"] },
  { id: "diet", name: "다이어트 초진", formIds: ["privacy", "chojin", "dietSurvey", "herbCheck"] },
  { id: "car", name: "자동차보험 초진", formIds: ["privacy", "chojin", "jaboSurvey", "jaboConsent", "chuna", "payment", "admission"] },
  { id: "skin", name: "피부관리 초진", formIds: ["privacy", "chojin", "herbCheck"] },
];
