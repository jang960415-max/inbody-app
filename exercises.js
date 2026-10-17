// =====================================================================
//  ⚾ 투수 운동 목록
//
//  아래 두 자료를 바탕으로 만들었어요.
//   [계획표] 사회인야구 투수 비시즌 주간 운동계획표(예시).pdf  → 요일별 야구 운동 대부분
//   [능력]   투수에게 필요한 운동능력과 훈련법.pdf            → "추가" 표시 운동, 순서·주의사항
//  그리고 남는 운동 시간에는 입력값(목표, 불편한 부위 등)에 맞춘 맨몸 운동을 넣어요.
//
//  ※ 세트·횟수·시간은 일반적인 기준이라 몸 상태에 따라 조절이 필요해요.
//
//  운동 하나의 모양
//  id      : 체크 기록용 이름 (바꾸면 지난 체크 기록과 연결이 끊겨요)
//  name    : 운동 이름
//  sets    : 세트 수 (숫자) — 주차에 따라 자동으로 줄었다 늘었다 해요
//  reps    : 횟수 또는 시간
//  rest    : 쉬는 시간
//  min     : 세트가 없는 운동의 대략적인 시간 (분)
//  needs   : 필요한 장비 (이 중 하나라도 있으면 돼요)
//            'band' 밴드, 'dumbbell' 덤벨, 'kettlebell' 케틀벨, 'rowBar' 인버티드 로우 바,
//            'pullupBar' 철봉, 'wristRoller' 추감기, 'mat' 요가매트
//  alts    : 장비가 없을 때 대신할 운동 (위에서부터 쓸 수 있는 것을 골라요)
//  stress  : 부담이 가는 부위 — 입력에서 "불편한 부위"로 고르면 이 운동은 빼요
//            'neck' 목, 'shoulder' 어깨, 'elbow' 팔꿈치, 'wrist' 손목, 'back' 허리, 'knee' 무릎, 'ankle' 발목
//  key     : true 이면 ★ 핵심 운동 (시간이 모자라면 ★ 운동을 먼저 남겨요)
//  stretch : true 이면 스트레칭 (하루의 마지막에 와요)
//  from    : '능력' 이면 두 번째 자료에서 추가한 운동
// =====================================================================

// 공통 몸풀기 (매 운동 전 10분) — [계획표]
const WARMUP_STEPS = [
  '제자리 가볍게 뛰기 2분',
  '런지 자세에서 팔 뻗어 몸통 돌리기 좌우 5회',
  '오픈북 스트레칭 (옆으로 누워 팔 펼치기) 좌우 8회',
  '밴드 양옆으로 당기기 (풀어파트) 15회',
  '엉덩이 들기 (글루트 브릿지) 15회'
];

// 마무리 스트레칭 (매일 마지막) — [능력] 5. 유연성
const COOLDOWN = {
  id: 'cooldown', name: '마무리 스트레칭', min: 5, stretch: true,
  steps: ['고관절 90/90 스트레칭 좌우 30초', '햄스트링 스트레칭 좌우 30초',
          '크로스바디 어깨 스트레칭 좌우 30초', '종아리 스트레칭 좌우 30초', '천천히 심호흡 1분']
};

// 밴드가 없을 때 쓰는 어깨 바깥 돌리기
const NO_BAND_ER = { name: '옆으로 누워 팔 바깥 돌리기 (500ml 물병)' };

