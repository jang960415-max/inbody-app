// =====================================================================
//  📈 기록 (4단계)
//  - 인바디 수치를 날짜별로 저장하고, 수치별 변화 그래프를 보여줘요.
//  - 기록은 이 브라우저 안(localStorage)에만 저장돼요. 서버로 보내지 않아요.
//  - 저장 도우미(loadSaved, saveData)와 날짜 도우미(toDateKey 등)는 diet.js 것을 같이 써요.
// =====================================================================

const RECORD_STORAGE = {
  list: 'inbodyApp.inbodyRecords',     // [{ date, weight, skeletalMuscle, ... }, ...]
  charts: 'inbodyApp.recordCharts'     // 그래프로 볼 수치 (화면 설정이라 없어도 괜찮아요)
};

// 기록할 수치 (better: 늘어나면 좋은지 'up' / 줄면 좋은지 'down' / 목표에 따라 'goal')
const RECORD_METRICS = [
  { key: 'weight',         name: '체중',          unit: 'kg',   digits: 1, better: 'goal' },
  { key: 'skeletalMuscle', name: '골격근량',      unit: 'kg',   digits: 1, better: 'up' },
  { key: 'bodyFatPercent', name: '체지방률',      unit: '%',    digits: 1, better: 'down' },
  { key: 'fatMass',        name: '체지방량',      unit: 'kg',   digits: 1, better: 'down' },
  { key: 'bmi',            name: 'BMI',           unit: '',     digits: 1, better: 'goal' },
  { key: 'bmr',            name: '기초대사량',    unit: 'kcal', digits: 0, better: 'up' },
  { key: 'visceralFat',    name: '내장지방 레벨', unit: '',     digits: 0, better: 'down' },
  { key: 'abdominalFat',   name: '복부지방률',    unit: '',     digits: 2, better: 'down' }
];
const DEFAULT_CHARTS = ['weight', 'skeletalMuscle', 'bodyFatPercent'];

let inbodyRecords = loadSaved(RECORD_STORAGE.list, []);
let recordMessage = '';
let armedButton = null;   // "한 번 더 누르면 지워져요" 상태인 버튼


// ---------------------------------------------------------------
// 1. 저장·불러오기
// ---------------------------------------------------------------
function chartSelection() {
  const saved = loadSaved(RECORD_STORAGE.charts, null);
  return Array.isArray(saved) && saved.length ? saved : DEFAULT_CHARTS.slice();
}
function saveRecords() {
  inbodyRecords.sort((a, b) => a.date < b.date ? -1 : 1);
  return saveData(RECORD_STORAGE.list, inbodyRecords);
}
function fmtNum(v, digits) {
  return Number(v.toFixed(digits)).toLocaleString();
}

// 입력 탭의 지금 값으로 기록 저장
function saveRecordFromInput() {
  const dateInput = document.getElementById('record-date');
  const date = dateInput.value;
  const today = toDateKey(new Date());
  if (!date) { recordMessage = '⚠️ 측정한 날짜를 골라주세요.'; renderRecords(); return; }
  if (date > today) { recordMessage = '⚠️ 오늘 이후 날짜는 저장할 수 없어요.'; renderRecords(); return; }

  // 입력 탭 값을 다시 읽고 검사해요 (분석 후에 값을 바꿨을 수도 있어서)
  const data = readForm();
  const { errors } = validate(data);
  if (errors.length > 0) {
    recordMessage = '⚠️ 입력 탭의 값에 확인할 부분이 있어요. 입력 탭에서 "분석하기"를 눌러 확인해 주세요.';
    renderRecords();
    return;
  }

  const record = { date: date };
  RECORD_METRICS.forEach(m => { record[m.key] = data[m.key] === undefined ? null : data[m.key]; });
  const existing = inbodyRecords.findIndex(r => r.date === date);
  if (existing >= 0) inbodyRecords[existing] = record; else inbodyRecords.push(record);
  if (saveRecords()) {
    recordMessage = '✅ ' + dateLabel(date) + ' 기록을 ' + (existing >= 0 ? '새 값으로 바꿨어요.' : '저장했어요.');
  }
  renderRecords();
}

