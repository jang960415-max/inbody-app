// =====================================================================
//  🍚 식단표 만들기
//  - 음식 목록은 foods.js, 기준 숫자는 config.js 의 diet 에 있어요.
// =====================================================================

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_NAME = { breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식' };
const SOURCE_NAME = { cook: '직접 요리', cafeteria: '구내식당', convenience: '편의점', eatOut: '외식·배달' };
const DIET_TYPE_NAME = { normal: '일반', vegetarian: '채식', vegan: '완전 채식' };

// 한 달 식단 (날짜별 식단, 날짜별 "다른 식단 보기" 횟수, 지금 고른 날짜)
let monthDiet = null;


// ---------------------------------------------------------------
// 0. 날짜로 정해지는 랜덤 (같은 날짜면 새로고침해도 같은 식단이 나와요)
// ---------------------------------------------------------------
let dietRandom = Math.random;

function seededRandom(text) {
  // 글자를 숫자로 바꾸기
  let seed = 2166136261;
  for (let i = 0; i < text.length; i++) {
    seed ^= text.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  // 그 숫자로 매번 같은 순서의 랜덤 숫자를 만들어요
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 날짜 ↔ 글자 바꾸기: '2026-10-18'
function toDateKey(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
    + '-' + String(date.getDate()).padStart(2, '0');
}
function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
const WEEKDAY_NAME = ['일', '월', '화', '수', '목', '금', '토'];
function dateLabel(key) {
  const date = fromDateKey(key);
  return (date.getMonth() + 1) + '월 ' + date.getDate() + '일 (' + WEEKDAY_NAME[date.getDay()] + ')';
}


// 사용자가 입력한 글자를 화면에 안전하게 보여주기 (<, > 같은 글자 처리)
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}


// ---------------------------------------------------------------
// 0-1. 식단 요구사항 해석하기 (단어 사전은 foods.js 맨 아래)
// ---------------------------------------------------------------
let requestCache = { text: null, result: null };

function parseDietRequest(text) {
  text = (text || '').trim();
  if (requestCache.text === text) return requestCache.result;   // 같은 글이면 다시 계산하지 않아요

  // 메뉴에 들어 있는 재료 이름들 (두 글자 이상)
  const knownTags = new Set();
  MENUS.concat(EXTRAS).forEach(f => f.tags.forEach(t => { if (t.length >= 2) knownTags.add(t); }));

  const result = { prefer: [], reduce: [], avoid: [], unknown: [],
                   preferTags: [], reduceTags: [], avoidTags: [] };

  // 쉼표·마침표·줄바꿈, "그리고", "~고 " 에서 문장을 나눠요
  // 예) "닭가슴살 많이 넣고 빵은 빼줘" → "닭가슴살 많이 넣고" / "빵은 빼줘"
  //    (단, "먹고 싶어"처럼 "고 싶"은 나누지 않아요)
  const phrases = text.split(/[,.\n!?;·]|그리고|(?<=고)\s+(?!싶)/).map(s => s.trim()).filter(s => s);

  phrases.forEach(phrase => {
    // 이 문장에 나온 음식 단어 찾기
    let found = [];
    for (const word in REQUEST_GROUPS) {
      if (phrase.includes(word)) found.push({ word: word, tags: REQUEST_GROUPS[word] });
    }
    knownTags.forEach(tag => {
      if (phrase.includes(tag) && !REQUEST_GROUPS[tag]) found.push({ word: tag, tags: [tag] });
    });
    // "닭"과 "닭가슴살"이 같이 찾아지면 긴 쪽만 남겨요
    found = found.filter(f => !found.some(o => o.word !== f.word && o.word.includes(f.word)));

    if (found.length === 0) {
      result.unknown.push(phrase);
      return;
    }

    // 빼기 > 줄이기 > 늘리기 순서로 확인해요
    let type = 'prefer';
    if (REQUEST_MARKERS.avoid.some(m => phrase.includes(m))) type = 'avoid';
    else if (REQUEST_MARKERS.reduce.some(m => phrase.includes(m))) type = 'reduce';

    found.forEach(f => {
      if (!result[type].includes(f.word)) result[type].push(f.word);
      f.tags.forEach(t => { if (!result[type + 'Tags'].includes(t)) result[type + 'Tags'].push(t); });
    });
  });

  // 같은 재료가 겹치면 빼기 > 줄이기 > 늘리기가 이겨요
  result.reduceTags = result.reduceTags.filter(t => !result.avoidTags.includes(t));
  result.preferTags = result.preferTags.filter(t => !result.avoidTags.includes(t) && !result.reduceTags.includes(t));

  requestCache = { text: text, result: result };
  return result;
}

// 요구사항을 어떻게 이해했는지 글로 보여주기
const REQUEST_WORD_LABEL = { '맵': '매운 음식', '매운': '매운 음식', '국물': '국물 요리', '국밥': '국물 요리' };

function describeRequest(req) {
  // "맵"·"매운"처럼 같은 뜻은 하나로 합쳐서 보여줘요
  const show = words => [...new Set(words.map(w => REQUEST_WORD_LABEL[w] || w))].map(escapeHtml).join(', ');
  const lines = [];
  if (req.prefer.length) lines.push('👍 더 자주 넣기: ' + show(req.prefer));
  if (req.reduce.length) lines.push('🔻 되도록 줄이기: ' + show(req.reduce));
  if (req.avoid.length)  lines.push('🚫 빼기: ' + show(req.avoid));
  if (req.unknown.length) lines.push('❓ 이해하지 못한 부분: "' + req.unknown.map(escapeHtml).join('", "') + '"');
  return lines;
}

function foodHasAnyTag(food, tags) {
  return food.tags.some(t => tags.includes(t));
}


// ---------------------------------------------------------------
// 1. 먹을 수 있는 음식인지 확인 (식단 유형 + 못 먹는 음식 + 요구사항의 "빼기")
// ---------------------------------------------------------------
function isAllowedFood(food, data) {
  if (foodHasAnyTag(food, parseDietRequest(data.dietRequest).avoidTags)) return false;

  // 식단 유형
  const banned = {
    normal:     [],
    vegetarian: ['meat', 'fish'],
    vegan:      ['meat', 'fish', 'egg', 'dairy']
  }[data.dietType] || [];
  if (food.contains.some(c => banned.includes(c))) return false;

  // 못 먹는 음식: 메뉴 이름·구성·재료 중에 그 글자가 들어 있으면 빼요
  const words = [food.name].concat(food.items || [], food.tags);
  for (const avoid of data.avoidFoods) {
    const hit = words.some(w =>
      w.includes(avoid) ||                       // "토마토" → "방울토마토"도 걸러요
      (w.length >= 2 && avoid.includes(w))       // "땅콩버터" → 재료 "땅콩"도 걸러요
    );
    if (hit) return false;
  }
  return true;
}


// ---------------------------------------------------------------
// 2. 끼니별 목표 칼로리·단백질 정하기
// ---------------------------------------------------------------
function mealTargets(data, nutrition) {
  const ratios = CONFIG.diet.mealRatios;
  const chosen = MEAL_ORDER.filter(key => data.meals.includes(key));
  const ratioSum = chosen.reduce((sum, key) => sum + ratios[key], 0);

  return chosen.map(key => ({
    key: key,
    kcal: Math.round(nutrition.target * ratios[key] / ratioSum),
    protein: Math.round(nutrition.proteinG * ratios[key] / ratioSum)
  }));
}


// ---------------------------------------------------------------
// 3. 메인 메뉴 고르기
// ---------------------------------------------------------------
function pickMainMenu(mealKey, target, data, avoidNames) {
  const allowed = MENUS.filter(m => m.meals.includes(mealKey) && isAllowedFood(m, data));
  // 평소 먹는 방식(편의점, 구내식당 등)에 맞는 메뉴를 먼저 찾아요
  const preferred = allowed.filter(m => data.mealSources.includes(m.source));
  const usedFallback = preferred.length === 0;
  const pool = usedFallback ? allowed : preferred;
  if (pool.length === 0) return null;

  // 목표보다 조금 적은 메뉴를 더 좋게 봐요 (모자란 만큼은 곁들임으로 채울 수 있어서)
  // 요구사항의 "더 자주 넣기"는 점수를 좋게, "줄이기"는 나쁘게 해요 (점수가 낮을수록 좋아요)
  const req = parseDietRequest(data.dietRequest);
  const score = m => {
    let s = m.kcal <= target.kcal ? (target.kcal - m.kcal) * 0.6 : (m.kcal - target.kcal) * 1.5;
    if (foodHasAnyTag(m, req.preferTags)) s -= CONFIG.diet.requestPreferBonus;
    if (foodHasAnyTag(m, req.reduceTags)) s += CONFIG.diet.requestReducePenalty;
    return s;
  };
  const sorted = pool.slice().sort((a, b) => score(a) - score(b));

  // 가장 잘 맞는 몇 개 중에서, 방금 보여준 메뉴나 오늘 이미 쓴 메뉴는 되도록 피해서 골라요
  let candidates = sorted.slice(0, CONFIG.diet.candidatePool);
  const fresh = candidates.filter(m => !avoidNames.includes(m.name));
  if (fresh.length > 0) {
    candidates = fresh;
  } else {
    // 상위 몇 개를 다 써버렸으면 범위를 넓혀서라도 새 메뉴를 찾아요
    const others = sorted.filter(m => !avoidNames.includes(m.name));
    if (others.length > 0) candidates = others.slice(0, CONFIG.diet.candidatePool);
  }

  const menu = candidates[Math.floor(dietRandom() * candidates.length)];
  return { menu: menu, usedFallback: usedFallback };
}


// ---------------------------------------------------------------
// 4. 모자란 칼로리·단백질을 곁들임으로 채우기
// ---------------------------------------------------------------
function addExtras(startKcal, startProtein, target, data, maxCount, forSnack, usedExtras) {
  const req = parseDietRequest(data.dietRequest);
  let allowed = EXTRAS.filter(e => isAllowedFood(e, data) && !(forSnack && e.noSnack));
  // 요구사항에서 "줄이기"한 곁들임은 다른 게 있으면 빼요
  const notReduced = allowed.filter(e => !foodHasAnyTag(e, req.reduceTags));
  if (notReduced.length >= 2) allowed = notReduced;
  // 오늘 다른 끼니에서 이미 쓴 곁들임은 되도록 피해요
  const fresh = allowed.filter(e => !usedExtras.includes(e.name));
  const pool = fresh.length >= 2 ? fresh : allowed;
  const picked = [];
  let kcal = startKcal;
  let protein = startProtein;

  while (picked.length < maxCount) {
    const remaining = target.kcal - kcal;
    const needKcal = remaining > CONFIG.diet.extraThreshold;
    const needProtein = target.protein - protein > CONFIG.diet.proteinThreshold;
    if (!needKcal && !needProtein) break;

    // 칼로리가 모자라면 모자란 만큼, 단백질만 모자라면 끼니 목표의 일정 비율까지 넘는 건 괜찮아요
    let maxKcal = remaining + 60;
    if (needProtein) maxKcal = Math.max(maxKcal, target.kcal * (1 + CONFIG.diet.proteinOverKcal) - kcal);
    const options = pool.filter(e => !picked.includes(e) && e.kcal <= maxKcal
      && (needKcal || e.protein >= 5));   // 단백질 때문에 더할 때는 단백질 있는 것만
    if (options.length === 0) break;

    options.sort((a, b) => needProtein
      ? (b.protein - a.protein) || (Math.abs(remaining - a.kcal) - Math.abs(remaining - b.kcal))
      : Math.abs(remaining - a.kcal) - Math.abs(remaining - b.kcal));

    // 가장 잘 맞는 2개 중에서 골라서, 매번 똑같은 곁들임만 나오지 않게 해요
    // 단, 상위 3개 안에 요구사항의 "더 자주 넣기" 음식이 있으면 그걸 골라요
    const preferredTop = options.slice(0, 3).filter(e => foodHasAnyTag(e, req.preferTags));
    const top = preferredTop.length > 0 ? preferredTop : options.slice(0, 2);
    const extra = top[Math.floor(dietRandom() * top.length)];
    picked.push(extra);
    kcal += extra.kcal;
    protein += extra.protein;
  }
  return picked;
}


// ---------------------------------------------------------------
// 5. 하루 식단 만들기
// ---------------------------------------------------------------
function generateDietPlan(data, nutrition, previousPlan) {
  // 최근에 보여준 식단 2개의 메뉴는 되도록 다시 안 나오게 해요
  const previousNames = previousPlan ? previousPlan.recentNames : [];
  const usedToday = [];
  const usedExtras = [];

  const meals = mealTargets(data, nutrition).map(target => {
    let main = null;
    let usedFallback = false;

    if (target.key !== 'snack') {
      const result = pickMainMenu(target.key, target, data, previousNames.concat(usedToday));
      if (result) {
        main = result.menu;
        usedFallback = result.usedFallback;
        usedToday.push(main.name);
      }
    }

    const baseKcal = main ? main.kcal : 0;
    const baseProtein = main ? main.protein : 0;
    const maxCount = target.key === 'snack' ? CONFIG.diet.maxSnackItems : CONFIG.diet.maxExtrasPerMeal;
    const extras = (main || target.key === 'snack')
      ? addExtras(baseKcal, baseProtein, target, data, maxCount, target.key === 'snack', usedExtras)
      : [];
    extras.forEach(e => usedExtras.push(e.name));

    return {
      key: target.key,
      target: target,
      main: main,
      extras: extras,
      usedFallback: usedFallback,
      kcal: baseKcal + extras.reduce((s, e) => s + e.kcal, 0),
      protein: baseProtein + extras.reduce((s, e) => s + e.protein, 0)
    };
  });

  // 이번 식단 메뉴 + 바로 전 식단 메뉴를 기억해둬요 (최근 2번)
  const thisNames = meals.filter(m => m.main).map(m => m.main.name);
  const lastNames = previousPlan ? previousPlan.thisNames : [];

  return {
    meals: meals,
    thisNames: thisNames,
    recentNames: thisNames.concat(lastNames),
    kcal: meals.reduce((s, m) => s + m.kcal, 0),
    protein: meals.reduce((s, m) => s + m.protein, 0)
  };
}


// ---------------------------------------------------------------
// 6. 한 달 식단 한 번에 짜기
// ---------------------------------------------------------------
// "분석하기"를 누른 오늘부터 planDays 일치 날짜 목록
function planDateRange() {
  const today = new Date();
  const keys = [];
  for (let i = 0; i < CONFIG.diet.planDays; i++) {
    keys.push(toDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)));
  }
  return keys;
}

