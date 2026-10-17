// =====================================================================
//  ⚾ 투수 주간 운동표 (월~일) + 했는지 체크 + 구속 목표 계획
//
//  - 운동 목록은 exercises.js, 기준 숫자는 config.js 에 있어요.
//  - 계획표는 "버전"으로 저장해요. 입력값이나 구속 목표가 바뀌면 "오늘부터" 새 버전이 적용되고,
//    지난 날의 계획은 그날 모습 그대로 고정(frozen)해둬서 바뀌지 않아요.
//  - 체크 기록과 계획은 이 브라우저 안(localStorage)에만 저장돼요.
//  - 날짜 도우미(toDateKey 등)와 저장 도우미(loadSaved, saveData)는 diet.js 것을 같이 써요.
// =====================================================================

const WEEK_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const MAIN_SESSIONS = ['lower', 'upper', 'rotation'];   // 빠지면 안 되는 힘 운동 날
const ALL_EQUIPMENT = ['band', 'dumbbell', 'kettlebell', 'rowBar', 'pullupBar', 'wristRoller', 'mat'];
const BODY_NAME = { neck: '목', shoulder: '어깨', elbow: '팔꿈치', wrist: '손목', back: '허리', knee: '무릎', ankle: '발목' };
const LEVEL_CLASS = { high: 'lv-high', mid: 'lv-mid', low: 'lv-low', rest: 'lv-rest' };
const STAGE_NAME = { base: '기초 체력', strength: '힘 기르기', power: '파워·구속', after: '목표 기간 이후 · 유지' };
const EMPHASIS_NAME = { low: '낮음', mid: '보통', high: '높음' };
const BLOCK_NAME = {
  upper: '맨몸 상체 근력', lower: '맨몸 하체 근력', core: '맨몸 코어',
  cond: '맨몸 체중 감량 서킷', condLow: '관절 부담 적은 서킷', power: '맨몸 파워·구속',
  light: '가볍게 걷기·몸 풀기', walk: '빠르게 걷기'
};

// 계획에 영향을 주는 입력값 (이 값들이 바뀌면 "계획표를 바꿀까요?" 하고 물어봐요)
// 공 던지는 요일·공 개수는 여기 없고, 운동 탭에서 주마다 따로 넣어요 (weekPitch)
const PLAN_INPUT_KEYS = ['workoutDays', 'workoutSets', 'minutesPerSet', 'place',
                         'equipment', 'injuries', 'experience', 'weightGoal', 'muscleGoal'];

const WORKOUT_STORAGE = {
  checks:   'inbodyApp.workoutChecks',   // { '2026-10-19': { 'low-squat-jump': true, ... } }
  plan:     'inbodyApp.workoutPlan',     // { start, end, versions: [...], frozen: {...} }
  oldStart: 'inbodyApp.workoutStart'     // 예전 버전에서 쓰던 시작 주 (있으면 이어서 써요)
};

let workoutChecks = loadSaved(WORKOUT_STORAGE.checks, {});
let workoutPlan = loadSaved(WORKOUT_STORAGE.plan, null);
let declinedSettings = null;   // "바꾸지 않을래요"를 고른 입력값 (같은 값으로 또 묻지 않으려고)
let velocityMessage = '';      // 구속 목표 저장 후 보여줄 문구


// ---------------------------------------------------------------
// 1. 날짜 도우미
// ---------------------------------------------------------------
function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return d;
}
function addDays(key, n) {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}
function todayKey() {
  return toDateKey(new Date());
}
function daysBetween(a, b) {
  return Math.round((fromDateKey(b) - fromDateKey(a)) / (24 * 60 * 60 * 1000));
}
function shortDate(key) {
  const d = fromDateKey(key);
  return (d.getMonth() + 1) + '/' + d.getDate();
}

const workoutView = {
  weekStart: toDateKey(mondayOf(new Date())),   // 보고 있는 주의 월요일
  selected: todayKey()                          // 고른 날짜 (처음엔 오늘)
};


// ---------------------------------------------------------------
// 2. 계획 저장 (버전 + 지난 날 고정)
// ---------------------------------------------------------------
function inputSettings(data) {
  const s = {};
  PLAN_INPUT_KEYS.forEach(k => { s[k] = Array.isArray(data[k]) ? data[k].slice().sort() : data[k]; });
  return s;
}
function sameSettings(a, b) {
  // 계획에 영향을 주는 값만 비교해요 (예전 계획에 남아 있는 다른 값은 무시)
  return PLAN_INPUT_KEYS.every(k => JSON.stringify(a[k]) === JSON.stringify(b[k]));
}
function savePlan() {
  saveData(WORKOUT_STORAGE.plan, workoutPlan);
}
function latestVersion() {
  return workoutPlan.versions[workoutPlan.versions.length - 1];
}
// 그 날짜에 적용되는 버전 (그 날짜 이전에 시작한 것 중 가장 최근)
function versionFor(dateKey) {
  let found = workoutPlan.versions[0];
  workoutPlan.versions.forEach(v => { if (v.from <= dateKey) found = v; });
  return found;
}

// 처음 계획 만들기: 이번 주 월요일부터 다음 해 목표 달 말일까지
function createPlan(data) {
  const now = new Date();
  const start = loadSaved(WORKOUT_STORAGE.oldStart, null) || toDateKey(mondayOf(now));
  const end = toDateKey(new Date(now.getFullYear() + 1, CONFIG.velocity.goalMonth, 0));   // 예: 2027-03-31
  workoutPlan = { start: start, end: end, versions: [{ from: start, settings: inputSettings(data), velocity: null }],
                  frozen: {}, weekPitch: {} };
  savePlan();
}


// ---------------------------------------------------------------
// 2-1. 주마다 공 던지는 요일·공 개수
//      { '2026-10-12'(그 주 월요일): { day: 'sun', count: 80 } }
//      그 주에 따로 넣지 않으면 가장 최근에 넣은 주의 값을, 처음에는 config.js 의 기본값을 써요.
// ---------------------------------------------------------------
function weekStartOf(dateKey) {
  return toDateKey(mondayOf(fromDateKey(dateKey)));
}
function defaultPitch() {
  // 예전 버전에서 입력 탭에 넣었던 값이 있으면 그걸 기본값으로 써요
  const old = workoutPlan.versions[0].settings;
  return { day: old.pitchDay || CONFIG.pitcher.defaultDay, count: old.pitchCount || CONFIG.pitcher.defaultCount };
}
function weekPitchFor(weekStart) {
  const map = workoutPlan.weekPitch || {};
  if (map[weekStart]) return Object.assign({ explicit: true, from: weekStart }, map[weekStart]);
  const earlier = Object.keys(map).filter(k => k < weekStart).sort().pop();
  if (earlier) return Object.assign({ explicit: false, from: earlier }, map[earlier]);
  return Object.assign({ explicit: false, from: null }, defaultPitch());
}
function pitchDateOf(weekStart) {
  return addDays(weekStart, WEEK_DAY_KEYS.indexOf(weekPitchFor(weekStart).day));
}