// 투구일 기준 하루하루 할 일 (0 = 투구 당일, 1 = 다음 날 ... 6 = 투구 전날) — [계획표]
// fill: true 인 날은 하루 운동 가능 시간에 맞춰 남는 시간을 맨몸 운동으로 채워요
const PITCHER_SESSIONS = [
  // ----- 0. 투구 당일 -----
  {
    type: 'pitch', title: '투구일', intensity: '높음', minutes: null, level: 'high', fill: false,
    items: [
      { id: 'pitch-warmup', name: '던지기 전 공통 몸풀기 10분', warmup: true },
      { id: 'pitch-band-er', name: '밴드로 팔 바깥 돌리기', reps: '15회', min: 2, needs: ['band'], alts: [NO_BAND_ER] },
      { id: 'pitch-catch', name: '캐치볼 (가까운 거리부터 천천히 늘리기)', min: 15, stress: ['shoulder', 'elbow'] },
      { id: 'pitch-throw', name: '투구', reps: '{pitchCount}구', key: true, stress: ['shoulder', 'elbow'] },
      { id: 'pitch-after-band', name: '던진 후 가벼운 밴드 팔 돌리기', sets: 2, reps: '15회', needs: ['band'], alts: [NO_BAND_ER], fixedSets: true },
      { id: 'pitch-walk', name: '10분 걷기', min: 10 },
      { id: 'pitch-stretch', name: '어깨·등 가볍게 스트레칭', min: 5, stretch: true }
    ],
    tips: ['던진 날은 다른 근력 운동은 하지 않아요. 그래서 이날은 운동 가능 시간을 채우지 않아요.']
  },

  // ----- 1. 다음 날: 회복 -----
  {
    type: 'recovery', title: '회복', intensity: '아주 가볍게', minutes: 30, level: 'low', fill: false,
    items: [
      { id: 'rec-cardio', name: '걷기 또는 가벼운 자전거', reps: '20~30분 (숨이 조금 차는 정도)', min: 25, key: true },
      { id: 'rec-warmup', name: '공통 몸풀기 동작을 천천히 한 번 더', warmup: true },
      { id: 'rec-band', name: '가장 약한 밴드로 팔 바깥/안쪽 돌리기', sets: 2, reps: '15회', needs: ['band'], alts: [NO_BAND_ER], fixedSets: true }
    ],
    tips: ['피를 돌게 하는 정도로만 가볍게 해요.', '잠을 충분히 자고, 단백질을 챙겨 먹어요.']
  },

  // ----- 2. 이틀 뒤: 하체 힘 + 폭발력 (가장 힘든 날) -----
  {
    type: 'lower', title: '하체 힘 + 폭발력', intensity: '높음', minutes: 50, level: 'high', fill: true,
    items: [
      { id: 'warmup', name: '공통 몸풀기 10분', warmup: true },
      { id: 'low-squat-jump', name: '스쿼트 점프', sets: 3, reps: '5회', rest: '1분', key: true, stress: ['knee', 'ankle'] },
      { id: 'low-skater', name: '스케이터 점프 (옆으로 뛰기)', sets: 3, reps: '좌우 5회', rest: '1분', stress: ['knee', 'ankle'] },
      { id: 'low-bulgarian', name: '불가리안 스플릿 스쿼트 (덤벨 2개)', sets: 3, reps: '각 다리 8회', rest: '1분 30초', key: true,
        needs: ['dumbbell', 'kettlebell'], alts: [{ name: '불가리안 스플릿 스쿼트 (맨몸, 3초 천천히 내려가기)' }], stress: ['knee'] },
      { id: 'low-sl-rdl', name: '한 발 루마니안 데드리프트 (덤벨)', sets: 3, reps: '각 다리 8회', rest: '1분', key: true,
        needs: ['dumbbell', 'kettlebell'], alts: [{ name: '한 발 루마니안 데드리프트 (맨몸)' }], stress: ['back'] },
      { id: 'low-sl-bridge', name: '한 발 엉덩이 들기', sets: 3, reps: '각 다리 12회', rest: '45초' },
      { id: 'low-landing', name: '한 발 착지 연습 (점프 후 한 발로 흔들림 없이)', sets: 2, reps: '각 다리 5회', rest: '45초',
        from: '능력', stress: ['knee', 'ankle'] },
      { id: 'low-copenhagen', name: '코펜하겐 플랭크 (무릎 버전)', sets: 3, reps: '각 20초', rest: '45초', stress: ['knee'] },
      { id: 'low-side-plank', name: '사이드 플랭크', sets: 3, reps: '각 30초', rest: '45초', stress: ['shoulder'] }
    ],
    tips: ['점프는 지치기 전에 맨 앞에서 해야 효과가 있어요.',
           '코펜하겐 플랭크는 투수가 다리를 넓게 벌릴 때 잘 다치는 허벅지 안쪽 근육을 길러줘요.']
  },

  // ----- 3. 사흘 뒤: 상체 + 어깨 관리 + 폼 연습 -----
  {
    type: 'upper', title: '상체 + 어깨 관리 + 폼 연습', intensity: '보통', minutes: 45, level: 'mid', fill: true,
    items: [
      { id: 'warmup', name: '공통 몸풀기 10분', warmup: true },
      { id: 'up-inverted-row', name: '인버티드 로우', sets: 3, reps: '10회', rest: '1분', key: true,
        needs: ['rowBar'], alts: [{ name: '밴드 로우 (등으로 당기기)', needs: ['band'] }, { name: '엎드려 팔 당기기 (프론 로우, 맨몸)' }],
        stress: ['shoulder'] },
      { id: 'up-pushup-plus', name: '푸시업 플러스', sets: 3, reps: '10회', rest: '1분', key: true, stress: ['wrist', 'shoulder'] },
      { id: 'up-db-row', name: '덤벨 한 팔 로우', sets: 3, reps: '각 10회', rest: '1분',
        needs: ['dumbbell', 'kettlebell'], alts: [{ name: '밴드 한 팔 로우', needs: ['band'] }], stress: ['back'] },
      { id: 'up-facepull', name: '밴드 페이스풀', sets: 3, reps: '15회', rest: '45초', key: true,
        needs: ['band'], alts: [{ name: '엎드려 팔 W 모양으로 들기 (맨몸)' }] },
      { id: 'up-band-er-ir', name: '밴드 팔 바깥/안쪽 돌리기', sets: 2, reps: '15회', rest: '30초', key: true, needs: ['band'], alts: [NO_BAND_ER] },
      { id: 'up-90-er', name: '90도 자세에서 밴드 돌리기 (투구 팔 각도)', sets: 2, reps: '12회', rest: '30초',
        from: '능력', needs: ['band'], alts: [], stress: ['shoulder'] },
      { id: 'up-ytw', name: 'Y-T-W (맨몸 또는 500ml 물병)', sets: 2, reps: '각 8회', rest: '30초' },
      { id: 'up-wrist-roller', name: '추감기 (리스트 롤러)', sets: 3, reps: '왕복 1번', rest: '1분',
        needs: ['wristRoller'], alts: [{ name: '손목 굽히기/펴기 (가벼운 덤벨)', reps: '각 15회', needs: ['dumbbell'] },
                                        { name: '쌀통에 손 넣고 쥐었다 펴기', reps: '30초' }],
        stress: ['wrist', 'elbow'] },
      { id: 'up-shadow', name: '수건 섀도우 피칭', reps: '20회', min: 5, key: true, stress: ['shoulder', 'elbow'] }
    ],
    tips: ['Y-T-W는 10kg 덤벨 말고 맨손이나 500ml 물병으로 하세요.',
           '섀도우 피칭은 수건 끝을 쥐고 실제 투구처럼 던지며, 힘보다 동작 순서에 집중해요.']
  },

  // ----- 4. 나흘 뒤: 휴식 (스트레칭만) -----
  {
    type: 'rest', title: '휴식 (스트레칭만)', intensity: '쉼', minutes: 15, level: 'rest', fill: false,
    items: [
      { id: 'rest-warmup', name: '공통 몸풀기 동작 (천천히)', warmup: true },
      { id: 'rest-wall-angel', name: '월 엔젤 (벽에 붙어 팔 올리기)', reps: '10회', min: 2, from: '능력', stress: ['shoulder'] },
      { id: 'rest-9090', name: '고관절 스트레칭 (90/90 자세)', reps: '좌우 1분씩', min: 3, stretch: true },
      { id: 'rest-crossbody', name: '크로스바디 어깨 스트레칭', reps: '좌우 30초', min: 2, from: '능력', stretch: true }
    ],
    tips: ['오늘은 쉬는 날이에요. 땀 나는 운동은 하지 않아서 운동 가능 시간을 채우지 않아요.']
  },

  // ----- 5. 닷새 뒤: 몸통 회전 + 전신 + 짧은 질주 -----
  {
    type: 'rotation', title: '몸통 회전 + 전신 + 짧은 질주', intensity: '보통~높음', minutes: 50, level: 'high', fill: true,
    items: [
      { id: 'warmup', name: '공통 몸풀기 10분', warmup: true },
      { id: 'rot-broad-jump', name: '제자리 멀리뛰기', sets: 4, reps: '3회', rest: '1분', key: true, stress: ['knee', 'ankle'] },
      { id: 'rot-agility', name: '신호에 맞춰 방향 바꿔 뛰기', sets: 4, reps: '10초', rest: '1분', from: '능력', stress: ['knee', 'ankle'] },
      { id: 'rot-woodchop', name: '밴드 우드찹 (위→아래 / 아래→위)', sets: 3, reps: '각 10회', rest: '45초', key: true,
        needs: ['band'], alts: [{ name: '덤벨/케틀벨 우드찹 (가볍게)', needs: ['dumbbell', 'kettlebell'] }, { name: '맨몸 우드찹 (빠르게 회전)' }],
        stress: ['back'] },
      { id: 'rot-pallof', name: '팔로프 프레스 (밴드 잡고 버티기)', sets: 3, reps: '각 10초×5회', rest: '45초', key: true,
        needs: ['band'], alts: [{ name: '사이드 플랭크 버티기', reps: '각 20초' }] },
      { id: 'rot-goblet', name: '고블릿 스쿼트 (3초 동안 천천히 내려가기)', sets: 3, reps: '12회', rest: '1분',
        needs: ['dumbbell', 'kettlebell'], alts: [{ name: '맨몸 스쿼트 (3초 동안 천천히 내려가기)' }], stress: ['knee'] },
      { id: 'rot-reverse-lunge', name: '덤벨 뒤로 런지', sets: 3, reps: '각 8회', rest: '1분',
        needs: ['dumbbell', 'kettlebell'], alts: [{ name: '맨몸 뒤로 런지' }], stress: ['knee'] },
      { id: 'rot-deadbug', name: '데드버그', sets: 3, reps: '10회', rest: '45초' },
      { id: 'rot-sprint', name: '짧은 질주 20m', reps: '6~8회', rest: '걸어서 돌아오며 충분히', min: 8, key: true, stress: ['knee', 'ankle'] }
    ],
    tips: ['팔이 아니라 엉덩이부터 돌린다는 느낌으로 해요.',
           '실내라면 질주 대신 제자리 빠르게 무릎 들기 10초×8회로 바꿔도 돼요.']
  },

  // ----- 6. 투구 전날: 가볍게 몸 깨우기 -----
  {
    type: 'prepitch', title: '투구 전날 준비', intensity: '가볍게', minutes: 25, level: 'low', fill: true,
    items: [
      { id: 'pre-warmup', name: '공통 몸풀기 + 고관절·어깨 스트레칭', warmup: true },
      { id: 'pre-band', name: '밴드 팔 돌리기 (깨우는 정도)', sets: 1, reps: '15회', needs: ['band'], alts: [NO_BAND_ER], fixedSets: true },
      { id: 'pre-sprint', name: '10m 질주', reps: '4회', min: 4, stress: ['knee', 'ankle'] },
      { id: 'pre-shadow', name: '섀도우 피칭', reps: '10회', min: 3, key: true, stress: ['shoulder', 'elbow'] }
    ],
    tips: ['무거운 운동, 땀 많이 나는 운동은 하지 않아요. 남는 시간도 가벼운 걷기와 몸 풀기로만 채워요.']
  }
];

