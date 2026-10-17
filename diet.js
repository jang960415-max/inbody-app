// =====================================================================
//  🍚 식단 기록
//  - 달력에서 날짜를 고르고, 아침·점심·저녁·간식에 먹은 음식을 입력해요.
//  - 음식 영양 정보는 foods.js, 기준 숫자는 config.js 의 diet 에 있어요.
//  - 기록은 이 브라우저 안(localStorage)에만 저장돼요. 서버로 보내지 않아요.
// =====================================================================

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_NAME = { breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식' };
const WEEKDAY_NAME = ['일', '월', '화', '수', '목', '금', '토'];

// 브라우저에 저장할 때 쓰는 이름
const STORAGE_KEYS = {
  log: 'inbodyApp.dietLog',          // 날짜별 먹은 음식
  customFoods: 'inbodyApp.customFoods' // 내가 직접 추가한 음식
};


// ---------------------------------------------------------------
// 1. 저장하기 / 불러오기
//    (개인정보 보호 모드 등에서 저장이 막혀도 앱이 멈추지 않게 try 로 감쌌어요)
// ---------------------------------------------------------------
function loadSaved(key, fallback) {
  try {
    const text = localStorage.getItem(key);
    return text ? JSON.parse(text) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    alert('기록을 저장하지 못했어요. 브라우저 설정에서 저장이 막혀 있을 수 있어요.');
    return false;
  }
}

// 저장된 날짜별 기록: { '2026-10-17': { breakfast: [음식, ...], lunch: [...], ... } }
let dietLog = loadSaved(STORAGE_KEYS.log, {});

// 지금 고른 날짜에서 입력 중인 기록 ("저장" 버튼을 눌러야 dietLog 에 들어가요)
// { key: '2026-10-17', day: { breakfast: [...] ... }, dirty: 저장 안 한 변경이 있는지 }
let draft = null;

function getDraft() {
  const key = dietView.selected;
  if (!draft || draft.key !== key) {
    // 저장된 기록을 복사해서 시작해요 (저장 전까지 원래 기록은 그대로)
    draft = { key: key, day: JSON.parse(JSON.stringify(dietLog[key] || {})), dirty: false };
  }
  return draft;
}
// 내가 추가한 음식: [{ name, serving, kcal, carb, protein, fat }, ...]
let customFoods = loadSaved(STORAGE_KEYS.customFoods, []);


// ---------------------------------------------------------------
// 2. 작은 도우미들
// ---------------------------------------------------------------

// 사용자가 입력한 글자를 화면에 안전하게 보여주기 (<, > 같은 글자 처리)
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 날짜 ↔ 글자: '2026-10-17'
function toDateKey(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
    + '-' + String(date.getDate()).padStart(2, '0');
}
function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function dateLabel(key) {
  const date = fromDateKey(key);
  return (date.getMonth() + 1) + '월 ' + date.getDate() + '일 (' + WEEKDAY_NAME[date.getDay()] + ')';
}

// 소수점 한 자리까지 (예: 12.345 → 12.3)
function round1(n) {
  return Math.round(n * 10) / 10;
}

// 음식 목록 전체 (foods.js + 내가 추가한 음식)
function allFoods() {
  return FOOD_DB.concat(customFoods);
}

// 이름으로 음식 찾기 (띄어쓰기·대소문자 차이는 무시해요)
function findFood(name) {
  const key = name.replace(/\s/g, '').toLowerCase();
  return allFoods().find(f => f.name.replace(/\s/g, '').toLowerCase() === key) || null;
}

// 하루 또는 한 끼의 합계
function sumEntries(entries) {
  return entries.reduce((s, e) => ({
    kcal: s.kcal + e.kcal, carb: s.carb + e.carb, protein: s.protein + e.protein, fat: s.fat + e.fat
  }), { kcal: 0, carb: 0, protein: 0, fat: 0 });
}
// 그날 기록 (고른 날짜는 입력 중인 기록, 다른 날짜는 저장된 기록)
function dayData(key) {
  if (draft && draft.key === key) return draft.day;
  return dietLog[key] || {};
}
function dayEntries(key) {
  const day = dayData(key);
  return MEAL_ORDER.reduce((all, meal) => all.concat(day[meal] || []), []);
}


// ---------------------------------------------------------------
// 3. 화면 상태 (지금 보고 있는 달, 고른 날짜)
// ---------------------------------------------------------------
const todayDate = new Date();
const dietView = {
  year: todayDate.getFullYear(),
  month: todayDate.getMonth(),          // 0 = 1월
  selected: toDateKey(todayDate)        // 처음에는 오늘
};


// ---------------------------------------------------------------
// 4. 식단 화면 그리기 (달력 + 고른 날짜의 기록)
// ---------------------------------------------------------------
function renderDiet() {
  const box = document.getElementById('diet-result');
  if (!latestResult) {
    box.innerHTML = '<div class="card empty">먼저 <b>입력</b> 탭에서 정보를 넣고 "분석하기"를 눌러주세요.<br>'
      + '분석 화면의 하루 권장 칼로리·영양소를 기준으로 식단을 기록해요.</div>';
    return;
  }

  getDraft();   // 고른 날짜의 입력 중 기록 준비
  box.innerHTML = renderCalendar() + renderDayLog(dietView.selected) + renderSaveBar() + renderFoodDatalist();
  attachDietEvents(box);
}

// 음식 이름 자동완성 목록
function renderFoodDatalist() {
  return '<datalist id="food-list">'
    + allFoods().map(f => '<option value="' + escapeHtml(f.name) + '" label="'
      + escapeHtml(f.serving) + ' · ' + f.kcal + 'kcal">').join('')
    + '</datalist>';
}

// ----- 달력 -----
function renderCalendar() {
  const year = dietView.year;
  const month = dietView.month;
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(new Date());

  let cells = WEEKDAY_NAME.map((w, i) =>
    '<div class="cal-head' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '') + '">' + w + '</div>').join('');
  for (let i = 0; i < startWeekday; i++) cells += '<div class="cal-cell blank"></div>';

  for (let day = 1; day <= daysInMonth; day++) {
    const key = toDateKey(new Date(year, month, day));
    const weekday = new Date(year, month, day).getDay();
    const entries = dayEntries(key);
    let cls = 'cal-cell';
    if (weekday === 0) cls += ' sun';
    if (weekday === 6) cls += ' sat';
    if (key === todayKey) cls += ' today';
    if (entries.length > 0) cls += ' has-plan';
    if (key === dietView.selected) cls += ' selected';

    cells += '<button type="button" class="' + cls + '" data-date="' + key + '">'
      + '<span class="cal-day">' + day + '</span>'
      + '<span class="cal-kcal">' + (entries.length > 0 ? Math.round(sumEntries(entries).kcal).toLocaleString() : '') + '</span>'
      + '</button>';
  }

  return '<div class="card">'
    + '<div class="cal-nav">'
    +   '<button type="button" class="cal-nav-btn" data-move="-1" aria-label="이전 달">◀</button>'
    +   '<h2>' + year + '년 ' + (month + 1) + '월 식단 기록</h2>'
    +   '<button type="button" class="cal-nav-btn" data-move="1" aria-label="다음 달">▶</button>'
    + '</div>'
    + '<div class="calendar">' + cells + '</div>'
    + '<p class="footnote" style="margin-top:10px">날짜를 누르면 그날 먹은 음식을 기록할 수 있어요. '
    +   '초록색 날은 기록이 있는 날이고, 숫자는 먹은 칼로리예요.</p>'
    + '</div>';
}