// 그 날짜가 투구일 기준으로 무슨 날인지 — [계획표] "투구 요일이 다를 때"
//  투구 당일 → 다음 날 회복 → 이틀 뒤 하체 → 사흘 뒤 상체 → 나흘 뒤 휴식 → 닷새 뒤 몸통 회전 → 투구 전날 가볍게
//  지난 주 투구일과 이번 주 투구일 사이가 짧거나 길어도 이 순서를 지켜요
const CYCLE_AFTER_PITCH = ['lower', 'upper', 'rest', 'rotation'];
const SESSION_BY_TYPE = {};
PITCHER_SESSIONS.forEach(s => { SESSION_BY_TYPE[s.type] = s; });

function sessionTypeFor(dateKey) {
  const ws = weekStartOf(dateKey);
  let prev = pitchDateOf(ws);
  if (prev > dateKey) prev = pitchDateOf(addDays(ws, -7));   // 이번 주 투구일이 아직이면 지난 주 투구일
  let next = pitchDateOf(ws);
  if (next <= dateKey) next = pitchDateOf(addDays(ws, 7));   // 이번 주 투구일이 지났으면 다음 주 투구일
  if (prev === dateKey) return 'pitch';
  const since = daysBetween(prev, dateKey);
  const until = daysBetween(dateKey, next);
  if (since === 1) return 'recovery';
  if (until === 1) return 'prepitch';
  return CYCLE_AFTER_PITCH[(since - 2) % CYCLE_AFTER_PITCH.length];
}

// 오늘부터 새 버전 적용 (지난 날은 먼저 고정해둬요)
function addVersion(settings, velocity) {
  freezePast();
  const today = todayKey();
  const last = latestVersion();
  if (last.from >= today) {
    last.settings = settings;   // 오늘 이미 바꾼 적이 있으면 그 버전을 고쳐요
    last.velocity = velocity;
  } else {
    workoutPlan.versions.push({ from: today, settings: settings, velocity: velocity });
  }
  savePlan();
}

// 오늘 이전 날짜의 계획을 그대로 굳혀둬요 (나중에 계획이 바뀌어도 지난 날은 그대로)
function freezePast() {
  if (!workoutPlan) return;
  const today = todayKey();
  let changed = false;
  for (let d = workoutPlan.start; d < today; d = addDays(d, 1)) {
    if (!workoutPlan.frozen[d]) {
      workoutPlan.frozen[d] = generateDayPlan(d, versionFor(d));
      changed = true;
    }
  }
  if (changed) savePlan();
}

function getDayPlan(dateKey) {
  if (dateKey < workoutPlan.start) return null;            // 계획 시작 전
  if (workoutPlan.frozen[dateKey]) return workoutPlan.frozen[dateKey];
  return generateDayPlan(dateKey, versionFor(dateKey));
}

// 입력값이 바뀌었는지 확인하고, 바뀌었으면 계획을 바꿀지 물어봐요 (app.js 에서 불러요)
function syncWorkoutPlan(data, ask) {
  if (!workoutPlan) { createPlan(data); return; }
  const now = inputSettings(data);
  const last = latestVersion();
  if (sameSettings(now, last.settings)) { declinedSettings = null; return; }
  if (!ask) return;                                         // 앱을 열 때는 묻지 않고 그대로 둬요
  if (declinedSettings && sameSettings(now, declinedSettings)) return;

  const ok = confirm('입력값이 바뀌었어요.\n운동 계획표도 새 입력값에 맞춰 바꿀까요?\n\n'
    + '· 확인: 오늘부터 새 계획 (지난 날의 계획과 체크 기록은 그대로)\n· 취소: 운동 계획표는 그대로');
  if (ok) {
    addVersion(now, last.velocity);
    declinedSettings = null;
  } else {
    declinedSettings = now;
  }
}


// ---------------------------------------------------------------
// 3. 일주일 틀 만들기 (던지는 요일 기준) — [계획표]
// ---------------------------------------------------------------
function buildWeekSessions(weekStart, s) {
  const notes = [];
  const pitch = weekPitchFor(weekStart);
  const days = WEEK_DAY_KEYS.map((dayKey, i) => ({ dayKey: dayKey, session: SESSION_BY_TYPE[sessionTypeFor(addDays(weekStart, i))] }));
  notes.push('이 주는 공 던지는 날이 <b>' + DAY_NAME[pitch.day] + '요일(' + pitch.count + '구)</b>이라, 다음 날 회복 → 이틀 뒤 하체 → 사흘 뒤 상체 → '
    + '나흘 뒤 휴식 → 닷새 뒤 몸통 회전 → 전날 가볍게 순서로 짰어요. 지난 주 투구일과의 간격도 함께 봐요. [계획표]');

  // 운동 못 하는 요일에 힘 운동 날이 걸리면 "휴식" 날과 바꿔요
  const canWork = dayKey => s.workoutDays.includes(dayKey) || dayKey === pitch.day;
  days.forEach(day => {
    if (canWork(day.dayKey) || !MAIN_SESSIONS.includes(day.session.type)) return;
    const swap = days.find(d => d.session.type === 'rest' && canWork(d.dayKey));
    if (swap) {
      notes.push(DAY_NAME[day.dayKey] + '요일은 운동할 수 없어서 ' + withJosa('"' + day.session.title, '"을', '"를') + ' '
        + DAY_NAME[swap.dayKey] + '요일(원래 휴식)로 옮겼어요.');
      [day.session, swap.session] = [swap.session, day.session];
    }
  });
  days.forEach(day => {
    if (canWork(day.dayKey)) return;
    if (MAIN_SESSIONS.includes(day.session.type)) {
      notes.push(DAY_NAME[day.dayKey] + '요일은 운동할 수 없고 옮길 휴식 날도 없어서 ' + withJosa('"' + day.session.title, '"은', '"는') + ' 쉬어요.');
    }
    day.session = OFF_SESSION;
  });
  return { days: days, notes: notes };
}

// 야구 운동 세트 수의 주차 (5주가 한 바퀴) — [계획표]
function pdfPhase(dateKey, s) {
  const weeks = Math.floor(daysBetween(workoutPlan.start, dateKey) / 7);
  const total = Math.max(0, weeks + (s.experience === 'over6' ? 2 : 0));   // 6개월 이상이면 3주차부터
  return { phase: WEEK_PHASES[total % WEEK_PHASES.length], round: Math.floor(total / WEEK_PHASES.length) + 1 };
}