// 지우기 버튼: 한 번 누르면 "정말요?", 한 번 더 누르면 지워요 (확인창이 안 뜨는 환경에서도 동작하게)
function handleArmedDelete(btn, action) {
  if (armedButton !== btn.dataset.armKey) {
    armedButton = btn.dataset.armKey;
    renderRecords();
    setTimeout(() => { if (armedButton === btn.dataset.armKey) { armedButton = null; renderRecords(); } }, 5000);
    return;
  }
  armedButton = null;
  action();
  renderRecords();
}


// ---------------------------------------------------------------
// 2. 화면 그리기
// ---------------------------------------------------------------
function renderRecords() {
  const box = document.getElementById('records-result');
  if (!box) return;
  box.innerHTML = renderRecordSaveCard() + renderRecordSummary() + renderRecordCharts() + renderRecordTable();
  attachRecordEvents(box);
}

// ----- 저장 카드 -----
function renderRecordSaveCard() {
  const data = readForm();
  const today = toDateKey(new Date());
  const preview = ['weight', 'skeletalMuscle', 'bodyFatPercent', 'fatMass']
    .map(k => RECORD_METRICS.find(m => m.key === k))
    .map(m => '<span class="rec-chip-val">' + m.name + ' <b>' + (data[m.key] === null || data[m.key] === undefined || isNaN(data[m.key]) ? '-' : data[m.key]) + m.unit + '</b></span>')
    .join('');

  return '<div class="card">'
    + '<h2>📈 인바디 기록 저장</h2>'
    + '<p class="metric-text" style="margin:-6px 0 10px">입력 탭에 넣은 인바디 수치를 측정한 날짜로 저장해요.</p>'
    + '<div class="rec-preview">' + preview + '</div>'
    + '<div class="add-row">'
    +   '<label class="rec-date-label">측정한 날<input type="date" id="record-date" value="' + today + '" max="' + today + '"></label>'
    +   '<button type="button" class="add-btn" id="record-save-btn">기록 저장</button>'
    + '</div>'
    + '<p class="food-hint' + (recordMessage.startsWith('⚠️') ? ' hint-warn' : '') + '">'
    +   (recordMessage || '같은 날짜로 다시 저장하면 그날 기록이 새 값으로 바뀌어요.') + '</p>'
    + '</div>';
}

// ----- 요약 (처음 기록 대비 변화) -----
function changeText(metric, diff) {
  if (Math.abs(diff) < Math.pow(10, -metric.digits) / 2) return { text: '변화 없음', cls: 'chg-flat' };
  const up = diff > 0;
  let better = metric.better;
  if (better === 'goal') {
    const goal = latestResult ? latestResult.data.weightGoal : null;
    better = goal === 'lose' ? 'down' : goal === 'gain' ? 'up' : null;
  }
  const good = better === null ? null : (better === 'up') === up;
  return {
    text: (up ? '▲ +' : '▼ ') + fmtNum(diff, metric.digits) + metric.unit,
    cls: good === null ? 'chg-flat' : good ? 'chg-good' : 'chg-bad'
  };
}

function renderRecordSummary() {
  if (inbodyRecords.length === 0) return '';
  const first = inbodyRecords[0];
  const last = inbodyRecords[inbodyRecords.length - 1];
  const tiles = ['weight', 'skeletalMuscle', 'bodyFatPercent'].map(k => {
    const m = RECORD_METRICS.find(x => x.key === k);
    if (last[k] === null || last[k] === undefined) return '';
    const c = inbodyRecords.length > 1 && first[k] !== null ? changeText(m, last[k] - first[k]) : null;
    return '<div class="stat-tile">'
      + '<div class="stat-label">' + m.name + '</div>'
      + '<div class="stat-value">' + fmtNum(last[k], m.digits) + '<small>' + m.unit + '</small></div>'
      + (c ? '<div class="stat-delta ' + c.cls + '">' + c.text + '</div>' : '<div class="stat-delta chg-flat">첫 기록</div>')
      + '</div>';
  }).join('');

  return '<div class="card">'
    + '<h2>최근 기록 <small>' + dateLabel(last.date) + '</small></h2>'
    + '<div class="stat-row">' + tiles + '</div>'
    + (inbodyRecords.length > 1
        ? '<p class="footnote">변화는 첫 기록(' + dateLabel(first.date) + ') 대비예요. 초록은 목표에 맞는 방향, 빨강은 반대 방향이에요.</p>'
        : '')
    + '</div>';
}