// ----- 고른 날짜의 합계 + 끼니별 기록 -----
function renderDayLog(key) {
  const { nutrition } = latestResult;
  const total = sumEntries(dayEntries(key));
  const kcalPer = CONFIG.kcalPerGram;

  // 권장량 (분석 화면의 하루 권장 칼로리와 영양소)
  const goals = [
    { name: '칼로리',   eaten: total.kcal,    goal: nutrition.target,   unit: 'kcal' },
    { name: '탄수화물', eaten: total.carb,    goal: nutrition.carbG,    unit: 'g' },
    { name: '단백질',   eaten: total.protein, goal: nutrition.proteinG, unit: 'g' },
    { name: '지방',     eaten: total.fat,     goal: nutrition.fatG,     unit: 'g' }
  ];

  const summaryHtml = '<div class="card" id="day-diet">'
    + '<h2>' + dateLabel(key) + ' 먹은 음식 합계</h2>'
    + goals.map(g => progressRow(g)).join('')
    + '<p class="footnote">막대는 분석 화면의 하루 권장량을 몇 % 채웠는지 보여줘요. '
    +   '권장량의 ' + Math.round(CONFIG.diet.goodRange[0] * 100) + '~' + Math.round(CONFIG.diet.goodRange[1] * 100)
    +   '%면 초록색, 모자라면 주황색, 넘으면 빨간색이에요.</p>'
    + '</div>';

  const day = dayData(key);
  const mealHtml = MEAL_ORDER.map(meal => {
    const entries = day[meal] || [];
    const sum = sumEntries(entries);

    const listHtml = entries.length === 0
      ? '<p class="metric-text">아직 기록이 없어요.</p>'
      : '<ul class="log-list">' + entries.map((e, i) =>
          '<li>'
          + '<div class="log-main"><b>' + escapeHtml(e.name) + '</b> '
          +   '<small>' + escapeHtml(e.serving) + ' × ' + e.qty + '</small>'
          +   '<div class="log-nums">' + Math.round(e.kcal) + 'kcal · 탄 ' + round1(e.carb)
          +   'g · 단 ' + round1(e.protein) + 'g · 지 ' + round1(e.fat) + 'g</div></div>'
          + '<button type="button" class="del-btn" data-meal="' + meal + '" data-index="' + i
          +   '" aria-label="삭제">✕</button>'
          + '</li>').join('') + '</ul>';

    return '<div class="card meal-card" data-meal="' + meal + '">'
      + '<div class="meal-head"><h2>' + MEAL_NAME[meal] + '</h2>'
      + '<span class="meal-total">' + Math.round(sum.kcal).toLocaleString() + 'kcal</span></div>'
      + (entries.length > 0
          ? '<p class="meal-target">탄 ' + round1(sum.carb) + 'g · 단 ' + round1(sum.protein) + 'g · 지 ' + round1(sum.fat) + 'g</p>'
          : '')
      + listHtml
      // 음식 입력 줄
      + '<div class="add-row">'
      +   '<input type="text" class="food-name" list="food-list" placeholder="먹은 음식 (예: 현미밥)" enterkeyhint="next">'
      +   '<input type="number" class="food-qty" value="1" min="0.1" step="0.5" inputmode="decimal" aria-label="몇 인분">'
      +   '<button type="button" class="add-btn">추가</button>'
      + '</div>'
      + '<p class="food-hint">음식 이름을 적고, 몇 인분 먹었는지 넣어주세요.</p>'
      // 목록에 없는 음식일 때 직접 입력하는 줄
      + '<div class="manual-row" hidden>'
      +   '<label>칼로리<input type="number" class="m-kcal" inputmode="decimal" placeholder="kcal"></label>'
      +   '<label>탄수화물<input type="number" class="m-carb" inputmode="decimal" placeholder="g"></label>'
      +   '<label>단백질<input type="number" class="m-protein" inputmode="decimal" placeholder="g"></label>'
      +   '<label>지방<input type="number" class="m-fat" inputmode="decimal" placeholder="g"></label>'
      + '</div>'
      + '</div>';
  }).join('');

  const noteHtml = '<p class="footnote">칼로리와 영양소는 대략적인 값이에요. 음식은 foods.js에서 추가하거나 고칠 수 있어요. '
    + '기록은 이 브라우저에만 저장돼요.</p>';

  return summaryHtml + mealHtml + noteHtml;
}