// 구속 목표 단계 (기초 → 힘 → 파워·구속)
function velocityStage(dateKey, version) {
  const v = version.velocity;
  const V = CONFIG.velocity;
  let gap = null;
  let emphasis = 'mid';
  if (v) {
    gap = Math.max(v.targetAvg - v.avg, v.targetMax - v.max);
    emphasis = gap <= V.gapLevels[0] ? 'low' : gap <= V.gapLevels[1] ? 'mid' : 'high';
  }
  const [s1, s2] = V.phaseSplits[emphasis];
  const f = daysBetween(workoutPlan.start, dateKey) / Math.max(1, daysBetween(workoutPlan.start, workoutPlan.end));
  const stage = f > 1 ? 'after' : f < s1 ? 'base' : f < s2 ? 'strength' : 'power';

  // 이 날의 중간 목표 구속: 목표를 정한 날의 구속에서 목표 구속까지 일정하게 올라가는 선
  let milestone = null;
  if (v) {
    const span = Math.max(1, daysBetween(version.from, workoutPlan.end));
    const t = Math.min(1, Math.max(0, daysBetween(version.from, dateKey) / span));
    milestone = { avg: Math.round((v.avg + (v.targetAvg - v.avg) * t) * 10) / 10,
                  max: Math.round((v.max + (v.targetMax - v.max) * t) * 10) / 10 };
  }
  return { stage: stage, emphasis: emphasis, gap: gap, milestone: milestone, splits: [s1, s2] };
}


// ---------------------------------------------------------------
// 4. 운동 하나를 입력값에 맞게 바꾸기 (장비, 불편한 부위, 주차, 목표)
// ---------------------------------------------------------------
function myEquipment(s) {
  return s.place === 'gym' ? ALL_EQUIPMENT : s.equipment.filter(e => e !== 'none');
}
function myInjuries(s) {
  return s.injuries.filter(i => i !== 'none');
}

function resolveItem(item, session, s, phase) {
  const have = myEquipment(s);
  const injured = myInjuries(s);
  let result = Object.assign({}, item);

  // 장비가 없으면 대체 운동으로
  if (item.needs && !item.needs.some(e => have.includes(e))) {
    const alt = (item.alts || []).find(a => !a.needs || a.needs.some(e => have.includes(e)));
    if (!alt) return Object.assign(result, { removed: '필요한 장비가 없어서 뺐어요' });
    result = Object.assign(result, alt, { replacedFrom: item.name });
  }

  // 불편한 부위에 부담이 가는 운동은 빼요 (투구일의 던지기는 남기고 위에 경고를 보여줘요)
  const hurt = (item.stress || []).filter(b => injured.includes(b));
  if (hurt.length > 0 && session.type !== 'pitch') {
    return Object.assign(result, { removed: withJosa(hurt.map(h => BODY_NAME[h]).join('·'), '이', '가') + ' 불편하다고 하셔서 뺐어요' });
  }

  // 주차에 따라 세트 수 조절
  if (phase && typeof result.sets === 'number' && !result.fixedSets) {
    if (phase.sets === 'max2') result.sets = Math.min(result.sets, 2);
    if (phase.sets === 'half') result.sets = Math.max(1, Math.floor(result.sets / 2));
  }

  if (result.reps) result.reps = result.reps.replace('{pitchCount}', s.pitchCount);

  // 체중을 줄이는 목표면 회복 날 걷기를 조금 늘려요
  if (item.id === 'rec-cardio' && s.weightGoal === 'lose') {
    result.reps = '30~40분 (숨이 조금 차는 정도)';
    result.min = 35;
    result.goalNote = '체중 줄이기 목표라서 10분 늘렸어요';
  }
  return result;
}


// ---------------------------------------------------------------
// 5. 시간 계산 (대략)
// ---------------------------------------------------------------
function parseRest(text) {
  if (!text) return 0.5;
  const m = text.match(/(\d+)분/);
  const sec = text.match(/(\d+)초/);
  if (!m && !sec) return 1;
  return (m ? Number(m[1]) : 0) + (sec ? Number(sec[1]) / 60 : 0);
}
function estItem(item) {
  const T = CONFIG.workoutTime;
  if (item.removed) return 0;
  if (item.warmup) return item.short ? T.shortWarmup : T.warmup;
  if (typeof item.sets === 'number' && !item.min) {
    const both = /각|좌우/.test(item.reps || '') ? 2 : 1;
    return item.sets * (T.workPerSet * both + parseRest(item.rest));
  }
  return item.min || 0;
}
function estItems(items) {
  return items.reduce((s, i) => s + estItem(i), 0);
}

// 야구 운동을 주어진 시간 안에 맞추기: ★ 핵심 운동을 먼저 남기고, 남는 시간에 나머지를 넣어요
function fitBaseball(items, limit) {
  if (estItems(items) <= limit) return items;
  const list = items.map(i => Object.assign({}, i));
  const warm = list.find(i => i.warmup);
  if (warm && limit < 30) { warm.short = true; warm.name = '짧은 몸풀기 5분 (공통 몸풀기를 빠르게)'; }

  // ★ 핵심 + 몸풀기만 남긴 뒤, 나머지를 순서대로 들어가는 만큼 넣어요
  const keep = new Set(list.filter(i => i.warmup || (i.key && !i.removed)));
  let used = estItems([...keep]);
  list.forEach(i => {
    if (keep.has(i) || i.removed) return;
    if (used + estItem(i) <= limit) { keep.add(i); used += estItem(i); }
  });
  // 그래도 넘치면 ★ 운동의 세트를 하나씩 줄여요
  let guard = 50;
  while (used > limit && guard-- > 0) {
    const big = [...keep].filter(i => typeof i.sets === 'number' && i.sets > 1 && !i.warmup)
      .sort((a, b) => b.sets - a.sets)[0];
    if (!big) break;
    big.sets -= 1;
    used = estItems([...keep]);
  }
  return list.map(i => (keep.has(i) || i.removed) ? i : Object.assign(i, { removed: '운동 시간이 짧아서 뺐어요' }));
}