// ----- 변화 그래프 -----
function renderRecordCharts() {
  const selected = chartSelection();
  const chips = RECORD_METRICS.map(m => '<label class="rec-chip' + (selected.includes(m.key) ? ' on' : '') + '">'
    + '<input type="checkbox" class="rec-chart-toggle" value="' + m.key + '"' + (selected.includes(m.key) ? ' checked' : '') + '>'
    + m.name + '</label>').join('');

  let charts;
  if (inbodyRecords.length === 0) {
    charts = '<p class="metric-text">아직 기록이 없어요. 위에서 첫 기록을 저장해 보세요.</p>';
  } else {
    charts = RECORD_METRICS.filter(m => selected.includes(m.key)).map(m => lineChart(m)).join('')
      || '<p class="metric-text">볼 수치를 하나 이상 골라주세요.</p>';
  }

  return '<div class="card">'
    + '<h2>변화 그래프</h2>'
    + '<div class="rec-chips">' + chips + '</div>'
    + charts
    + (inbodyRecords.length === 1 ? '<p class="footnote">기록이 2개 이상이면 변화 선이 그려져요.</p>' : '')
    + '</div>';
}

// 수치 하나의 꺾은선 그래프 (SVG)
function lineChart(metric) {
  const points = inbodyRecords.filter(r => r[metric.key] !== null && r[metric.key] !== undefined && !isNaN(r[metric.key]))
    .map(r => ({ date: r.date, value: r[metric.key] }));
  if (points.length === 0) {
    return '<div class="rec-chart"><div class="rec-chart-title">' + metric.name + '</div>'
      + '<p class="metric-text">이 수치가 들어간 기록이 없어요.</p></div>';
  }

  // 그래프 크기: 화면 폭에 맞춰 그려서 휴대폰에서도 글자가 작아지지 않게 해요
  const mainWidth = (document.querySelector('main') || {}).clientWidth || 600;
  const W = Math.round(Math.min(600, Math.max(280, mainWidth - 64)));
  const H = Math.round(Math.min(210, Math.max(160, W * 0.45)));
  const padL = 40, padR = 66, padT = 14, padB = 26;
  const innerW = W - padL - padR, innerH = H - padT - padB;

  // 세로축: 값 범위에 여유를 두고 깔끔한 눈금으로
  let min = Math.min(...points.map(p => p.value));
  let max = Math.max(...points.map(p => p.value));
  // 체지방률은 표준 범위도 같이 보이게
  const band = metric.key === 'bodyFatPercent' && latestResult
    ? CONFIG.standardRanges.bodyFatPercent[latestResult.data.sex] : null;
  if (band) { min = Math.min(min, band[0]); max = Math.max(max, band[1]); }
  if (max - min < Math.pow(10, -metric.digits) * 4) { min -= 1; max += 1; }
  const step = niceStep((max - min) / 3);
  const yMin = Math.floor(min / step) * step;
  const yMax = Math.ceil(max / step) * step;
  const y = v => padT + innerH - (v - yMin) / (yMax - yMin) * innerH;

  // 가로축: 날짜 간격대로
  const t0 = fromDateKey(points[0].date).getTime();
  const t1 = fromDateKey(points[points.length - 1].date).getTime();
  const x = d => points.length === 1 ? padL + innerW / 2 : padL + (fromDateKey(d).getTime() - t0) / (t1 - t0) * innerW;

  let svg = '';
  // 표준 범위 띠 (체지방률)
  if (band) {
    svg += '<rect x="' + padL + '" y="' + y(band[1]) + '" width="' + innerW + '" height="' + (y(band[0]) - y(band[1])) + '" class="rc-band"/>'
      + '<text x="' + (padL + 4) + '" y="' + (y(band[1]) + 12) + '" class="rc-band-label">표준 ' + band[0] + '~' + band[1] + '%</text>';
  }
  // 눈금선 + 세로축 숫자
  for (let v = yMin; v <= yMax + step / 2; v += step) {
    svg += '<line x1="' + padL + '" x2="' + (padL + innerW) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="rc-grid"/>'
      + '<text x="' + (padL - 6) + '" y="' + (y(v) + 4) + '" class="rc-axis" text-anchor="end">' + fmtNum(v, step < 1 ? 1 : 0) + '</text>';
  }
  // 가로축 날짜 (처음·끝)
  svg += '<text x="' + x(points[0].date) + '" y="' + (H - 8) + '" class="rc-axis" text-anchor="' + (points.length === 1 ? 'middle' : 'start') + '">' + shortDateKo(points[0].date) + '</text>';
  if (points.length > 1) {
    svg += '<text x="' + x(points[points.length - 1].date) + '" y="' + (H - 8) + '" class="rc-axis" text-anchor="end">' + shortDateKo(points[points.length - 1].date) + '</text>';
  }
  // 선
  if (points.length > 1) {
    svg += '<polyline class="rc-line" points="' + points.map(p => x(p.date) + ',' + y(p.value)).join(' ') + '"/>';
  }
  // 점
  points.forEach(p => { svg += '<circle class="rc-dot" cx="' + x(p.date) + '" cy="' + y(p.value) + '" r="4.5"/>'; });
  // 마지막 값 표시 (선 끝에만)
  const last = points[points.length - 1];
  svg += '<text x="' + (x(last.date) + 10) + '" y="' + (y(last.value) + 4) + '" class="rc-end">' + fmtNum(last.value, metric.digits) + metric.unit + '</text>';
  // 마우스·손가락 올리면 값이 보이는 선 (처음엔 숨김)
  svg += '<line class="rc-cross" x1="0" x2="0" y1="' + padT + '" y2="' + (padT + innerH) + '" visibility="hidden"/>';

  const pointData = points.map(p => ({ x: x(p.date), y: y(p.value), date: p.date, value: p.value }));
  const first = points[0];
  const c = points.length > 1 ? changeText(metric, last.value - first.value) : null;

  return '<div class="rec-chart">'
    + '<div class="rec-chart-title">' + metric.name + (metric.unit ? ' <small>(' + metric.unit + ')</small>' : '')
    + (c ? '<span class="stat-delta ' + c.cls + '">' + c.text + '</span>' : '') + '</div>'
    + '<div class="rc-wrap" data-points=\'' + JSON.stringify(pointData) + '\' data-unit="' + metric.unit + '" data-digits="' + metric.digits + '" data-w="' + W + '">'
    + '<svg viewBox="0 0 ' + W + ' ' + H + '" class="rc-svg" role="img" aria-label="' + metric.name + ' 변화 그래프">' + svg + '</svg>'
    + '<div class="rc-tip" hidden></div>'
    + '</div></div>';
}

