// =====================================================================
//  🍚 음식 영양 정보 목록 (식단 기록할 때 음식 이름을 고르면 여기서 계산해요)
//
//  ※ 모든 숫자는 "1인분(적힌 양) 기준 대략적인 값"이에요.
//    제품, 식당, 조리법, 양에 따라 꽤 달라질 수 있어요.
//
//  음식을 추가하고 싶으면 한 줄을 복사해서 고치면 돼요.
//  name    : 음식 이름 (입력칸에서 이 이름으로 찾아요)
//  serving : 1인분 기준 양
//  kcal    : 칼로리
//  carb    : 탄수화물 (g)
//  protein : 단백질 (g)
//  fat     : 지방 (g)
//
//  목록에 없는 음식은 식단 화면에서 직접 숫자를 넣으면 "내가 추가한 음식"으로 기억해요.
// =====================================================================

const FOOD_DB = [
  // ----- 밥 -----
  { name: '흰쌀밥',          serving: '1공기 (210g)',   kcal: 313, carb: 69, protein: 5.7, fat: 0.6 },
  { name: '현미밥',          serving: '1공기 (210g)',   kcal: 310, carb: 66, protein: 6.4, fat: 2 },
  { name: '잡곡밥',          serving: '1공기 (210g)',   kcal: 310, carb: 67, protein: 6.5, fat: 1.5 },
  { name: '즉석밥 (작은 공기)', serving: '1개 (130g)',  kcal: 195, carb: 43, protein: 3.5, fat: 0.5 },
  { name: '김밥',            serving: '1줄',            kcal: 450, carb: 70, protein: 13, fat: 12 },
  { name: '삼각김밥',        serving: '1개',            kcal: 200, carb: 38, protein: 5, fat: 3 },
  { name: '비빔밥',          serving: '1그릇',          kcal: 600, carb: 90, protein: 20, fat: 17 },
  { name: '볶음밥',          serving: '1그릇',          kcal: 650, carb: 90, protein: 15, fat: 24 },
  { name: '김치볶음밥',      serving: '1그릇',          kcal: 600, carb: 85, protein: 14, fat: 22 },
  { name: '카레라이스',      serving: '1그릇',          kcal: 650, carb: 100, protein: 15, fat: 20 },
  { name: '제육덮밥',        serving: '1그릇',          kcal: 750, carb: 100, protein: 28, fat: 25 },
  { name: '오므라이스',      serving: '1그릇',          kcal: 650, carb: 95, protein: 18, fat: 22 },
  { name: '편의점 도시락',   serving: '1개',            kcal: 750, carb: 100, protein: 25, fat: 25 },
  { name: '야채죽',          serving: '1그릇',          kcal: 250, carb: 50, protein: 6, fat: 3 },

  // ----- 면 -----
  { name: '라면',            serving: '1개',            kcal: 500, carb: 79, protein: 10, fat: 16 },
  { name: '짜장면',          serving: '1그릇',          kcal: 700, carb: 110, protein: 20, fat: 20 },
  { name: '짬뽕',            serving: '1그릇',          kcal: 650, carb: 90, protein: 25, fat: 20 },
  { name: '칼국수',          serving: '1그릇',          kcal: 550, carb: 95, protein: 18, fat: 8 },
  { name: '물냉면',          serving: '1그릇',          kcal: 550, carb: 105, protein: 18, fat: 5 },
  { name: '쌀국수',          serving: '1그릇',          kcal: 500, carb: 75, protein: 25, fat: 10 },
  { name: '우동',            serving: '1그릇',          kcal: 450, carb: 80, protein: 13, fat: 6 },
  { name: '토마토 스파게티', serving: '1접시',          kcal: 600, carb: 90, protein: 20, fat: 15 },

  // ----- 국·찌개·탕 -----
  { name: '된장찌개',        serving: '1그릇',          kcal: 150, carb: 10, protein: 10, fat: 7 },
  { name: '김치찌개',        serving: '1그릇',          kcal: 200, carb: 10, protein: 14, fat: 11 },
  { name: '순두부찌개',      serving: '1그릇',          kcal: 220, carb: 10, protein: 15, fat: 13 },
  { name: '미역국',          serving: '1그릇',          kcal: 100, carb: 5, protein: 7, fat: 5 },
  { name: '소고기무국',      serving: '1그릇',          kcal: 120, carb: 5, protein: 12, fat: 5 },
  { name: '돼지국밥 (밥 포함)', serving: '1그릇',       kcal: 700, carb: 75, protein: 35, fat: 25 },
  { name: '설렁탕 (밥 포함)', serving: '1그릇',         kcal: 650, carb: 75, protein: 35, fat: 18 },
  { name: '갈비탕 (밥 포함)', serving: '1그릇',         kcal: 750, carb: 75, protein: 40, fat: 30 },

  // ----- 고기·생선·달걀·두부 -----
  { name: '닭가슴살',        serving: '1팩 (100g)',     kcal: 120, carb: 1, protein: 24, fat: 2 },
  { name: '삶은 달걀',       serving: '1개',            kcal: 75, carb: 0.5, protein: 6.3, fat: 5 },
  { name: '달걀프라이',      serving: '1개',            kcal: 90, carb: 0.5, protein: 6.3, fat: 7 },
  { name: '계란말이',        serving: '2조각',          kcal: 120, carb: 1, protein: 8, fat: 9 },
  { name: '두부',            serving: '반 모 (150g)',   kcal: 125, carb: 3, protein: 13, fat: 7 },
  { name: '두부부침',        serving: '반 모 (150g)',   kcal: 180, carb: 4, protein: 13, fat: 12 },
  { name: '고등어구이',      serving: '1토막 (100g)',   kcal: 230, carb: 0, protein: 21, fat: 16 },
  { name: '연어구이',        serving: '100g',           kcal: 200, carb: 0, protein: 22, fat: 12 },
  { name: '제육볶음',        serving: '1인분 (150g)',   kcal: 350, carb: 12, protein: 25, fat: 22 },
  { name: '불고기',          serving: '1인분 (150g)',   kcal: 300, carb: 15, protein: 25, fat: 15 },
  { name: '소고기 구이 (등심)', serving: '100g',        kcal: 250, carb: 0, protein: 25, fat: 17 },
  { name: '삼겹살 구이',     serving: '100g',           kcal: 330, carb: 0, protein: 17, fat: 29 },
  { name: '닭볶음탕',        serving: '1인분',          kcal: 350, carb: 15, protein: 30, fat: 18 },
  { name: '후라이드 치킨',   serving: '1조각 (약 100g)', kcal: 280, carb: 10, protein: 18, fat: 18 },
  { name: '돈가스',          serving: '1인분',          kcal: 600, carb: 45, protein: 25, fat: 35 },

  // ----- 반찬·채소 -----
  { name: '김치',            serving: '1접시 (50g)',    kcal: 15, carb: 2.5, protein: 1, fat: 0.3 },
  { name: '나물무침',        serving: '1접시',          kcal: 50, carb: 5, protein: 2, fat: 3 },
  { name: '멸치볶음',        serving: '1접시 (20g)',    kcal: 80, carb: 6, protein: 7, fat: 3 },
  { name: '샐러드 (드레싱 포함)', serving: '1접시',     kcal: 150, carb: 10, protein: 3, fat: 11 },
  { name: '닭가슴살 샐러드', serving: '1개',            kcal: 200, carb: 10, protein: 20, fat: 9 },
  { name: '쌈채소',          serving: '1접시',          kcal: 20, carb: 3, protein: 1.5, fat: 0.3 },

  // ----- 빵·분식 -----
  { name: '식빵',            serving: '1장',            kcal: 80, carb: 14, protein: 2.6, fat: 1 },
  { name: '통밀빵',          serving: '1장',            kcal: 80, carb: 14, protein: 3.5, fat: 1.2 },
  { name: '샌드위치',        serving: '1개',            kcal: 330, carb: 35, protein: 15, fat: 14 },
  { name: '햄버거',          serving: '1개',            kcal: 500, carb: 45, protein: 25, fat: 25 },
  { name: '떡볶이',          serving: '1인분',          kcal: 450, carb: 90, protein: 9, fat: 6 },
  { name: '피자',            serving: '1조각',          kcal: 280, carb: 30, protein: 12, fat: 12 },
  { name: '오트밀',          serving: '40g',            kcal: 150, carb: 27, protein: 5, fat: 2.8 },
  { name: '시리얼 (우유 포함)', serving: '1그릇',       kcal: 250, carb: 40, protein: 8, fat: 6 },

  // ----- 과일·고구마 -----
  { name: '고구마',          serving: '1개 (150g)',     kcal: 190, carb: 45, protein: 2, fat: 0.3 },
  { name: '감자',            serving: '1개 (150g)',     kcal: 115, carb: 26, protein: 3, fat: 0.2 },
  { name: '바나나',          serving: '1개',            kcal: 90, carb: 23, protein: 1.1, fat: 0.3 },
  { name: '사과',            serving: '1개',            kcal: 100, carb: 27, protein: 0.4, fat: 0.3 },
  { name: '귤',              serving: '1개',            kcal: 40, carb: 10, protein: 0.6, fat: 0.1 },
  { name: '방울토마토',      serving: '10개',           kcal: 30, carb: 6, protein: 1, fat: 0.2 },

  // ----- 유제품·음료·간식 -----
  { name: '흰 우유',         serving: '200ml',          kcal: 130, carb: 10, protein: 6.4, fat: 7.6 },
  { name: '두유',            serving: '1팩 (190ml)',    kcal: 120, carb: 10, protein: 7, fat: 5 },
  { name: '그릭요거트',      serving: '1개 (100g)',     kcal: 100, carb: 6, protein: 9, fat: 4 },
  { name: '단백질 음료',     serving: '1병',            kcal: 130, carb: 8, protein: 20, fat: 2 },
  { name: '프로틴 쉐이크 (물)', serving: '1스쿱',       kcal: 120, carb: 3, protein: 24, fat: 1.5 },
  { name: '견과류',          serving: '1봉 (25g)',      kcal: 150, carb: 5, protein: 5, fat: 13 },
  { name: '아메리카노',      serving: '1잔',            kcal: 10, carb: 2, protein: 0.5, fat: 0 },
  { name: '카페라떼',        serving: '1잔 (톨)',       kcal: 180, carb: 15, protein: 10, fat: 9 },
  { name: '콜라',            serving: '1캔 (250ml)',    kcal: 110, carb: 27, protein: 0, fat: 0 },
  { name: '맥주',            serving: '1캔 (500ml)',    kcal: 210, carb: 17, protein: 2, fat: 0 },
  { name: '소주',            serving: '1병',            kcal: 400, carb: 0, protein: 0, fat: 0 },
  { name: '초콜릿',          serving: '1개 (30g)',      kcal: 160, carb: 17, protein: 2, fat: 9 },
  { name: '과자',            serving: '1봉 (60g)',      kcal: 320, carb: 35, protein: 4, fat: 18 },
  { name: '아이스크림',      serving: '1개',            kcal: 200, carb: 25, protein: 3, fat: 10 }
];