// 투구 다음 날이면서 다음 투구 전날일 때 (투구일 사이가 이틀뿐일 때): 회복 + 투구 전날 준비를 가볍게 합쳐요
const RECOVERY_PREPITCH_SESSION = {
  type: 'recovery-prepitch', title: '회복 + 투구 전날 준비', intensity: '가볍게', minutes: 35, level: 'low', fill: false,
  items: [
    { id: 'rp-walk', name: '가볍게 걷기 또는 자전거', reps: '15~20분 (숨이 조금 차는 정도)', min: 18, key: true },
    { id: 'rp-warmup', name: '공통 몸풀기 + 고관절·어깨 스트레칭', warmup: true },
    { id: 'rp-band', name: '가장 약한 밴드로 팔 바깥/안쪽 돌리기', sets: 1, reps: '15회', needs: ['band'], alts: [NO_BAND_ER], fixedSets: true },
    { id: 'rp-shadow', name: '섀도우 피칭 (가볍게)', reps: '10회', min: 3, stress: ['shoulder', 'elbow'] },
    { id: 'rp-stretch', name: '어깨·등·고관절 가볍게 스트레칭', min: 5, stretch: true }
  ],
  tips: ['어제 던졌고 내일 또 던지는 날이라 회복과 준비를 가볍게 합쳤어요. 질주나 땀 나는 운동은 하지 않아요.']
};