function buildMonthDiet(data, nutrition) {
  const dates = planDateRange();
  const plans = {};
  dates.forEach((key, i) => {
    dietRandom = seededRandom(key + '#0');
    // 최근 며칠 동안 나온 메뉴는 되도록 피해서 짜요
    const recent = dates.slice(Math.max(0, i - CONFIG.diet.avoidRepeatDays), i).map(k => plans[k]);
    plans[key] = generateDietPlan(data, nutrition, {
      recentNames: [].concat(...recent.map(p => p.thisNames)),
      thisNames: recent.length > 0 ? recent[recent.length - 1].thisNames : []
    });
  });
  return { dates: dates, plans: plans, variants: {}, selected: dates[0] };
}

// 고른 날짜의 식단만 다시 짜기 ("다른 식단 보기")
function regenerateDay(key) {
  const { data, nutrition } = latestResult;
  const index = monthDiet.dates.indexOf(key);
  const current = monthDiet.plans[key];
  const before = index > 0 ? monthDiet.plans[monthDiet.dates[index - 1]] : null;
  const after = monthDiet.plans[monthDiet.dates[index + 1]] || null;

  monthDiet.variants[key] = (monthDiet.variants[key] || 0) + 1;
  dietRandom = seededRandom(key + '#' + monthDiet.variants[key]);
  // 지금 메뉴, 전날·다음날 메뉴는 피해서 새로 골라요
  monthDiet.plans[key] = generateDietPlan(data, nutrition, {
    recentNames: current.thisNames.concat(before ? before.thisNames : [], after ? after.thisNames : []),
    thisNames: before ? before.thisNames : []
  });
}