// ---------------------------------------------------------------
// 6. 남는 시간을 채우는 맨몸 운동 묶음 — 입력값(목표, 불편한 부위, 경험)과 구속 단계를 반영해요
// ---------------------------------------------------------------
function chooseBlockKinds(type, s, vel, count) {
  if (count <= 0) return [];
  if (type === 'prepitch') return Array(count).fill('light');   // 투구 전날은 가볍게만

  const injured = myInjuries(s);
  const legsHurt = injured.includes('knee') || injured.includes('ankle');
  let list = { lower: ['upper', 'core', 'cond'], upper: ['lower', 'cond', 'core'], rotation: ['cond', 'upper', 'lower'] }[type].slice();

  const moveTo = (kind, index) => {
    const at = list.indexOf(kind);
    if (at >= 0) { list.splice(at, 1); list.splice(index, 0, kind); }
  };
  const strengthKind = list.find(k => k === 'upper' || k === 'lower');
  if (s.weightGoal === 'lose') moveTo('cond', 0);                        // 체중 줄이기 → 서킷 먼저
  if (s.muscleGoal === 'gain') moveTo(strengthKind, s.weightGoal === 'lose' ? 1 : 0);   // 근육 늘리기 → 근력

  // 구속 목표: 파워·구속 단계에는 몸통 회전 날·상체 날 맨 앞에 파워 운동을 넣어요
  const powerDay = type === 'rotation' || type === 'upper' || (vel.emphasis === 'high' && type === 'lower');
  if (!legsHurt && ((vel.stage === 'power' && powerDay) || (vel.emphasis === 'high' && vel.stage === 'strength' && type === 'rotation'))) {
    list.unshift('power');
  }

  // 하체를 많이 쓴 날이나 무릎·발목이 불편하면 관절 부담 적은 서킷으로
  list = list.map(k => (k === 'cond' && (type === 'lower' || legsHurt)) ? 'condLow' : k);
  while (list.length < count) list.push(list.length % 2 ? 'walk' : (legsHurt ? 'condLow' : 'cond'));
  return list.slice(0, count);
}

function bodyweightPool(kind, s) {
  const injured = myInjuries(s);
  const have = myEquipment(s);
  return (BODYWEIGHT[kind] || [])
    .filter(e => !(e.stress || []).some(b => injured.includes(b)))
    .map(e => {
      let r = Object.assign({}, e);
      if (e.needs && !e.needs.some(x => have.includes(x))) r = Object.assign(r, e.alts[0], { replacedFrom: e.name });
      if (s.experience === 'none' && e.easy) r.name = e.easy;   // 처음이면 쉬운 버전
      return r;
    });
}

function walkItem(id, minutes, s) {
  return { id: id, name: s.weightGoal === 'lose' ? '빠르게 걷기 (숨이 조금 차는 정도)' : '가볍게 걷기', min: Math.round(minutes) };
}

// 묶음 하나 만들기 (minutes 분 안에 맞춰요)
function buildBlock(kind, minutes, s, vel, dateKey, prefix) {
  const T = CONFIG.workoutTime;
  const items = [];
  const dayNum = daysBetween('2000-01-01', dateKey);   // 날마다 운동 순서를 조금씩 바꾸려고
  const rotate = (arr, n) => arr.length ? arr.map((_, i) => arr[(i + n) % arr.length]) : arr;
  let used = 0;

  if (kind === 'upper' || kind === 'lower' || kind === 'core') {
    const pool = rotate(bodyweightPool(kind, s), dayNum);
    const sets = vel.stage === 'strength' ? 4 : 3;
    const count = Math.min(pool.length, Math.max(1, Math.floor(minutes / T.strengthPerExercise)), 6);
    pool.slice(0, count).forEach(e => {
      items.push(Object.assign({}, e, { id: prefix + e.id, sets: sets, rest: '45초', min: T.strengthPerExercise,
        tempo: vel.stage === 'strength' ? '힘 기르기 단계: 3초 천천히 내려가고 아래에서 1초 멈추기' : '' }));
      used += T.strengthPerExercise;
    });
  } else if (kind === 'cond' || kind === 'condLow') {
    let pool = bodyweightPool(kind, s);
    if (pool.length < 3) pool = bodyweightPool('condLow', s);
    const rounds = Math.max(1, Math.min(T.maxCircuitRounds, Math.floor(minutes * 0.6 / T.circuitRound)));
    items.push({ id: prefix + 'circuit', name: '맨몸 서킷 ' + rounds + '바퀴', reps: '동작마다 40초 운동 + 20초 쉬기',
      min: rounds * T.circuitRound, steps: pool.slice(0, 5).map(e => e.name), key: true });
    used += rounds * T.circuitRound;
  } else if (kind === 'power') {
    const pool = rotate(bodyweightPool('power', s), dayNum);
    const sets = vel.emphasis === 'high' ? 4 : 3;
    const count = Math.min(pool.length, Math.max(1, Math.floor(Math.min(minutes, T.powerMinutes) / 4)));
    pool.slice(0, count).forEach(e => {
      items.push(Object.assign({}, e, { id: prefix + e.id, sets: sets, rest: '1분 (충분히 쉬기)', min: 4, key: true,
        tempo: '매번 전력으로! 지쳐서 느려지면 그만해요' }));
      used += 4;
    });
  } else if (kind === 'light') {
    bodyweightPool('light', s).forEach(e => {
      if (used + e.min <= minutes) { items.push(Object.assign({}, e, { id: prefix + e.id })); used += e.min; }
    });
  }

  // 남는 시간은 걷기로 채워요 (투구 전날·가벼운 날은 가볍게)
  const left = minutes - used;
  if (left >= 3 || items.length === 0) {
    const w = walkItem(prefix + 'walk', Math.max(left, 1), kind === 'light' ? Object.assign({}, s, { weightGoal: 'keep' }) : s);
    items.push(w);
  }
  return items;
}