// 운동 못 하는 날 (입력에서 고르지 않은 요일)
const OFF_SESSION = {
  type: 'off', title: '운동 안 하는 날', intensity: '쉼', minutes: 0, level: 'rest', fill: false,
  items: [],
  tips: ['입력에서 운동할 수 없는 요일로 골라서 쉬어요.']
};

// 야구 운동 세트 수의 주차별 진행 (5주가 한 바퀴) — [계획표] "난이도 올리는 법과 4주 진행"
const WEEK_PHASES = [
  { label: '1주차 · 익숙해지기', sets: 'max2', tip: '야구 운동을 2세트로 줄여서 익숙해져요.' },
  { label: '2주차 · 익숙해지기', sets: 'max2', tip: '야구 운동을 2세트로 줄여서 익숙해져요.' },
  { label: '3주차 · 표대로',     sets: 'full', tip: '야구 운동을 표에 적힌 세트·횟수대로 해요.' },
  { label: '4주차 · 표대로',     sets: 'full', tip: '야구 운동을 표에 적힌 세트·횟수대로 해요.' },
  { label: '5주차 · 쉬어가기',   sets: 'half', tip: '야구 운동 양을 절반으로 줄여 쉬어가요.' }
];

// 두 바퀴째부터 운동을 조금 더 어렵게 만드는 방법 — [계획표]
const HARDER_TIPS = [
  '내려가는 속도 늦추기: 3~4초 동안 천천히 내려가기',
  '아래에서 멈추기: 가장 낮은 자세에서 2초 멈췄다 올라오기',
  '횟수 늘리기: 8회 → 10회 → 12회',
  '한 다리 / 한 팔 운동으로 바꾸기'
];


