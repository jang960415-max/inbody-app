// =====================================================================
//  🍚 음식 목록 (식단표를 만들 때 여기서 골라요)
//
//  ※ 칼로리와 단백질은 "대략적인 값"이에요.
//    제품, 식당, 양에 따라 꽤 달라질 수 있어요.
//
//  메뉴를 추가하고 싶으면 아래 모양을 그대로 따라 한 덩어리 { ... }, 를 복사해서 고치면 돼요.
//
//  name     : 메뉴 이름
//  items    : 구성 음식 (화면에 목록으로 보여줘요)
//  meals    : 어느 끼니에 쓸지  'breakfast'(아침) 'lunch'(점심) 'dinner'(저녁)
//  source   : 어디서 먹는지     'cook'(직접 요리) 'cafeteria'(구내식당) 'convenience'(편의점) 'eatOut'(외식·배달)
//  kcal     : 칼로리 (대략)
//  protein  : 단백질 g (대략)
//  tags     : 들어간 재료 (못 먹는 음식을 거를 때 써요)
//  contains : 채식 확인용  'meat'(고기) 'fish'(생선·해산물·멸치육수) 'egg'(달걀) 'dairy'(우유·유제품)
// =====================================================================

const MENUS = [

  // ===================== 아침 =====================
  { name: '편의점 삼각김밥 아침', meals: ['breakfast'], source: 'convenience',
    items: ['참치마요 삼각김밥 1개', '삶은 달걀 2개', '흰 우유 200ml'],
    kcal: 480, protein: 23, tags: ['참치', '마요네즈', '김', '달걀', '우유'], contains: ['fish', 'egg', 'dairy'] },

  { name: '편의점 샌드위치 아침', meals: ['breakfast'], source: 'convenience',
    items: ['닭가슴살 샌드위치 1개', '바나나 1개', '아메리카노'],
    kcal: 430, protein: 21, tags: ['빵', '밀가루', '닭고기', '닭가슴살', '마요네즈', '바나나', '커피'], contains: ['meat', 'egg'] },

  { name: '편의점 요거트 아침', meals: ['breakfast'], source: 'convenience',
    items: ['그릭요거트 1개', '바나나 1개', '견과류 1봉'],
    kcal: 360, protein: 16, tags: ['요거트', '유제품', '바나나', '견과류', '땅콩', '아몬드', '호두'], contains: ['dairy'] },

  { name: '편의점 두유·고구마 아침', meals: ['breakfast'], source: 'convenience',
    items: ['군고구마 1개', '두유 1팩', '바나나 1개'],
    kcal: 410, protein: 11, tags: ['고구마', '두유', '콩', '바나나'], contains: [] },

  { name: '오트밀 아침', meals: ['breakfast'], source: 'cook',
    items: ['오트밀 40g', '우유 200ml', '바나나 1개', '삶은 달걀 1개'],
    kcal: 445, protein: 18, tags: ['오트밀', '귀리', '우유', '바나나', '달걀'], contains: ['dairy', 'egg'] },

  { name: '달걀 토스트 아침', meals: ['breakfast'], source: 'cook',
    items: ['통밀빵 2장', '스크램블에그 (달걀 2개)', '우유 200ml'],
    kcal: 510, protein: 26, tags: ['빵', '밀가루', '통밀', '달걀', '우유'], contains: ['egg', 'dairy'] },

  { name: '한식 달걀 아침', meals: ['breakfast'], source: 'cook',
    items: ['현미밥 반 공기', '달걀프라이 2개', '김', '김치'],
    kcal: 360, protein: 17, tags: ['현미', '밥', '달걀', '김', '김치', '젓갈'], contains: ['egg', 'fish'] },

  { name: '두부 스크램블 아침', meals: ['breakfast'], source: 'cook',
    items: ['두부 스크램블 (두부 반 모)', '현미밥 반 공기', '채소볶음'],
    kcal: 400, protein: 18, tags: ['두부', '콩', '현미', '밥', '채소'], contains: [] },

  { name: '샌드위치 가게 아침', meals: ['breakfast'], source: 'eatOut',
    items: ['에그 샌드위치 1개', '아메리카노'],
    kcal: 380, protein: 16, tags: ['빵', '밀가루', '달걀', '마요네즈', '치즈', '커피'], contains: ['egg', 'dairy'] },

  { name: '김밥집 아침', meals: ['breakfast'], source: 'eatOut',
    items: ['야채김밥 1줄', '두유 1팩'],
    kcal: 520, protein: 17, tags: ['김밥', '김', '밥', '단무지', '햄', '달걀', '맛살', '시금치', '두유'], contains: ['meat', 'egg', 'fish'] },

  { name: '구내식당 간편 아침', meals: ['breakfast'], source: 'cafeteria',
    items: ['구내식당 아침 백반 (밥, 국, 반찬 2가지)', '삶은 달걀 1개'],
    kcal: 520, protein: 20, tags: ['밥', '국', '달걀', '김치', '멸치'], contains: ['egg', 'fish'] },

  // ===================== 점심·저녁: 구내식당 =====================
  { name: '구내식당 제육볶음 백반', meals: ['lunch', 'dinner'], source: 'cafeteria',
    items: ['밥 1공기', '제육볶음', '된장국', '나물', '김치'],
    kcal: 750, protein: 32, tags: ['밥', '돼지고기', '된장', '나물', '김치', '고추장', '매운'], contains: ['meat', 'fish'] },

  { name: '구내식당 생선구이 백반', meals: ['lunch', 'dinner'], source: 'cafeteria',
    items: ['밥 1공기', '고등어구이', '미역국', '나물', '김치'],
    kcal: 650, protein: 35, tags: ['밥', '고등어', '생선', '미역', '나물', '김치'], contains: ['fish'] },

  { name: '구내식당 닭볶음탕 백반', meals: ['lunch', 'dinner'], source: 'cafeteria',
    items: ['밥 1공기', '닭볶음탕', '콩나물국', '김치'],
    kcal: 700, protein: 38, tags: ['밥', '닭고기', '감자', '콩나물', '김치', '매운'], contains: ['meat', 'fish'] },

  { name: '구내식당 비빔밥', meals: ['lunch', 'dinner'], source: 'cafeteria',
    items: ['비빔밥 (나물, 달걀프라이)', '된장국'],
    kcal: 650, protein: 20, tags: ['밥', '나물', '달걀', '고추장', '된장', '멸치', '매운'], contains: ['egg', 'fish'] },

  { name: '구내식당 불고기 덮밥', meals: ['lunch', 'dinner'], source: 'cafeteria',
    items: ['불고기 덮밥', '맑은 국', '김치'],
    kcal: 700, protein: 30, tags: ['밥', '소고기', '불고기', '양파', '김치'], contains: ['meat', 'fish'] },

  { name: '구내식당 산채비빔밥 (채식)', meals: ['lunch', 'dinner'], source: 'cafeteria',
    items: ['산채비빔밥 (고기·달걀 빼고)', '두부조림'],
    kcal: 600, protein: 18, tags: ['밥', '나물', '고추장', '두부', '콩', '매운'], contains: [] },

  // ===================== 점심·저녁: 편의점 =====================
  { name: '편의점 샐러드 세트', meals: ['lunch', 'dinner'], source: 'convenience',
    items: ['닭가슴살 샐러드', '삼각김밥 1개', '단백질 음료 1병'],
    kcal: 530, protein: 43, tags: ['닭고기', '닭가슴살', '샐러드', '토마토', '방울토마토', '김', '밥', '우유', '단백질 음료'], contains: ['meat', 'dairy'] },

  { name: '편의점 도시락', meals: ['lunch', 'dinner'], source: 'convenience',
    items: ['제육 도시락 1개', '삶은 달걀 1개'],
    kcal: 825, protein: 31, tags: ['밥', '돼지고기', '소시지', '김치', '달걀', '매운'], contains: ['meat', 'egg', 'fish'] },

  { name: '편의점 닭가슴살 한 끼', meals: ['lunch', 'dinner'], source: 'convenience',
    items: ['즉석밥 작은 공기', '닭가슴살 1팩', '삶은 달걀 2개', '컵 미역국'],
    kcal: 495, protein: 41, tags: ['밥', '닭고기', '닭가슴살', '달걀', '미역'], contains: ['meat', 'egg', 'fish'] },

  { name: '편의점 김밥 한 끼', meals: ['lunch', 'dinner'], source: 'convenience',
    items: ['김밥 1줄', '삶은 달걀 2개'],
    kcal: 600, protein: 24, tags: ['김밥', '김', '밥', '햄', '맛살', '단무지', '달걀'], contains: ['meat', 'egg', 'fish'] },

  { name: '편의점 두부면 샐러드 (채식)', meals: ['lunch', 'dinner'], source: 'convenience',
    items: ['두부면 샐러드', '두유 1팩', '군고구마 1개'],
    kcal: 610, protein: 27, tags: ['두부', '콩', '샐러드', '토마토', '방울토마토', '두유', '고구마'], contains: [] },

  // ===================== 점심·저녁: 직접 요리 =====================
  { name: '닭가슴살 현미밥 정식', meals: ['lunch', 'dinner'], source: 'cook',
    items: ['현미밥 1공기', '닭가슴살 구이 150g', '채소볶음', '김치'],
    kcal: 565, protein: 44, tags: ['현미', '밥', '닭고기', '닭가슴살', '채소', '김치'], contains: ['meat', 'fish'] },

  { name: '연어구이 정식', meals: ['lunch', 'dinner'], source: 'cook',
    items: ['현미밥 1공기', '연어구이 120g', '샐러드'],
    kcal: 610, protein: 33, tags: ['현미', '밥', '연어', '생선', '샐러드', '토마토'], contains: ['fish'] },

  { name: '소고기 고구마 정식', meals: ['lunch', 'dinner'], source: 'cook',
    items: ['소고기 우둔살 구이 150g', '고구마 1개', '샐러드'],
    kcal: 450, protein: 37, tags: ['소고기', '고구마', '샐러드', '토마토'], contains: ['meat'] },

  { name: '돼지 안심 쌈밥', meals: ['lunch', 'dinner'], source: 'cook',
    items: ['돼지 안심 볶음 150g', '현미밥 1공기', '쌈채소'],
    kcal: 530, protein: 40, tags: ['돼지고기', '현미', '밥', '쌈채소', '상추'], contains: ['meat'] },

  { name: '두부부침 정식 (채식)', meals: ['lunch', 'dinner'], source: 'cook',
    items: ['두부부침 1모', '현미밥 1공기', '채소볶음'],
    kcal: 690, protein: 37, tags: ['두부', '콩', '현미', '밥', '채소'], contains: [] },

  { name: '달걀 오믈렛 정식', meals: ['lunch', 'dinner'], source: 'cook',
    items: ['채소 오믈렛 (달걀 3개)', '통밀빵 2장', '샐러드'],
    kcal: 520, protein: 28, tags: ['달걀', '빵', '밀가루', '통밀', '샐러드', '토마토'], contains: ['egg'] },

  { name: '콩 샐러드 현미밥 (채식)', meals: ['lunch', 'dinner'], source: 'cook',
    items: ['렌틸콩·병아리콩 샐러드', '현미밥 1공기'],
    kcal: 660, protein: 24, tags: ['콩', '렌틸콩', '병아리콩', '샐러드', '현미', '밥'], contains: [] },

  // ===================== 점심·저녁: 외식·배달 =====================
  { name: '포케', meals: ['lunch', 'dinner'], source: 'eatOut',
    items: ['연어·참치 포케 (밥 포함)'],
    kcal: 550, protein: 30, tags: ['연어', '참치', '생선', '밥', '채소', '아보카도'], contains: ['fish'] },

  { name: '소고기 쌀국수', meals: ['lunch', 'dinner'], source: 'eatOut',
    items: ['소고기 쌀국수 1그릇'],
    kcal: 500, protein: 25, tags: ['쌀국수', '면', '소고기', '숙주', '국물'], contains: ['meat', 'fish'] },

  { name: '샐러드 가게 한 끼', meals: ['lunch', 'dinner'], source: 'eatOut',
    items: ['닭가슴살 샐러드', '고구마 1개'],
    kcal: 400, protein: 35, tags: ['닭고기', '닭가슴살', '샐러드', '토마토', '고구마'], contains: ['meat'] },

  { name: '돼지국밥', meals: ['lunch', 'dinner'], source: 'eatOut',
    items: ['돼지국밥 1그릇 (밥 포함)', '부추무침'],
    kcal: 700, protein: 35, tags: ['돼지고기', '밥', '부추', '새우젓', '국물'], contains: ['meat', 'fish'] },

  { name: '소고기 샤브샤브', meals: ['lunch', 'dinner'], source: 'eatOut',
    items: ['소고기 샤브샤브 (고기·채소)', '죽 반 그릇'],
    kcal: 600, protein: 40, tags: ['소고기', '채소', '버섯', '죽', '밥', '국물'], contains: ['meat'] },

  { name: '생선구이 정식 (외식)', meals: ['lunch', 'dinner'], source: 'eatOut',
    items: ['생선구이 (고등어 또는 삼치)', '밥 1공기', '된장찌개'],
    kcal: 700, protein: 35, tags: ['고등어', '삼치', '생선', '밥', '된장'], contains: ['fish'] },

  { name: '샌드위치 가게 점심', meals: ['lunch', 'dinner'], source: 'eatOut',
    items: ['치킨 샌드위치 (15cm 정도)', '아메리카노'],
    kcal: 420, protein: 25, tags: ['빵', '밀가루', '닭고기', '치즈', '토마토', '커피'], contains: ['meat', 'dairy'] },

  { name: '닭가슴살 도시락 배달', meals: ['lunch', 'dinner'], source: 'eatOut',
    items: ['닭가슴살 도시락 (현미밥, 채소)'],
    kcal: 500, protein: 40, tags: ['닭고기', '닭가슴살', '현미', '밥', '채소'], contains: ['meat'] },

  { name: '채식 비빔밥 (외식)', meals: ['lunch', 'dinner'], source: 'eatOut',
    items: ['채소 비빔밥 (고기 빼고, 달걀 포함)'],
    kcal: 580, protein: 16, tags: ['밥', '나물', '채소', '달걀', '고추장', '매운'], contains: ['egg'] },

  { name: '두부 요리 식당 (채식)', meals: ['lunch', 'dinner'], source: 'eatOut',
    items: ['두부구이·두부조림 정식 (밥 포함)'],
    kcal: 620, protein: 28, tags: ['두부', '콩', '밥', '간장'], contains: [] }
];