// ---------------------------------------------------------------
// 7. 하루 계획 만들기
// ---------------------------------------------------------------
function generateDayPlan(dateKey, version) {
  const weekStart = weekStartOf(dateKey);
  // 이 주에 넣은 공 개수를 같이 써요
  const s = Object.assign({}, version.settings, { pitchCount: weekPitchFor(weekStart).count });
  const week = buildWeekSessions(weekStart, s);
  const dayIndex = (fromDateKey(dateKey).getDay() + 6) % 7;
  const session = week.days[dayIndex].session;
  const pp = pdfPhase(dateKey, s);
  const vel = velocityStage(dateKey, version);
  const T = CONFIG.workoutTime;
  const meta = { type: session.type, title: session.title, intensity: session.intensity, level: session.level, tips: session.tips };

  if (session.type === 'off') {
    return { dateKey, session: meta, blocks: [], total: 0, exempt: true, pdfLabel: pp.phase.label, stage: vel.stage, milestone: vel.milestone };
  }

  let baseItems = session.items.map(i => resolveItem(i, session, s, pp.phase));

  // 회복·휴식·투구일: 운동 가능 시간을 채우지 않아요 (마지막은 꼭 스트레칭)
  if (!session.fill) {
    const last = baseItems.filter(i => !i.removed).slice(-1)[0];
    if (!last || !last.stretch) baseItems.push(Object.assign({}, COOLDOWN));
    return { dateKey, session: meta, total: Math.round(estItems(baseItems)), exempt: true,
             blocks: [{ label: '오늘 운동', kind: 'baseball', items: baseItems }],
             pdfLabel: pp.phase.label, stage: vel.stage, milestone: vel.milestone };
  }

  // 운동 가능 시간 = 세트 수 × 세트당 시간 (무조건 지켜요)
  const blockMin = s.minutesPerSet;
  const blockCount = s.workoutSets;
  const available = blockMin * blockCount;

  // ① 야구 운동을 먼저 (시간이 모자라면 ★ 핵심 위주로 줄여요)
  baseItems = fitBaseball(baseItems, available - T.cooldown);
  const baseMin = estItems(baseItems);
  const baseBlocks = Math.min(blockCount, Math.max(1, Math.ceil(baseMin / blockMin)));
  const blocks = [];
  const baseRoom = baseBlocks * blockMin - (baseBlocks === blockCount ? T.cooldown : 0);
  const spare = Math.floor(baseRoom - baseMin);
  if (spare >= 3) {
    baseItems.push({ id: 'base-spare', name: session.type === 'prepitch' ? '가볍게 걷기' : '가볍게 정리 운동 (걷기·가벼운 스트레칭)', min: spare });
  }
  blocks.push({ label: (baseBlocks > 1 ? '1~' + baseBlocks : '1') + '세트 · 야구 운동', kind: 'baseball',
                minutes: baseBlocks * blockMin, items: baseItems });

  // ② 남은 세트는 입력값에 맞춘 맨몸 운동으로
  const kinds = chooseBlockKinds(session.type, s, vel, blockCount - baseBlocks);
  kinds.forEach((kind, i) => {
    const n = baseBlocks + i + 1;
    const isLast = n === blockCount;
    blocks.push({ label: n + '세트 · ' + BLOCK_NAME[kind], kind: kind, minutes: blockMin,
                  items: buildBlock(kind, blockMin - (isLast ? T.cooldown : 0), s, vel, dateKey, 'b' + n + '-') });
  });

  // ③ 마지막은 꼭 스트레칭
  blocks[blocks.length - 1].items.push(Object.assign({}, COOLDOWN));

  return { dateKey, session: meta, blocks, total: available, exempt: false,
           pdfLabel: pp.phase.label, stage: vel.stage, milestone: vel.milestone };
}


// ---------------------------------------------------------------
// 8. 체크 기록
// ---------------------------------------------------------------
function isChecked(dateKey, id) {
  return !!(workoutChecks[dateKey] && workoutChecks[dateKey][id]);
}
function setChecked(dateKey, id, value) {
  if (!workoutChecks[dateKey]) workoutChecks[dateKey] = {};
  if (value) workoutChecks[dateKey][id] = true;
  else delete workoutChecks[dateKey][id];
  if (Object.keys(workoutChecks[dateKey]).length === 0) delete workoutChecks[dateKey];
  saveData(WORKOUT_STORAGE.checks, workoutChecks);
}
function planItems(plan) {
  return plan ? plan.blocks.reduce((all, b) => all.concat(b.items), []).filter(i => !i.removed) : [];
}
function dayProgress(plan) {
  const items = planItems(plan);
  return { done: plan ? items.filter(i => isChecked(plan.dateKey, i.id)).length : 0, total: items.length };
}


// ---------------------------------------------------------------
// 9. 화면 그리기
// ---------------------------------------------------------------
function renderWorkout() {
  const box = document.getElementById('workout-result');
  if (!workoutPlan) {
    box.innerHTML = '<div class="card empty">먼저 <b>입력</b> 탭에서 정보를 넣고 "분석하기"를 눌러주세요.</div>';
    return;
  }
  freezePast();

  const week = WEEK_DAY_KEYS.map((dayKey, i) => {
    const dateKey = addDays(workoutView.weekStart, i);
    const plan = getDayPlan(dateKey);
    return { dateKey, dayKey, plan, progress: dayProgress(plan) };
  });
  if (!week.some(d => d.dateKey === workoutView.selected)) workoutView.selected = week[0].dateKey;
  const selected = week.find(d => d.dateKey === workoutView.selected);

  box.innerHTML = renderVelocityCard()
    + renderWeekCard(week)
    + renderDayCard(selected)
    + renderAppliedCard();
  attachWorkoutEvents(box);
}

// ----- 구속 목표 -----
function renderVelocityCard() {
  const last = latestVersion();
  const v = last.velocity || {};
  const endDate = fromDateKey(workoutPlan.end);
  const field = (id, label, value) => '<label class="vel-field">' + label
    + '<input type="number" id="' + id + '" inputmode="decimal" step="0.1" placeholder="km/h" value="' + (value === undefined ? '' : value) + '"></label>';

  let summary = '';
  if (last.velocity) {
    const today = todayKey();
    const vel = velocityStage(today, versionFor(today));
    const weeksLeft = Math.max(0, Math.ceil(daysBetween(today, workoutPlan.end) / 7));
    const totalDays = daysBetween(workoutPlan.start, workoutPlan.end);
    const at = f => shortDate(addDays(workoutPlan.start, Math.round(totalDays * f)));
    summary = '<ul class="vel-summary">'
      + '<li>목표까지 <b>' + weeksLeft + '주</b> 남았어요 (' + endDate.getFullYear() + '년 ' + (endDate.getMonth() + 1) + '월 ' + endDate.getDate() + '일까지)</li>'
      + '<li>이번 주 중간 목표: 평균 <b>' + vel.milestone.avg + 'km/h</b> · 최고 <b>' + vel.milestone.max + 'km/h</b></li>'
      + '<li>지금 단계: <b>' + STAGE_NAME[vel.stage] + '</b> · 구속 강조 ' + EMPHASIS_NAME[vel.emphasis]
      +   ' (목표까지 최대 ' + vel.gap + 'km/h)</li>'
      + '<li class="vel-timeline">기초 체력 ~' + at(vel.splits[0]) + ' → 힘 기르기 ~' + at(vel.splits[1]) + ' → 파워·구속 ~' + shortDate(workoutPlan.end) + '</li>'
      + '</ul>';
    if (vel.gap >= CONFIG.velocity.bigGapWarn) {
      summary += '<div class="notice">목표가 지금보다 ' + vel.gap + 'km/h 높아요. 구속이 오르는 정도는 사람마다 많이 달라서, '
        + '무리하지 말고 중간 목표를 보며 조절해 주세요.</div>';
    }
  } else {
    summary = '<p class="metric-text">구속을 넣으면 내년 ' + CONFIG.velocity.goalMonth + '월까지 목표를 이루도록 단계별로 계획을 맞춰요. '
      + '지금은 "보통" 강조로 짜여 있어요.</p>';
  }

  return '<div class="card" id="velocity-card">'
    + '<h2>⚾ 구속 목표 <small>(' + endDate.getFullYear() + '년 ' + (endDate.getMonth() + 1) + '월까지)</small></h2>'
    + '<div class="vel-grid">'
    +   field('vel-avg', '현재 평균 구속', v.avg) + field('vel-max', '현재 최고 구속', v.max)
    +   field('vel-target-avg', '목표 평균 구속', v.targetAvg) + field('vel-target-max', '목표 최고 구속', v.targetMax)
    + '</div>'
    + '<p class="food-hint" id="vel-hint">' + (velocityMessage || '숫자는 km/h예요. 바꾸면 오늘부터 계획이 조금씩 맞춰져요 (지난 날은 그대로).') + '</p>'
    + '<button type="button" class="primary-btn" id="vel-save-btn" style="margin-top:10px">목표 저장하고 계획 맞추기</button>'
    + summary
    + '<p class="footnote">구속은 하체 → 몸통 → 팔로 힘이 이어져야 올라가요 [능력]. 다만 운동한다고 목표 구속이 꼭 나온다는 보장은 없어요.</p>'
    + '</div>';
}