// 눈금 간격을 1, 2, 5 × 10ⁿ 중 하나로
function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
function shortDateKo(key) {
  const d = fromDateKey(key);
  return (d.getFullYear() % 100) + '.' + (d.getMonth() + 1) + '.' + d.getDate();
}

// ----- 기록 표 (그래프의 숫자를 표로도) -----
function renderRecordTable() {
  if (inbodyRecords.length === 0) return '';
  const cols = ['weight', 'skeletalMuscle', 'bodyFatPercent', 'fatMass', 'bmi', 'bmr'].map(k => RECORD_METRICS.find(m => m.key === k));
  const rows = inbodyRecords.slice().reverse().map(r => '<tr><td>' + shortDateKo(r.date) + '</td>'
    + cols.map(m => '<td>' + (r[m.key] === null || r[m.key] === undefined ? '-' : fmtNum(r[m.key], m.digits)) + '</td>').join('')
    + '<td><button type="button" class="del-btn rec-del' + (armedButton === 'del-' + r.date ? ' armed' : '') + '" data-date="' + r.date
    + '" data-arm-key="del-' + r.date + '" aria-label="이 기록 지우기">' + (armedButton === 'del-' + r.date ? '지울까요?' : '✕') + '</button></td></tr>').join('');

  const allArmed = armedButton === 'delete-all';
  return '<div class="card">'
    + '<h2>기록 목록 <small>(' + inbodyRecords.length + '개)</small></h2>'
    + '<div class="rec-table-wrap"><table class="rec-table"><thead><tr><th>날짜</th>'
    + cols.map(m => '<th>' + m.name + (m.unit ? '<small>' + m.unit + '</small>' : '') + '</th>').join('') + '<th></th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table></div>'
    + '<button type="button" class="danger-btn' + (allArmed ? ' armed' : '') + '" id="record-delete-all" data-arm-key="delete-all">'
    + (allArmed ? '⚠️ 한 번 더 누르면 인바디 기록이 모두 지워져요' : '🗑 인바디 기록 전체 삭제') + '</button>'
    + '<p class="footnote">기록은 이 브라우저에만 저장돼요. 식단·운동 기록은 이 버튼으로 지워지지 않아요.</p>'
    + '</div>';
}