// ---------------------------------------------------------------
// 7. 식단 화면 그리기 (달력 + 고른 날짜의 식단)
// ---------------------------------------------------------------
// isNewAnalysis: true = 방금 "분석하기"를 눌러서 한 달 식단을 새로 짜요
function renderDiet(isNewAnalysis) {
  const box = document.getElementById('diet-result');
  if (!latestResult) {
    box.innerHTML = '<div class="card empty">먼저 <b>입력</b> 탭에서 정보를 넣고 "분석하기"를 눌러주세요.</div>';
    return;
  }
  if (isNewAnalysis || !monthDiet) {
    monthDiet = buildMonthDiet(latestResult.data, latestResult.nutrition);
  }

  box.innerHTML = renderCalendar() + renderDayDiet(monthDiet.selected);

  // 달력 날짜를 누르면 그날 식단을 보여줘요
  box.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
    cell.addEventListener('click', () => {
      monthDiet.selected = cell.dataset.date;
      renderDiet(false);
      document.getElementById('day-diet').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  document.getElementById('other-diet-btn').addEventListener('click', () => {
    regenerateDay(monthDiet.selected);
    renderDiet(false);
    document.getElementById('day-diet').scrollIntoView({ block: 'start' });
  });
}

function renderCalendar() {
  // 식단 기간이 두 달에 걸치면 달력을 달마다 하나씩 그려요
  const first = fromDateKey(monthDiet.dates[0]);
  const last = fromDateKey(monthDiet.dates[monthDiet.dates.length - 1]);
  let grids = '';
  for (let y = first.getFullYear(), m = first.getMonth();
       y < last.getFullYear() || (y === last.getFullYear() && m <= last.getMonth());
       m === 11 ? (y++, m = 0) : m++) {
    grids += '<h3 class="cal-month">' + y + '년 ' + (m + 1) + '월</h3>' + renderMonthGrid(y, m);
  }

  // 기간 요약
  const plans = monthDiet.dates.map(k => monthDiet.plans[k]);
  const avgKcal = Math.round(plans.reduce((s, p) => s + p.kcal, 0) / plans.length);
  const avgProtein = Math.round(plans.reduce((s, p) => s + p.protein, 0) / plans.length);

  return '<div class="card">'
    + '<h2>' + monthDiet.dates.length + '일치 식단</h2>'
    + '<p class="metric-text" style="margin:-6px 0 4px">' + dateLabel(monthDiet.dates[0]) + ' ~ '
    +   dateLabel(monthDiet.dates[monthDiet.dates.length - 1])
    +   ' · 하루 평균 약 ' + avgKcal.toLocaleString() + 'kcal, 단백질 ' + avgProtein + 'g</p>'
    + grids
    + '<p class="footnote" style="margin-top:10px">날짜를 누르면 그날 식단을 볼 수 있어요. 날짜 아래 숫자는 하루 칼로리예요. '
    +   '"분석하기"를 누르면 그날부터 ' + CONFIG.diet.planDays + '일치를 새로 짜요.</p>'
    + '</div>';
}

// 한 달 달력 칸 그리기
function renderMonthGrid(year, month) {
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(new Date());

  const head = WEEKDAY_NAME.map((w, i) =>
    '<div class="cal-head' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '') + '">' + w + '</div>').join('');

  // 칸을 하나씩 모은 뒤, 식단이 있는 주(週)만 보여줘요
  const cellList = [];
  for (let i = 0; i < startWeekday; i++) cellList.push({ html: '<div class="cal-cell blank"></div>', plan: false });

  for (let day = 1; day <= daysInMonth; day++) {
    const key = toDateKey(new Date(year, month, day));
    const plan = monthDiet.plans[key];
    const weekday = new Date(year, month, day).getDay();
    let cls = 'cal-cell';
    if (weekday === 0) cls += ' sun';
    if (weekday === 6) cls += ' sat';
    if (key === todayKey) cls += ' today';

    if (plan) {
      cls += ' has-plan' + (key === monthDiet.selected ? ' selected' : '');
      cellList.push({ plan: true, html: '<button type="button" class="' + cls + '" data-date="' + key + '">'
        + '<span class="cal-day">' + day + '</span>'
        + '<span class="cal-kcal">' + plan.kcal.toLocaleString() + '</span></button>' });
    } else {
      cellList.push({ plan: false, html: '<div class="' + cls + ' no-plan"><span class="cal-day">' + day + '</span></div>' });
    }
  }

  let weeks = '';
  for (let i = 0; i < cellList.length; i += 7) {
    const week = cellList.slice(i, i + 7);
    if (week.some(c => c.plan)) weeks += week.map(c => c.html).join('');
  }
  return '<div class="calendar">' + head + weeks + '</div>';
}

function renderDayDiet(key) {
  const { data, nutrition } = latestResult;
  const plan = monthDiet.plans[key];

  // ----- 하루 합계 -----
  const kcalPercent = Math.round(plan.kcal / nutrition.target * 100);
  const proteinPercent = Math.round(plan.protein / nutrition.proteinG * 100);
  const proteinShort = nutrition.proteinG - plan.protein;

  let conditionText = '식단 유형: ' + DIET_TYPE_NAME[data.dietType]
    + ' · 먹는 방식: ' + data.mealSources.map(s => SOURCE_NAME[s]).join(', ');
  if (data.avoidFoods.length > 0) {
    conditionText += '<br>뺀 음식: ' + data.avoidFoods.map(escapeHtml).join(', ');
  }
  if (data.dietRequest) {
    const reqLines = describeRequest(parseDietRequest(data.dietRequest));
    conditionText += '<br><b>요구사항 반영</b><br>' + reqLines.join('<br>');
  }

  let summaryHtml = '<div class="card" id="day-diet">'
    + '<h2>' + dateLabel(key) + ' 식단 합계</h2>'
    + progressRow('칼로리', plan.kcal.toLocaleString() + ' / ' + nutrition.target.toLocaleString() + 'kcal', kcalPercent, 'macro-carb')
    + progressRow('단백질', plan.protein + ' / ' + nutrition.proteinG + 'g', proteinPercent, 'macro-protein')
    + '<p class="metric-text" style="margin-top:12px">' + conditionText + '</p>';
  if (proteinShort > 15) {
    // 이 사람이 먹을 수 있는 것 중에서 단백질 많은 음식을 추천해요
    const ideas = EXTRAS.filter(e => e.protein >= 7 && isAllowedFood(e, data))
      .sort((a, b) => b.protein - a.protein).slice(0, 3).map(e => e.name);
    summaryHtml += '<div class="notice">단백질이 목표보다 약 ' + proteinShort + 'g 부족해요.'
      + (ideas.length > 0 ? ' ' + ideas.join(', ') + ' 같은 걸 더해보세요.' : '') + '</div>';
  }
  summaryHtml += '<button type="button" class="primary-btn" id="other-diet-btn" style="margin-top:14px">🔄 이날 다른 식단 보기</button>'
    + '</div>';

  // ----- 끼니별 카드 -----
  const mealHtml = plan.meals.map(meal => {
    let html = '<div class="card meal-card">'
      + '<div class="meal-head"><h2>' + MEAL_NAME[meal.key] + '</h2>'
      + '<span class="meal-total">약 ' + meal.kcal.toLocaleString() + 'kcal · 단백질 ' + meal.protein + 'g</span></div>'
      + '<p class="meal-target">목표: 약 ' + meal.target.kcal.toLocaleString() + 'kcal · 단백질 ' + meal.target.protein + 'g</p>';

    if (meal.main) {
      html += '<div class="menu-name">' + meal.main.name
        + ' <span class="source-tag">' + SOURCE_NAME[meal.main.source] + '</span></div>'
        + '<ul class="menu-items">' + meal.main.items.map(i => '<li>' + i + '</li>').join('') + '</ul>'
        + '<p class="menu-sub">약 ' + meal.main.kcal + 'kcal · 단백질 ' + meal.main.protein + 'g</p>';
    } else if (meal.key !== 'snack') {
      html += '<p class="metric-text">조건(식단 유형, 못 먹는 음식)에 맞는 메뉴를 찾지 못했어요. '
        + 'foods.js에 메뉴를 추가하거나 조건을 바꿔보세요.</p>';
    }

    if (meal.extras.length > 0) {
      html += '<div class="extras-title">' + (meal.key === 'snack' ? '간식' : '+ 곁들이면 좋아요') + '</div>'
        + '<ul class="menu-items">' + meal.extras.map(e =>
            '<li>' + e.name + ' <small>' + e.kcal + 'kcal · ' + e.protein + 'g</small></li>').join('') + '</ul>';
    } else if (meal.key === 'snack') {
      html += '<p class="metric-text">조건에 맞는 간식을 찾지 못했어요.</p>';
    }

    if (meal.usedFallback) {
      html += '<div class="notice">고르신 먹는 방식으로는 맞는 메뉴가 없어서 다른 방식의 메뉴를 넣었어요.</div>';
    }
    return html + '</div>';
  }).join('');

  const noteHtml = '<p class="footnote">칼로리와 단백질은 대략적인 값이에요. 제품이나 식당, 양에 따라 달라질 수 있어요. '
    + '메뉴는 foods.js 파일에서 추가하거나 고칠 수 있어요.</p>';

  return summaryHtml + mealHtml + noteHtml;
}

// 목표 대비 막대 (최대 100%까지만 채워요)
function progressRow(name, valueText, percent, colorClass) {
  return '<div class="macro-row">'
    + '<div class="macro-top"><b>' + name + '</b><span>' + valueText + ' (' + percent + '%)</span></div>'
    + '<div class="macro-bar"><div class="' + colorClass + '" style="width:' + Math.min(100, percent) + '%"></div></div>'
    + '</div>';
}