// ----- 주간 표 -----
function renderWeekCard(week) {
  const today = todayKey();
  const done = week.reduce((s, d) => s + d.progress.done, 0);
  const total = week.reduce((s, d) => s + d.progress.total, 0);
  const percent = total > 0 ? Math.round(done / total * 100) : 0;
  const first = fromDateKey(week[0].dateKey);
  const last = fromDateKey(week[6].dateKey);
  const lastText = (last.getFullYear() !== first.getFullYear() ? last.getFullYear() + '년 ' : '')
    + (last.getMonth() + 1) + '월 ' + last.getDate() + '일';
  const sample = week.find(d => d.plan);

  const rows = week.map(d => {
    const date = fromDateKey(d.dateKey);
    const p = d.plan;
    let cls = 'week-row';
    if (d.dateKey === workoutView.selected) cls += ' selected';
    if (d.dateKey === today) cls += ' today';
    if (!p) {
      return '<tr class="' + cls + '" data-date="' + d.dateKey + '" tabindex="0"><td class="wk-day"><b>' + DAY_NAME[d.dayKey]
        + '</b><small>' + shortDate(d.dateKey) + '</small></td><td class="wk-title" colspan="3">계획 시작 전</td></tr>';
    }
    const extra = p.blocks.filter(b => b.kind !== 'baseball').length;
    let status = '-';
    if (d.progress.total > 0) status = d.progress.done === d.progress.total ? '✅' : d.progress.done + '/' + d.progress.total;
    return '<tr class="' + cls + '" data-date="' + d.dateKey + '" tabindex="0">'
      + '<td class="wk-day"><b>' + DAY_NAME[d.dayKey] + '</b><small>' + (date.getMonth() + 1) + '/' + date.getDate() + '</small></td>'
      + '<td class="wk-title"><span class="lv-dot ' + LEVEL_CLASS[p.session.level] + '"></span>' + p.session.title
      +   (extra ? ' <small class="wk-extra">+ 맨몸 ' + extra + '세트</small>' : '') + '</td>'
      + '<td class="wk-time">' + (p.session.type === 'off' ? '-' : p.session.type === 'pitch' ? '경기' : p.total + '분') + '</td>'
      + '<td class="wk-status">' + status + '</td>'
      + '</tr>';
  }).join('');

  return '<div class="card">'
    + '<div class="cal-nav">'
    +   '<button type="button" class="cal-nav-btn" data-week="-1" aria-label="이전 주">◀</button>'
    +   '<h2>' + first.getFullYear() + '년 ' + (first.getMonth() + 1) + '월 ' + first.getDate() + '일 ~ ' + lastText + '</h2>'
    +   '<button type="button" class="cal-nav-btn" data-week="1" aria-label="다음 주">▶</button>'
    + '</div>'
    + (sample ? '<p class="phase-line"><b>' + sample.plan.pdfLabel + '</b> · 구속 단계: <b>' + STAGE_NAME[sample.plan.stage] + '</b></p>' : '')
    + renderPitchControls(week[0].dateKey)
    + '<div class="macro-row"><div class="macro-top"><b>이번 주 운동</b><span>' + done + ' / ' + total + '개 완료 (' + percent + '%)</span></div>'
    +   '<div class="macro-bar"><div class="fill-good" style="width:' + percent + '%"></div></div></div>'
    + '<table class="week-table"><thead><tr><th>요일</th><th>할 일</th><th>시간</th><th>완료</th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table>'
    + '<p class="footnote">요일을 누르면 아래에 그날 운동이 나와요. 회복·휴식·투구일은 운동 가능 시간을 채우지 않아요.</p>'
    + '</div>';
}

// ----- 이번 주 투구 (요일·공 개수) -----
let pitchMessage = '';

function renderPitchControls(weekStart) {
  const p = weekPitchFor(weekStart);
  const isPastWeek = addDays(weekStart, 6) < todayKey();
  const off = isPastWeek ? ' disabled' : '';
  let status;
  if (pitchMessage) status = pitchMessage;
  else if (isPastWeek) status = '지난 주라서 바꿀 수 없어요.';
  else if (p.explicit) status = '이번 주에 저장한 값이에요.';
  else if (p.from) status = shortDate(p.from) + ' 주에 넣은 값을 그대로 쓰고 있어요. 이번 주가 다르면 바꾸고 저장하세요.';
  else status = '기본값(일요일 80구, [계획표] 기준)을 쓰고 있어요. 이번 주에 맞게 바꾸고 저장하세요.';

  const days = WEEK_DAY_KEYS.map(k => '<label><input type="radio" name="week-pitch-day" value="' + k + '"'
    + (k === p.day ? ' checked' : '') + off + '> ' + DAY_NAME[k] + '</label>').join('');

  return '<div class="pitch-box">'
    + '<div class="label">⚾ 이번 주 투구 <small>(공 던지는 요일에 맞춰 요일별 운동 순서가 바뀌어요)</small></div>'
    + '<div class="choices days">' + days + '</div>'
    + '<div class="pitch-row">'
    +   '<label class="pitch-count">공 개수<input type="number" id="week-pitch-count" inputmode="numeric" value="' + p.count + '"' + off + '>구</label>'
    +   '<button type="button" class="add-btn" id="pitch-save-btn"' + off + '>이번 주 저장</button>'
    + '</div>'
    + '<p class="food-hint" id="pitch-hint">' + status + '</p>'
    + '</div>';
}

function savePitch() {
  const weekStart = workoutView.weekStart;
  const checked = document.querySelector('input[name="week-pitch-day"]:checked');
  const count = Number(document.getElementById('week-pitch-count').value);
  const [lo, hi] = CONFIG.pitcher.countLimits;
  const hint = document.getElementById('pitch-hint');
  if (!checked) { hint.textContent = '공 던지는 요일을 골라주세요.'; hint.classList.add('hint-warn'); return; }
  if (!(count >= lo && count <= hi)) { hint.textContent = '공 개수는 ' + lo + '~' + hi + '구 사이로 넣어주세요.'; hint.classList.add('hint-warn'); return; }

  freezePast();   // 지난 날은 지금 모습 그대로 먼저 고정해요
  const before = weekPitchFor(weekStart);
  if (!workoutPlan.weekPitch) workoutPlan.weekPitch = {};
  workoutPlan.weekPitch[weekStart] = { day: checked.value, count: count };
  savePlan();

  const dayChanged = before.day !== checked.value;
  pitchMessage = '✅ 이번 주 투구를 ' + DAY_NAME[checked.value] + '요일 ' + count + '구로 저장했어요. '
    + (dayChanged ? '오늘 이후 요일별 운동 순서를 투구일에 맞게 바꿨어요 (지난 날은 그대로). ' : '')
    + '다음 주부터도 따로 정하지 않으면 이 값을 써요.';
  renderWorkout();
  pitchMessage = '';
}