// =====================================================================
//  🏃 맨몸 운동 (야구 운동 뒤 남는 시간에 넣어요)
//  easy : 운동 경험이 "처음"일 때 대신 쓰는 쉬운 버전
// =====================================================================
const BODYWEIGHT = {
  // 상체 힘 (머리 위로 드는 운동은 투수 어깨에 부담이 될 수 있어 넣지 않았어요 — [능력])
  upper: [
    { id: 'bw-pushup', name: '푸시업', easy: '무릎 대고 푸시업', reps: '10~15회', stress: ['wrist', 'shoulder'] },
    { id: 'bw-row', name: '인버티드 로우', needs: ['rowBar'], alts: [{ name: '엎드려 팔 당기기 (프론 로우)' }], reps: '10~12회', stress: ['shoulder'] },
    { id: 'bw-superman', name: '슈퍼맨 (엎드려 팔다리 들기)', reps: '12회', stress: ['back'] },
    { id: 'bw-shoulder-tap', name: '플랭크 자세로 어깨 치기', easy: '무릎 대고 어깨 치기', reps: '좌우 10회', stress: ['wrist', 'shoulder'] },
    { id: 'bw-bear', name: '베어 크롤 자세 버티기', reps: '30초', stress: ['wrist'] }
  ],
  // 하체 힘
  lower: [
    { id: 'bw-squat', name: '맨몸 스쿼트 (3초 천천히 내려가기)', reps: '15회', stress: ['knee'] },
    { id: 'bw-rev-lunge', name: '뒤로 런지', reps: '각 다리 10회', stress: ['knee'] },
    { id: 'bw-side-lunge', name: '옆으로 런지 (사이드 런지)', reps: '각 다리 8회', stress: ['knee'] },
    { id: 'bw-stepup', name: '의자 스텝업', reps: '각 다리 10회', stress: ['knee'] },
    { id: 'bw-bridge', name: '글루트 브릿지 (위에서 2초 멈추기)', reps: '15회' },
    { id: 'bw-calf', name: '한 발 종아리 들기', easy: '두 발 종아리 들기', reps: '각 다리 15회', stress: ['ankle'] }
  ],
  // 몸통 (코어)
  core: [
    { id: 'bw-plank', name: '플랭크', reps: '40초' },
    { id: 'bw-side-plank', name: '사이드 플랭크', easy: '무릎 대고 사이드 플랭크', reps: '각 30초', stress: ['shoulder'] },
    { id: 'bw-deadbug', name: '데드버그', reps: '12회' },
    { id: 'bw-birddog', name: '버드독', reps: '각 10회' },
    { id: 'bw-hollow', name: '할로우 홀드', easy: '무릎 굽혀 할로우 홀드', reps: '30초', stress: ['back'] },
    { id: 'bw-bridge-march', name: '브릿지 자세로 다리 번갈아 들기', reps: '좌우 10회' }
  ],
  // 체중 감량 서킷 (40초 운동 + 20초 쉬기)
  cond: [
    { id: 'cd-jack', name: '점핑잭', stress: ['knee', 'ankle'] },
    { id: 'cd-climber', name: '마운틴 클라이머', stress: ['wrist'] },
    { id: 'cd-highknee', name: '제자리 빠르게 무릎 들기', stress: ['knee', 'ankle'] },
    { id: 'cd-squat-thrust', name: '스쿼트 스러스트 (점프 없는 버피)', stress: ['wrist', 'knee'] },
    { id: 'cd-skater-step', name: '스케이터 스텝 (옆으로 크게 걷기)', stress: ['knee'] }
  ],
  // 관절에 부담이 적은 서킷 (하체를 많이 쓴 날, 무릎·발목이 불편할 때)
  condLow: [
    { id: 'cl-march', name: '제자리 무릎 높이 들어 걷기' },
    { id: 'cl-step-jack', name: '점프 없이 팔다리 벌리기 (스텝 잭)' },
    { id: 'cl-bridge', name: '글루트 브릿지' },
    { id: 'cl-deadbug', name: '데드버그' },
    { id: 'cl-plank', name: '플랭크' }
  ],
  // 파워·구속 (맨몸 폭발력) — [능력] 1. 하체 힘과 폭발력, 2. 몸통 회전력
  power: [
    { id: 'pw-broad', name: '제자리 멀리뛰기 (착지 2초 멈춤)', reps: '4회', stress: ['knee', 'ankle'] },
    { id: 'pw-rot-jump', name: '90도 회전 점프 (좌우)', reps: '좌우 4회', stress: ['knee', 'ankle'] },
    { id: 'pw-lateral-bound', name: '투구 방향으로 옆 한 발 바운드', reps: '각 다리 5회', stress: ['knee', 'ankle'] },
    { id: 'pw-rot-throw', name: '수건 잡고 빠르게 몸통 회전 (엉덩이부터)', reps: '좌우 8회', stress: ['back'] }
  ],
  // 가벼운 날 (투구 전날)
  light: [
    { id: 'lt-mobility', name: '고관절·흉추 움직임 (90/90 전환, 오픈북)', reps: '천천히', min: 8 },
    { id: 'lt-calf-foot', name: '발바닥·종아리 풀기', reps: '좌우 1분', min: 3 }
  ]
};