// ----- 맨 아래 저장 버튼 -----
let justSaved = false;   // 방금 저장했는지 (저장 완료 문구를 보여주려고)

function renderSaveBar() {
  const d = getDraft();
  let status;
  if (d.dirty) status = '<p class="save-status unsaved">⚠️ 저장하지 않은 변경이 있어요. 아래 버튼을 눌러 저장해 주세요.</p>';
  else if (justSaved) status = '<p class="save-status saved">✅ 저장했어요.</p>';
  else status = '<p class="save-status">저장된 상태예요.</p>';

  return '<div class="card save-bar">'
    + status
    + '<button type="button" class="primary-btn" id="save-day-btn"' + (d.dirty ? '' : ' disabled') + '>'
    + '💾 ' + dateLabel(d.key) + ' 식단 저장</button>'
    + '</div>';
}

function saveDay() {
  const d = getDraft();
  const hasFood = MEAL_ORDER.some(meal => (d.day[meal] || []).length > 0);
  if (hasFood) dietLog[d.key] = JSON.parse(JSON.stringify(d.day));
  else delete dietLog[d.key];   // 전부 지웠으면 그날 기록도 지워요

  if (saveData(STORAGE_KEYS.log, dietLog)) {
    d.dirty = false;
    justSaved = true;
    renderDiet();
    justSaved = false;
  }
}