// =====================================================================
//  곁들임·간식 (끼니 칼로리나 단백질이 모자랄 때, 그리고 간식으로 써요)
//  noSnack: true 이면 간식으로는 쓰지 않고 끼니 곁들임으로만 써요
// =====================================================================
const EXTRAS = [
  { name: '삶은 달걀 2개',        kcal: 150, protein: 12, tags: ['달걀'],                         contains: ['egg'] },
  { name: '닭가슴살 1팩 (100g)',  kcal: 120, protein: 23, tags: ['닭고기', '닭가슴살'],            contains: ['meat'] },
  { name: '그릭요거트 1개',       kcal: 100, protein: 9,  tags: ['요거트', '유제품'],              contains: ['dairy'] },
  { name: '흰 우유 200ml',        kcal: 130, protein: 6,  tags: ['우유', '유제품'],                contains: ['dairy'] },
  { name: '단백질 음료 1병',      kcal: 130, protein: 20, tags: ['단백질 음료', '우유', '유제품'], contains: ['dairy'] },
  { name: '두유 1팩',             kcal: 120, protein: 7,  tags: ['두유', '콩'],                    contains: [] },
  { name: '두부 반 모 구이',      kcal: 150, protein: 13, tags: ['두부', '콩'],                    contains: [], noSnack: true },
  { name: '바나나 1개',           kcal: 90,  protein: 1,  tags: ['바나나'],                        contains: [] },
  { name: '사과 1개',             kcal: 100, protein: 0,  tags: ['사과'],                          contains: [] },
  { name: '고구마 1개',           kcal: 190, protein: 2,  tags: ['고구마'],                        contains: [] },
  { name: '견과류 1봉',           kcal: 150, protein: 5,  tags: ['견과류', '땅콩', '아몬드', '호두'], contains: [] },
  { name: '현미밥 반 공기',       kcal: 155, protein: 3,  tags: ['현미', '밥'],                    contains: [], noSnack: true },
  { name: '방울토마토 한 컵',     kcal: 30,  protein: 1,  tags: ['토마토', '방울토마토'],          contains: [] }
];