// ----- 고른 날짜의 운동 -----
function renderDayCard(day) {
  const p = day.plan;
  if (!p) {
    return '<div class="card" id="day-workout"><h2>' + dateLabel(day.dateKey) + '</h2>'
      + '<p class="metric-text">운동 계획을 시작하기 전 날짜예요.</p></div>';
  }
  const s = versionFor(day.dateKey).settings;
  const injured = myInjuries(s);
  const isPast = day.dateKey < todayKey();
  let warn = '';
  if (p.session.type === 'pitch' && (injured.includes('shoulder') || injured.includes('elbow'))) {
    warn += '<div class="notice">⚠️ 어깨나 팔꿈치가 불편하다고 하셨어요. 공을 던지기 전에 꼭 정형외과나 스포츠의학과에서 상담받아 주세요.</div>';
  }
  if (p.blocks.some(b => b.items.some(i => i.removed === '운동 시간이 짧아서 뺐어요'))) {
    warn += '<div class="notice">운동 가능 시간에 맞추느라 ★ 핵심 운동 위주로 줄였어요.</div>';
  }
  if (isPast) warn += '<p class="past-note">🔒 지나간 날이라 계획은 그날 그대로 보관돼요. 체크는 할 수 있어요.</p>';

  const blocksHtml = p.blocks.length === 0
    ? '<p class="metric-text">오늘은 쉬는 날이에요.</p>'
    : p.blocks.map(b => '<div class="ex-block"><div class="ex-block-head">' + b.label
        + (b.minutes ? '<span>약 ' + b.minutes + '분</span>' : '') + '</div>'
        + '<ul class="ex-list">' + b.items.map(item => renderExercise(item, day.dateKey)).join('') + '</ul></div>').join('');

  const tipsHtml = p.session.tips.length ? '<ul class="ex-tips">' + p.session.tips.map(t => '<li>' + t + '</li>').join('') + '</ul>' : '';
  const mile = p.milestone ? ' · 이날 중간 목표 평균 ' + p.milestone.avg + ' / 최고 ' + p.milestone.max + 'km/h' : '';

  return '<div class="card" id="day-workout">'
    + '<div class="meal-head"><h2>' + dateLabel(day.dateKey) + '</h2>'
    + '<span class="meal-total">' + (day.progress.total > 0 ? day.progress.done + ' / ' + day.progress.total + ' 완료' : '쉬는 날') + '</span></div>'
    + '<p class="meal-target"><span class="lv-dot ' + LEVEL_CLASS[p.session.level] + '"></span><b>' + p.session.title + '</b> · 강도 ' + p.session.intensity
    + (p.session.type === 'pitch' ? ' · 경기/연습' : p.total ? ' · 약 ' + p.total + '분' : '') + mile + '</p>'
    + warn + blocksHtml + tipsHtml
    + '<p class="footnote">⚠️ 팔꿈치 안쪽이 찌릿하거나 어깨 앞쪽이 콕콕 찌르면 바로 멈추고 정형외과나 스포츠의학과에 가보세요. '
    +   '근육이 뻐근한 것과 관절이 아픈 건 다른 신호예요. 체크는 누르는 즉시 저장돼요.</p>'
    + '</div>';
}

function renderExercise(item, dateKey) {
  const detail = [];
  if (typeof item.sets === 'number') detail.push(item.sets + '세트 × ' + (item.reps || ''));
  else if (item.reps) detail.push(item.reps);
  if (item.rest) detail.push('쉬는 시간 ' + item.rest);
  if (item.min && typeof item.sets !== 'number') detail.push('약 ' + item.min + '분');

  const tags = (item.key ? '<span class="ex-tag tag-key">★ 핵심</span>' : '')
    + (item.from === '능력' ? '<span class="ex-tag tag-add">추가</span>' : '')
    + (item.replacedFrom ? '<span class="ex-tag tag-alt">대체</span>' : '')
    + (item.stretch ? '<span class="ex-tag tag-stretch">스트레칭</span>' : '');

  const steps = item.warmup ? WARMUP_STEPS : item.steps;
  const sub = (item.replacedFrom ? '<div class="ex-sub">"' + item.replacedFrom + '" 대신 (장비가 없어서)</div>' : '')
    + (item.goalNote ? '<div class="ex-sub">' + item.goalNote + '</div>' : '')
    + (item.tempo ? '<div class="ex-sub">' + item.tempo + '</div>' : '')
    + (steps ? '<ul class="warmup-steps">' + steps.map(w => '<li>' + w + '</li>').join('') + '</ul>' : '');

  if (item.removed) {
    return '<li class="ex-item removed"><div class="ex-body"><div class="ex-name">' + item.name + '</div>'
      + '<div class="ex-sub">' + item.removed + '</div></div></li>';
  }
  const checked = isChecked(dateKey, item.id);
  return '<li class="ex-item' + (checked ? ' done' : '') + '">'
    + '<label class="ex-check"><input type="checkbox" data-id="' + item.id + '"' + (checked ? ' checked' : '') + '>'
    + '<div class="ex-body"><div class="ex-name">' + item.name + ' ' + tags + '</div>'
    + (detail.length ? '<div class="ex-detail">' + detail.join(' · ') + '</div>' : '')
    + sub + '</div></label></li>';
}