// 저장하지 않은 변경이 있을 때 다른 날짜로 가도 되는지 물어봐요
function confirmLeaveDay() {
  if (!draft || !draft.dirty) return true;
  return confirm(dateLabel(draft.key) + ' 식단에 저장하지 않은 변경이 있어요.\n저장하지 않고 이동할까요?');
}

// 저장하지 않고 창을 닫거나 새로고침하면 브라우저가 한 번 물어봐요
window.addEventListener('beforeunload', e => {
  if (draft && draft.dirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// 권장량 대비 막대 (최대 100%까지만 채우고, 색으로 부족/적당/초과를 보여줘요)
function progressRow(g) {
  const percent = g.goal > 0 ? Math.round(g.eaten / g.goal * 100) : 0;
  const [low, high] = CONFIG.diet.goodRange;
  let status = 'low';
  if (percent >= low * 100 && percent <= high * 100) status = 'good';
  else if (percent > high * 100) status = 'over';

  const eatenText = g.unit === 'kcal' ? Math.round(g.eaten).toLocaleString() : round1(g.eaten);
  const goalText = g.unit === 'kcal' ? g.goal.toLocaleString() : g.goal;

  return '<div class="macro-row">'
    + '<div class="macro-top"><b>' + g.name + '</b>'
    + '<span>' + eatenText + ' / ' + goalText + g.unit + ' <b class="pct-' + status + '">(' + percent + '%)</b></span></div>'
    + '<div class="macro-bar"><div class="fill-' + status + '" style="width:' + Math.min(100, percent) + '%"></div></div>'
    + '</div>';
}


// ---------------------------------------------------------------
// 5. 버튼·입력 동작 연결
// ---------------------------------------------------------------
function attachDietEvents(box) {
  // 달력 날짜 누르기
  box.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
    cell.addEventListener('click', () => {
      if (cell.dataset.date === dietView.selected) return;
      if (!confirmLeaveDay()) return;   // 저장 안 한 변경이 있으면 먼저 물어봐요
      draft = null;                     // 저장 안 한 변경은 버려요
      dietView.selected = cell.dataset.date;
      renderDiet();
      document.getElementById('day-diet').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // 이전 달 / 다음 달
  box.querySelectorAll('.cal-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const moved = new Date(dietView.year, dietView.month + Number(btn.dataset.move), 1);
      dietView.year = moved.getFullYear();
      dietView.month = moved.getMonth();
      renderDiet();
    });
  });

  // 기록 지우기 (저장 버튼을 눌러야 실제로 지워져요)
  box.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = getDraft();
      d.day[btn.dataset.meal].splice(Number(btn.dataset.index), 1);
      d.dirty = true;
      renderDiet();
    });
  });

  // 맨 아래 저장 버튼
  document.getElementById('save-day-btn').addEventListener('click', saveDay);

  // 끼니별 입력 줄
  box.querySelectorAll('.meal-card').forEach(card => {
    const meal = card.dataset.meal;
    const nameInput = card.querySelector('.food-name');
    const qtyInput = card.querySelector('.food-qty');
    const hint = card.querySelector('.food-hint');
    const manual = card.querySelector('.manual-row');

    // 음식 이름을 적는 동안 1인분 정보를 보여줘요
    nameInput.addEventListener('input', () => {
      const name = nameInput.value.trim();
      const food = name ? findFood(name) : null;
      manual.hidden = true;
      hint.classList.remove('hint-warn');
      if (!name) {
        hint.textContent = '음식 이름을 적고, 몇 인분 먹었는지 넣어주세요.';
      } else if (food) {
        hint.textContent = food.serving + ' 기준 ' + food.kcal + 'kcal · 탄 ' + food.carb
          + 'g · 단 ' + food.protein + 'g · 지 ' + food.fat + 'g';
      } else {
        hint.textContent = '목록에 있는 이름을 고르거나, 없으면 "추가"를 눌러 직접 입력해요.';
      }
    });

    const add = () => addFood(meal, card);
    card.querySelector('.add-btn').addEventListener('click', add);

    // 엔터: 음식 이름 → 인분 → 추가
    // (한글을 조합하는 중에 누른 엔터는 글자를 완성하는 용도라서 무시해요)
    const isEnter = e => e.key === 'Enter' && !e.isComposing;
    nameInput.addEventListener('keydown', e => {
      if (!isEnter(e)) return;
      e.preventDefault();
      if (findFood(nameInput.value.trim())) qtyInput.focus(); else add();
    });
    qtyInput.addEventListener('keydown', e => { if (isEnter(e)) { e.preventDefault(); add(); } });
    manual.querySelectorAll('input').forEach(input => {
      input.addEventListener('keydown', e => { if (isEnter(e)) { e.preventDefault(); add(); } });
    });
  });
}