// =====================================================================
//  📝 식단 요구사항 단어 사전
//  "식단 요구사항" 칸에 적은 문장에서 아래 단어를 찾아서 식단에 반영해요.
//  (문장을 진짜로 이해하는 건 아니고, 정해둔 단어를 찾는 방식이에요)
// =====================================================================

// 묶음 단어: 왼쪽 단어가 나오면 오른쪽 재료(tags)가 들어간 메뉴에 적용해요
// 메뉴의 tags 에 있는 단어(예: 닭가슴살, 연어, 두부)는 따로 적지 않아도 바로 알아들어요.
const REQUEST_GROUPS = {
  '고기':     ['돼지고기', '소고기', '닭고기'],
  '육류':     ['돼지고기', '소고기', '닭고기'],
  '돼지':     ['돼지고기'],
  '닭':       ['닭고기'],
  '치킨':     ['닭고기'],
  '생선':     ['생선', '연어', '고등어', '참치', '삼치'],
  '해산물':   ['생선', '연어', '고등어', '참치', '삼치', '맛살', '새우젓'],
  '매운':     ['매운'],
  '맵':       ['매운'],
  '국물':     ['국물'],
  '국밥':     ['국물'],
  '면':       ['면'],
  '국수':     ['면'],
  '빵':       ['빵'],
  '밀가루':   ['밀가루', '빵'],
  '유제품':   ['유제품', '우유', '요거트', '치즈'],
  '채소':     ['채소', '샐러드', '나물', '쌈채소'],
  '야채':     ['채소', '샐러드', '나물', '쌈채소'],
  '샐러드':   ['샐러드'],
  '탄수화물': ['밥', '빵', '고구마', '면'],
  '밥':       ['밥'],
  '쌀':       ['밥'],
  '콩':       ['콩', '두부', '두유'],
  '과일':     ['바나나', '사과'],
  '커피':     ['커피']
};

// 문장 안에 이런 말이 있으면 → 그 문장 속 음식을 어떻게 다룰지 정해요
const REQUEST_MARKERS = {
  // 빼기 (아예 넣지 않아요)
  avoid:  ['빼', '싫', '안 먹', '안먹', '못 먹', '못먹', '없이', '말고', '제외', '금지', '알레르기', '안 좋', '별로', '않', '안 맵'],
  // 줄이기 (되도록 덜 넣어요)
  reduce: ['줄', '적게', '덜', '가끔', '조금만', '자제'],
  // 늘리기 (더 자주 넣어요) — 아무 말도 없으면 늘리기로 봐요
  prefer: ['좋', '많이', '위주', '자주', '먹고 싶', '먹고싶', '넣어', '추가', '늘려', '주로']
};