// ----- 입력값을 어떻게 반영했는지 -----
function renderAppliedCard() {
  const last = latestVersion();
  const pitch = weekPitchFor(workoutView.weekStart);
  const s = Object.assign({}, last.settings, { pitchCount: pitch.count });
  const lines = buildWeekSessions(workoutView.weekStart, s).notes;
  const have = myEquipment(s);
  const injured = myInjuries(s);
  const avail = s.workoutSets * s.minutesPerSet;

  lines.push('하루 운동 가능 시간 <b>' + s.workoutSets + '세트 × ' + s.minutesPerSet + '분 = ' + avail + '분</b>을 지켜요. '
    + '야구 운동(계획표)을 앞 세트에 먼저 넣고, 남는 세트는 입력값에 맞춘 맨몸 운동으로 채워요. '
    + '시간이 모자라면 ★ 핵심 야구 운동 위주로 줄여요. 회복·휴식·투구일은 시간을 채우지 않아요.');
  lines.push('매일 마지막은 마무리 스트레칭으로 끝나요.');
  lines.push('운동 경험 "' + { none: '처음', under6: '6개월 미만', over6: '6개월 이상' }[s.experience] + '" → '
    + (s.experience === 'over6' ? '야구 운동은 3주차(표대로)부터 시작해요.' : '야구 운동은 1주차(2세트)부터 시작하고, 맨몸 운동은 쉬운 버전으로 해요.')
    + ' 5주가 한 바퀴예요. [계획표]');
  lines.push('장비: ' + (s.place === 'gym' ? '헬스장이라 모든 장비가 있다고 봤어요.' : '집 (' + have.length + '가지 장비)')
    + ' — 없는 장비가 필요한 운동은 "대체" 운동으로 바꿨어요.');
  lines.push(injured.length ? '불편한 부위(' + injured.map(i => BODY_NAME[i]).join(', ') + ')에 부담이 가는 운동은 뺐어요.'
                            : '불편한 부위가 없어서 빼는 운동은 없어요.');
  if (s.weightGoal === 'lose') lines.push('체중 줄이기 목표 → 남는 세트에 맨몸 서킷을 먼저 넣고, 회복 날 걷기를 늘렸어요.');
  if (s.muscleGoal === 'gain') lines.push('근육 늘리기 목표 → 남는 세트에 맨몸 근력 운동을 넣고, "힘 기르기" 단계에는 4세트·천천히 내려가기로 해요.');
  lines.push('구속 목표 → 기간을 기초 체력 → 힘 기르기 → 파워·구속 단계로 나눠요. 파워·구속 단계에는 몸통 회전 날과 상체 날 남는 세트 맨 앞에 맨몸 폭발력 운동을 넣어요. '
    + '목표까지 차이가 클수록 파워·구속 단계를 일찍 시작해요.');
  lines.push('"추가" 표시 운동은 [능력] 자료에서 계획표에 없던 능력(한 발 균형, 90도 어깨, 순발력, 어깨 유연성)을 채우려고 넣었어요.');
  lines.push('투구 수(' + s.pitchCount + '구) 기준은 나이·몸 상태에 따라 달라요. 코치나 전문가와 상의해서 정하세요. [능력]');

  const history = workoutPlan.versions.map((v, i) => '<li>' + shortDate(v.from) + (i === 0 ? ' 계획 시작' : ' 부터 새 계획 적용')
    + (v.velocity ? ' (목표 평균 ' + v.velocity.targetAvg + ' / 최고 ' + v.velocity.targetMax + 'km/h)' : '') + '</li>').join('')
    + Object.keys(workoutPlan.weekPitch || {}).sort().map(k => '<li>' + shortDate(k) + ' 주: 투구 '
      + DAY_NAME[workoutPlan.weekPitch[k].day] + '요일 ' + workoutPlan.weekPitch[k].count + '구</li>').join('');

  return '<details class="card applied">'
    + '<summary><b>📋 입력값과 자료를 이렇게 반영했어요</b></summary>'
    + '<ul class="applied-list">' + lines.map(l => '<li>' + l + '</li>').join('') + '</ul>'
    + '<p class="label" style="margin-top:12px">계획 변경 기록</p><ul class="applied-list">' + history + '</ul>'
    + '<p class="footnote">[계획표] 사회인야구 투수 비시즌 주간 운동계획표 · [능력] 투수에게 필요한 운동능력과 훈련법</p>'
    + '</details>';
}


// ---------------------------------------------------------------
// 10. 버튼·체크 동작
// ---------------------------------------------------------------
function saveVelocity() {
  const read = id => { const t = document.getElementById(id).value.trim(); return t === '' ? null : Number(t); };
  const v = { avg: read('vel-avg'), max: read('vel-max'), targetAvg: read('vel-target-avg'), targetMax: read('vel-target-max') };
  const [lo, hi] = CONFIG.velocity.speedLimits;
  const hint = document.getElementById('vel-hint');
  const fail = text => { hint.textContent = text; hint.classList.add('hint-warn'); };

  if (Object.values(v).some(x => x === null)) return fail('네 칸을 모두 넣어주세요.');
  if (Object.values(v).some(x => isNaN(x) || x < lo || x > hi)) return fail('구속은 ' + lo + '~' + hi + 'km/h 사이로 넣어주세요.');
  if (v.avg > v.max) return fail('현재 평균 구속이 최고 구속보다 클 수 없어요.');
  if (v.targetAvg > v.targetMax) return fail('목표 평균 구속이 목표 최고 구속보다 클 수 없어요.');
  if (v.targetAvg < v.avg || v.targetMax < v.max) return fail('목표 구속은 지금 구속보다 같거나 높게 넣어주세요.');

  const last = latestVersion();
  if (last.velocity && JSON.stringify(last.velocity) === JSON.stringify(v)) {
    velocityMessage = '바뀐 값이 없어요.';
  } else {
    addVersion(last.settings, v);
    velocityMessage = '✅ 저장했어요. 오늘(' + shortDate(todayKey()) + ')부터 목표에 맞춰 계획을 조정했어요. 지난 날은 그대로예요.';
  }
  renderWorkout();
  velocityMessage = '';
}

function attachWorkoutEvents(box) {
  document.getElementById('vel-save-btn').addEventListener('click', saveVelocity);
  document.getElementById('pitch-save-btn').addEventListener('click', savePitch);
  document.getElementById('week-pitch-count').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); savePitch(); }
  });
  box.querySelectorAll('.vel-field input').forEach(input => {
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); saveVelocity(); } });
  });

  // 이전 주 / 다음 주
  box.querySelectorAll('[data-week]').forEach(btn => {
    btn.addEventListener('click', () => {
      workoutView.weekStart = addDays(workoutView.weekStart, 7 * Number(btn.dataset.week));
      const t = todayKey();
      const inWeek = t >= workoutView.weekStart && t <= addDays(workoutView.weekStart, 6);
      workoutView.selected = inWeek ? t : workoutView.weekStart;
      renderWorkout();
    });
  });

  // 요일 고르기 (클릭 또는 엔터)
  box.querySelectorAll('.week-row').forEach(row => {
    const pick = () => {
      workoutView.selected = row.dataset.date;
      renderWorkout();
      document.getElementById('day-workout').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    row.addEventListener('click', pick);
    row.addEventListener('keydown', e => { if (e.key === 'Enter') pick(); });
  });

  // 운동 체크 (누르는 즉시 저장)
  box.querySelectorAll('.ex-check input').forEach(input => {
    input.addEventListener('change', () => {
      setChecked(workoutView.selected, input.dataset.id, input.checked);
      const y = window.scrollY;
      renderWorkout();
      window.scrollTo(0, y);
    });
  });
}