// ---------------------------------------------------------------
// 3. 버튼·그래프 동작
// ---------------------------------------------------------------
function attachRecordEvents(box) {
  document.getElementById('record-save-btn').addEventListener('click', () => { recordMessage = ''; saveRecordFromInput(); });

  // 그래프로 볼 수치 고르기
  box.querySelectorAll('.rec-chart-toggle').forEach(input => {
    input.addEventListener('change', () => {
      const chosen = [...box.querySelectorAll('.rec-chart-toggle:checked')].map(i => i.value);
      saveData(RECORD_STORAGE.charts, chosen);
      renderRecords();
    });
  });

  // 기록 하나 지우기 / 전체 지우기 (두 번 눌러야 지워져요)
  box.querySelectorAll('.rec-del').forEach(btn => {
    btn.addEventListener('click', () => handleArmedDelete(btn, () => {
      inbodyRecords = inbodyRecords.filter(r => r.date !== btn.dataset.date);
      saveRecords();
      recordMessage = '🗑 ' + dateLabel(btn.dataset.date) + ' 기록을 지웠어요.';
    }));
  });
  const delAll = document.getElementById('record-delete-all');
  if (delAll) delAll.addEventListener('click', () => handleArmedDelete(delAll, () => {
    inbodyRecords = [];
    saveRecords();
    recordMessage = '🗑 인바디 기록을 모두 지웠어요.';
  }));

  // 그래프 위에 마우스·손가락을 올리면 가장 가까운 날의 값을 보여줘요
  box.querySelectorAll('.rc-wrap').forEach(wrap => {
    const pts = JSON.parse(wrap.dataset.points);
    const unit = wrap.dataset.unit;
    const digits = Number(wrap.dataset.digits);
    const svg = wrap.querySelector('svg');
    const tip = wrap.querySelector('.rc-tip');
    const cross = wrap.querySelector('.rc-cross');
    const show = e => {
      const rect = svg.getBoundingClientRect();
      const scale = rect.width / Number(wrap.dataset.w);
      const mx = (e.clientX - rect.left) / scale;
      const p = pts.reduce((a, b) => Math.abs(b.x - mx) < Math.abs(a.x - mx) ? b : a);
      cross.setAttribute('x1', p.x); cross.setAttribute('x2', p.x); cross.setAttribute('visibility', 'visible');
      tip.innerHTML = dateLabel(p.date) + '<br><b>' + fmtNum(p.value, digits) + unit + '</b>';
      tip.hidden = false;
      const left = Math.min(Math.max(p.x * scale, 50), rect.width - 50);
      tip.style.left = left + 'px';
      tip.style.top = Math.max(p.y * scale - 52, 0) + 'px';
    };
    const hide = () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); };
    svg.addEventListener('pointermove', show);
    svg.addEventListener('pointerdown', show);
    svg.addEventListener('pointerleave', hide);
  });
}

// 화면 크기가 바뀌면(휴대폰 가로·세로 전환 등) 그래프를 다시 그려요
let recordResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(recordResizeTimer);
  recordResizeTimer = setTimeout(renderRecords, 200);
});