// ---------------------------------------------------------------
// 6. 음식 추가하기
// ---------------------------------------------------------------
function addFood(meal, card) {
  const nameInput = card.querySelector('.food-name');
  const qtyInput = card.querySelector('.food-qty');
  const hint = card.querySelector('.food-hint');
  const manual = card.querySelector('.manual-row');

  const name = nameInput.value.trim();
  const qty = Number(qtyInput.value);
  const showHint = text => { hint.textContent = text; hint.classList.add('hint-warn'); };

  if (!name) { showHint('먹은 음식 이름을 적어주세요.'); nameInput.focus(); return; }
  if (!(qty > 0) || qty > CONFIG.diet.maxQty) {
    showHint('몇 인분인지 0보다 크고 ' + CONFIG.diet.maxQty + ' 이하로 넣어주세요.');
    qtyInput.focus();
    return;
  }

  let food = findFood(name);

  // 목록에 없는 음식: 1인분 칼로리·영양소를 직접 받아서 "내가 추가한 음식"으로 기억해요
  if (!food) {
    if (manual.hidden) {
      manual.hidden = false;
      showHint(withJosa('"' + name, '"은', '"는') + ' 목록에 없는 음식이에요. 1인분 칼로리와 영양소를 넣고 다시 "추가"를 눌러주세요. '
        + '(모르는 영양소는 비워두면 0으로 계산해요)');
      manual.querySelector('.m-kcal').focus();
      return;
    }
    const read = cls => {
      const v = manual.querySelector(cls).value.trim();
      return v === '' ? 0 : Number(v);
    };
    const values = { kcal: read('.m-kcal'), carb: read('.m-carb'), protein: read('.m-protein'), fat: read('.m-fat') };
    if (manual.querySelector('.m-kcal').value.trim() === '' || !(values.kcal > 0) || values.kcal > 5000
        || [values.carb, values.protein, values.fat].some(v => isNaN(v) || v < 0 || v > 500)) {
      showHint('칼로리는 1~5000, 영양소는 0~500 사이 숫자로 넣어주세요.');
      manual.querySelector('.m-kcal').focus();
      return;
    }
    food = Object.assign({ name: name, serving: '1인분' }, values);
    customFoods.push(food);
    saveData(STORAGE_KEYS.customFoods, customFoods);
  }

  // 인분만큼 곱해서 기록해요 (나중에 foods.js 숫자를 바꿔도 지난 기록은 그대로예요)
  const entry = {
    name: food.name,
    serving: food.serving,
    qty: qty,
    kcal: food.kcal * qty,
    carb: food.carb * qty,
    protein: food.protein * qty,
    fat: food.fat * qty
  };
  // 입력 중 기록에 넣어요 (맨 아래 "저장" 버튼을 눌러야 저장돼요)
  const d = getDraft();
  if (!d.day[meal]) d.day[meal] = [];
  d.day[meal].push(entry);
  d.dirty = true;

  renderDiet();
  // 같은 끼니에 바로 이어서 입력할 수 있게 커서를 둬요
  document.querySelector('.meal-card[data-meal="' + meal + '"] .food-name').focus();
}
