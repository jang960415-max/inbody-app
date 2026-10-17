// =====================================================================
//  앱의 동작 (계산, 입력 검사, 화면 바꾸기)
//  계산에 쓰는 숫자는 config.js 에 있어요.
// =====================================================================

// 가장 최근 분석 결과를 담아두는 곳 (다음 단계의 식단표·운동표에서 사용)
let latestResult = null;


// ---------------------------------------------------------------
// 1. 탭 바꾸기
// ---------------------------------------------------------------
function showTab(name) {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });
  document.querySelectorAll('.tab-page').forEach(page => {
    page.classList.toggle('active', page.id === 'tab-' + name);
  });
  window.scrollTo(0, 0);
}

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => showTab(btn.dataset.tab));
});


// ---------------------------------------------------------------
// 2. 입력값 읽기
// ---------------------------------------------------------------

// 숫자 칸 읽기 (비어 있으면 null)
function readNumber(id) {
  const text = document.getElementById(id).value.trim();
  if (text === '') return null;
  return Number(text);
}

// 선택지(라디오 버튼) 읽기 (아무것도 안 고르면 null)
function readChoice(name) {
  const checked = document.querySelector('input[name="' + name + '"]:checked');
  return checked ? checked.value : null;
}

function readForm() {
  const avoidText = document.getElementById('avoidFoods').value;
  return {
    sex:            readChoice('sex'),
    age:            readNumber('age'),
    height:         readNumber('height'),
    weight:         readNumber('weight'),
    skeletalMuscle: readNumber('skeletalMuscle'),
    fatMass:        readNumber('fatMass'),
    bodyFatPercent: readNumber('bodyFatPercent'),
    bmi:            readNumber('bmi'),
    bmr:            readNumber('bmr'),
    visceralFat:    readNumber('visceralFat'),   // 선택
    abdominalFat:   readNumber('abdominalFat'),  // 선택
    weightGoal:     readChoice('weightGoal'),   // lose / maintain / gain
    muscleGoal:     readChoice('muscleGoal'),   // gain / keep
    activity:       readChoice('activity'),
    experience:     readChoice('experience'),
    workoutDays:    readNumber('workoutDays'),
    workoutSets:    readNumber('workoutSets'),
    minutesPerSet:  readNumber('minutesPerSet'),
    place:          readChoice('place'),
    // "우유, 땅콩" → ["우유", "땅콩"]
    avoidFoods: avoidText.split(',').map(s => s.trim()).filter(s => s !== '')
  };
}


// ---------------------------------------------------------------
// 3. 입력값 검사
// ---------------------------------------------------------------

// 화면에 보여줄 이름과 단위
const FIELD_INFO = {
  age:            { name: '나이',            unit: '세' },
  height:         { name: '키',              unit: 'cm' },
  weight:         { name: '체중',            unit: 'kg' },
  skeletalMuscle: { name: '골격근량',        unit: 'kg' },
  fatMass:        { name: '체지방량',        unit: 'kg' },
  bodyFatPercent: { name: '체지방률',        unit: '%' },
  bmi:            { name: 'BMI',             unit: '' },
  bmr:            { name: '기초대사량',      unit: 'kcal' },
  visceralFat:    { name: '내장지방 레벨',   unit: '' },
  abdominalFat:   { name: '복부지방률',      unit: '' },
  workoutDays:    { name: '운동할 수 있는 날', unit: '일' },
  workoutSets:    { name: '하루 운동 세트 수', unit: '개' },
  minutesPerSet:  { name: '세트마다 운동 가능 시간', unit: '분' }
};

const CHOICE_INFO = {
  sex: '성별', weightGoal: '체중 목표', muscleGoal: '근육 목표', activity: '평소 활동량',
  experience: '운동 경험', place: '운동 장소'
};

const OPTIONAL_FIELDS = ['visceralFat', 'abdominalFat'];

// 받침에 맞춰 조사 고르기: withJosa('성별', '을', '를') → '성별을'
function withJosa(word, withBatchim, withoutBatchim) {
  const code = word.charCodeAt(word.length - 1) - 0xAC00;
  const hasBatchim = code >= 0 && code <= 11171 && code % 28 !== 0;
  return word + (hasBatchim ? withBatchim : withoutBatchim);
}

function validate(data) {
  const errors = [];
  const badFields = [];   // 빨갛게 표시할 칸

  // (1) 선택지를 골랐는지
  for (const key in CHOICE_INFO) {
    if (data[key] === null) {
      errors.push(withJosa(CHOICE_INFO[key], '을', '를') + ' 선택해 주세요.');
      badFields.push(key);
    }
  }

  // (2) 숫자가 비었거나 말이 안 되는 범위인지
  for (const key in FIELD_INFO) {
    const value = data[key];
    const info = FIELD_INFO[key];
    const [min, max] = CONFIG.inputLimits[key];

    if (value === null) {
      if (!OPTIONAL_FIELDS.includes(key)) {
        errors.push(withJosa(info.name, '을', '를') + ' 입력해 주세요.');
        badFields.push(key);
      }
      continue;
    }
    if (isNaN(value) || value < min || value > max) {
      errors.push(info.name + ' ' + value + info.unit + ': 말이 안 되는 숫자 같아요. '
        + min + '~' + max + info.unit + ' 사이인지 다시 확인해 주세요.');
      badFields.push(key);
    }
  }

  // (3) 숫자끼리 서로 맞는지 (위에서 문제없을 때만 확인)
  if (errors.length === 0) {
    if (data.fatMass >= data.weight) {
      errors.push('체지방량이 체중보다 클 수 없어요. 다시 확인해 주세요.');
      badFields.push('fatMass', 'weight');
    }
    if (data.skeletalMuscle + data.fatMass >= data.weight) {
      errors.push('골격근량 + 체지방량이 체중보다 커요. 다시 확인해 주세요.');
      badFields.push('skeletalMuscle', 'fatMass');
    }

    const calcPercent = data.fatMass / data.weight * 100;
    if (Math.abs(calcPercent - data.bodyFatPercent) > CONFIG.consistency.bodyFatPercentDiff) {
      errors.push('체지방률(' + data.bodyFatPercent + '%)이 체지방량÷체중(약 '
        + calcPercent.toFixed(1) + '%)과 많이 달라요. 결과지를 다시 확인해 주세요.');
      badFields.push('bodyFatPercent', 'fatMass');
    }

    const calcBmi = data.weight / Math.pow(data.height / 100, 2);
    if (Math.abs(calcBmi - data.bmi) > CONFIG.consistency.bmiDiff) {
      errors.push('BMI(' + data.bmi + ')가 키·체중으로 계산한 값(약 '
        + calcBmi.toFixed(1) + ')과 많이 달라요. 다시 확인해 주세요.');
      badFields.push('bmi', 'height', 'weight');
    }

    const totalMinutes = data.workoutSets * data.minutesPerSet;
    if (totalMinutes > CONFIG.maxTotalWorkoutMinutes) {
      errors.push('하루 총 운동 시간(' + totalMinutes + '분)이 너무 길어요. '
        + CONFIG.maxTotalWorkoutMinutes + '분 이하가 되도록 세트 수나 세트당 시간을 줄여주세요.');
      badFields.push('workoutSets', 'minutesPerSet');
    }
  }

  return { errors, badFields };
}

// 잘못된 칸을 빨갛게 표시하고, 오류 목록을 보여줘요
function showErrors(errors, badFields) {
  document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));

  badFields.forEach(key => {
    if (CHOICE_INFO[key]) {
      const group = document.querySelector('input[name="' + key + '"]').closest('.choices');
      group.classList.add('invalid');
    } else {
      document.getElementById(key).classList.add('invalid');
    }
  });

  const box = document.getElementById('error-box');
  if (errors.length === 0) {
    box.hidden = true;
    return;
  }
  box.innerHTML = '<b>다시 확인해 주세요</b><ul>'
    + errors.map(e => '<li>' + e + '</li>').join('') + '</ul>';
  box.hidden = false;
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}


// ---------------------------------------------------------------
// 4. 칼로리와 영양소 계산
// ---------------------------------------------------------------
function calculateNutrition(data) {
  const factor = CONFIG.activityFactors[data.activity];
  const goal = CONFIG.goals[data.weightGoal][data.muscleGoal];
  const adjust = goal.calorieAdjust;

  // 하루 소비 칼로리
  const tdee = data.bmr * factor;
  // 목표에 맞춘 칼로리
  let target = tdee * (1 + adjust);

  // 안전장치: 너무 낮게 추천하지 않기
  let floor = CONFIG.safety.minCalories[data.sex];
  if (CONFIG.safety.neverBelowBMR) floor = Math.max(floor, data.bmr);

  let raised = false;
  if (target < floor) {
    target = floor;
    raised = true;
  }
  target = Math.round(target / 10) * 10;   // 10kcal 단위로 반올림

  // 영양소 (g)
  const kcal = CONFIG.kcalPerGram;
  const proteinG = Math.round(data.weight * goal.proteinPerKg);
  const fatG = Math.round(target * CONFIG.fatRatio / kcal.fat);
  const carbKcal = Math.max(0, target - proteinG * kcal.protein - fatG * kcal.fat);
  const carbG = Math.round(carbKcal / kcal.carb);

  return {
    tdee: Math.round(tdee),
    factor, adjust, floor, raised, target,
    proteinPerKg: goal.proteinPerKg, tip: goal.tip,
    proteinG, fatG, carbG
  };
}


// ---------------------------------------------------------------
// 5. 수치를 쉬운 말로 풀기
// ---------------------------------------------------------------
const SEX_NAME = { male: '남성', female: '여성' };
const WEIGHT_GOAL_NAME = { lose: '체중 줄이기', maintain: '체중 유지', gain: '체중 늘리기' };
const MUSCLE_GOAL_NAME = { gain: '근육 늘리기', keep: '근육 유지' };

function goalName(data) {
  return WEIGHT_GOAL_NAME[data.weightGoal] + ' + ' + MUSCLE_GOAL_NAME[data.muscleGoal];
}
const ACTIVITY_NAME = { sedentary: '거의 안 움직임', light: '가볍게', moderate: '보통', active: '많이' };

function describeMetrics(data) {
  const ranges = CONFIG.standardRanges;
  const sexName = SEX_NAME[data.sex];
  const list = [];

  // BMI
  const b = ranges.bmi;
  let bmiBadge, bmiText;
  if (data.bmi < b.underweight)    { bmiBadge = ['warn', '저체중'];      bmiText = '키에 비해 체중이 적은 편이에요.'; }
  else if (data.bmi < b.overweight){ bmiBadge = ['good', '정상'];        bmiText = '키에 비해 체중이 적당한 편이에요.'; }
  else if (data.bmi < b.obese)     { bmiBadge = ['warn', '비만 전 단계']; bmiText = '키에 비해 체중이 조금 많은 편이에요.'; }
  else                             { bmiBadge = ['bad', '비만'];          bmiText = '키에 비해 체중이 많은 편이에요.'; }
  bmiText += ' (BMI ' + b.underweight + ' 미만 저체중, ' + b.overweight + ' 이상 비만 전 단계, ' + b.obese + ' 이상 비만 기준)';
  list.push({ name: 'BMI', value: data.bmi, badge: bmiBadge, text: bmiText });

  // 체지방률
  const [fatMin, fatMax] = ranges.bodyFatPercent[data.sex];
  let fatBadge, fatText;
  if (data.bodyFatPercent < fatMin) {
    fatBadge = ['warn', '낮은 편'];
    fatText = '체지방률이 ' + sexName + ' 표준 범위(' + fatMin + '~' + fatMax + '%)보다 낮은 편이에요.';
  } else if (data.bodyFatPercent <= fatMax) {
    fatBadge = ['good', '표준'];
    fatText = '체지방률이 ' + sexName + ' 표준 범위(' + fatMin + '~' + fatMax + '%) 안에 있어요.';
  } else {
    fatBadge = ['bad', '높은 편'];
    fatText = '체지방률이 ' + sexName + ' 표준 범위(' + fatMin + '~' + fatMax + '%)보다 높은 편이에요.';
  }
  // BMI는 높은데 체지방률은 표준 이하라면: 근육이 많아서일 수 있어요
  if (data.bmi >= b.overweight && data.bodyFatPercent <= fatMax) {
    fatText += ' BMI는 높게 나왔지만 체지방은 많지 않아서, 근육이 많은 체형일 수 있어요.';
  }
  list.push({ name: '체지방률', value: data.bodyFatPercent + '%', badge: fatBadge, text: fatText });

  // 체지방량
  list.push({
    name: '체지방량', value: data.fatMass + 'kg', badge: ['info', '참고'],
    text: '몸에 있는 지방의 무게예요. 체중 ' + data.weight + 'kg 중 ' + data.fatMass + 'kg이 지방이에요.'
  });

  // 골격근량
  const musclePercent = (data.skeletalMuscle / data.weight * 100).toFixed(1);
  list.push({
    name: '골격근량', value: data.skeletalMuscle + 'kg', badge: ['info', '참고'],
    text: '팔다리·몸통을 움직이는 근육의 무게예요. 체중의 ' + musclePercent + '%가 골격근이에요. '
      + '골격근의 표준 범위는 키에 따라 달라서 이 앱에서는 판단하지 않아요. 결과지의 표준 범위 막대를 함께 확인해 보세요.'
  });

  // 기초대사량
  list.push({
    name: '기초대사량', value: data.bmr + 'kcal', badge: ['info', '참고'],
    text: '하루 종일 가만히 누워만 있어도 몸이 쓰는 에너지예요. 하루 칼로리 계산의 기준이 돼요.'
  });

  // 내장지방 레벨 (선택)
  if (data.visceralFat !== null) {
    const high = ranges.visceralFatHigh;
    const isHigh = data.visceralFat >= high;
    list.push({
      name: '내장지방 레벨', value: data.visceralFat,
      badge: isHigh ? ['bad', '높은 편'] : ['good', '표준'],
      text: isHigh
        ? '배 속 장기 주변의 지방이 많은 편이에요. (' + high + ' 이상이면 높은 편)'
        : '배 속 장기 주변의 지방이 표준 범위에 있어요. (' + high + ' 미만이면 표준)'
    });
  }

  // 복부지방률 (선택)
  if (data.abdominalFat !== null) {
    const [aMin, aMax] = ranges.abdominalFatRatio[data.sex];
    let aBadge, aText;
    if (data.abdominalFat < aMin)       { aBadge = ['good', '낮은 편']; aText = '허리둘레가 엉덩이둘레에 비해 작은 편이에요.'; }
    else if (data.abdominalFat <= aMax) { aBadge = ['good', '표준'];    aText = '허리-엉덩이 둘레 비율이 표준 범위에 있어요.'; }
    else                                { aBadge = ['bad', '높은 편'];  aText = '허리둘레가 엉덩이둘레에 비해 큰 편이에요. 뱃살이 많은 편이에요.'; }
    aText += ' (' + sexName + ' 표준 ' + aMin + '~' + aMax + ', 기기마다 다를 수 있어요)';
    list.push({ name: '복부지방률', value: data.abdominalFat, badge: aBadge, text: aText });
  }

  return list;
}


// ---------------------------------------------------------------
// 6. 분석 결과를 화면에 그리기
// ---------------------------------------------------------------
function renderAnalysis(data, nutrition) {
  const n = nutrition;
  const metrics = describeMetrics(data);
  const kcal = CONFIG.kcalPerGram;

  // 수치 설명 카드
  const metricHtml = metrics.map(m =>
    '<div class="metric">'
    + '<div class="metric-top">'
    +   '<span class="metric-name">' + m.name
    +     '<span class="badge ' + m.badge[0] + '">' + m.badge[1] + '</span></span>'
    +   '<span class="metric-value">' + m.value + '</span>'
    + '</div>'
    + '<p class="metric-text">' + m.text + '</p>'
    + '</div>'
  ).join('');

  // 계산 과정 설명
  const adjustText = n.adjust === 0
    ? '목표가 ' + withJosa('"' + goalName(data), '"이라서', '"라서') + ' 칼로리는 그대로 둬요.'
    : '목표가 ' + withJosa('"' + goalName(data), '"이라서 ', '"라서 ') + Math.abs(Math.round(n.adjust * 100)) + '% '
      + (n.adjust < 0 ? '줄여요' : '늘려요') + ' → 약 ' + Math.round(n.tdee * (1 + n.adjust)).toLocaleString() + 'kcal';

  let safetyHtml = '';
  if (n.raised) {
    safetyHtml = '<div class="notice">⚠️ 계산한 값이 너무 낮아서, 안전을 위해 <b>'
      + n.floor.toLocaleString() + 'kcal</b>로 올렸어요. '
      + '(기초대사량 또는 ' + SEX_NAME[data.sex] + ' 최소 기준 '
      + CONFIG.safety.minCalories[data.sex].toLocaleString() + 'kcal 중 더 큰 값)</div>';
  }

  let ageHtml = '';
  if (data.age < 19) {
    ageHtml = '<div class="notice">⚠️ 이 계산 방식은 성인 기준이에요. 성장기에는 더 많은 영양이 필요할 수 있으니 '
      + '보호자나 전문가와 꼭 상의해 주세요.</div>';
  }

  // 저체중인데 체중을 줄이려고 할 때 알려주기
  let goalWarnHtml = '';
  if (data.weightGoal === 'lose' && data.bmi < CONFIG.standardRanges.bmi.underweight) {
    goalWarnHtml = '<div class="notice">⚠️ BMI가 저체중 범위인데 체중 줄이기를 골랐어요. '
      + '체중을 더 줄이기 전에 전문가와 상담해 보시는 걸 권해요.</div>';
  }

  // 탄·단·지 막대
  const macros = [
    { name: '탄수화물', g: n.carbG,    kcal: n.carbG * kcal.carb,       cls: 'macro-carb' },
    { name: '단백질',   g: n.proteinG, kcal: n.proteinG * kcal.protein, cls: 'macro-protein' },
    { name: '지방',     g: n.fatG,     kcal: n.fatG * kcal.fat,         cls: 'macro-fat' }
  ];
  const macroHtml = macros.map(m => {
    const percent = Math.round(m.kcal / n.target * 100);
    return '<div class="macro-row">'
      + '<div class="macro-top"><b>' + m.name + ' ' + m.g + 'g</b>'
      + '<span>' + m.kcal.toLocaleString() + 'kcal · ' + percent + '%</span></div>'
      + '<div class="macro-bar"><div class="' + m.cls + '" style="width:' + percent + '%"></div></div>'
      + '</div>';
  }).join('');

  document.getElementById('analysis-result').innerHTML =
    '<div class="card">'
    + '<h2>내 몸 상태</h2>' + metricHtml
    + '</div>'

    + '<div class="card">'
    + '<h2>하루 권장 칼로리</h2>'
    + '<div class="big-number">' + n.target.toLocaleString() + ' <span>kcal</span></div>'
    + '<p class="goal-line"><b>내 목표: ' + goalName(data) + '</b><br>' + n.tip + '</p>'
    + '<b>이렇게 계산했어요</b>'
    + '<ol class="steps">'
    +   '<li>인바디에서 잰 기초대사량: <b>' + data.bmr.toLocaleString() + 'kcal</b></li>'
    +   '<li>평소 활동량 "' + ACTIVITY_NAME[data.activity] + '"에 맞춰 ×' + n.factor
    +     ' → 하루에 쓰는 칼로리 약 <b>' + n.tdee.toLocaleString() + 'kcal</b></li>'
    +   '<li>' + adjustText + '</li>'
    +   '<li>' + (n.raised ? '너무 낮아서 안전장치 적용' : '10kcal 단위로 반올림해서')
    +     ' → 최종 <b>' + n.target.toLocaleString() + 'kcal</b></li>'
    + '</ol>'
    + safetyHtml + ageHtml + goalWarnHtml
    + '</div>'

    + '<div class="card">'
    + '<h2>하루 영양소 <small>(탄수화물·단백질·지방)</small></h2>'
    + macroHtml
    + '<p class="metric-text" style="margin-top:12px">'
    +   '단백질은 체중 1kg당 ' + n.proteinPerKg + 'g, 지방은 전체 칼로리의 '
    +   Math.round(CONFIG.fatRatio * 100) + '%, 탄수화물은 나머지 칼로리로 정했어요.'
    + '</p>'
    + '</div>';
}


// ---------------------------------------------------------------
// 7. "분석하기" 버튼을 눌렀을 때
// ---------------------------------------------------------------
document.getElementById('inbody-form').addEventListener('submit', event => {
  event.preventDefault();   // 페이지가 새로고침되지 않게 막기

  const data = readForm();
  const { errors, badFields } = validate(data);
  showErrors(errors, badFields);
  if (errors.length > 0) return;

  data.totalWorkoutMinutes = data.workoutSets * data.minutesPerSet;   // 운동표에서 사용
  const nutrition = calculateNutrition(data);
  latestResult = { data, nutrition };

  renderAnalysis(data, nutrition);
  showTab('analysis');
});

// ---------------------------------------------------------------
// 8. 엔터 키를 누르면 다음 입력칸으로 이동
// ---------------------------------------------------------------
const textInputs = Array.from(
  document.querySelectorAll('#inbody-form input[type="number"], #inbody-form input[type="text"]')
);

textInputs.forEach((input, index) => {
  const isLast = index === textInputs.length - 1;
  // 휴대폰 키보드의 엔터 버튼에 "다음" / "완료"가 보이게 해요
  input.setAttribute('enterkeyhint', isLast ? 'done' : 'next');

  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();   // 엔터로 바로 분석되지 않게 막기

    if (isLast) {
      input.blur();           // 마지막 칸이면 키보드만 닫아요
    } else {
      textInputs[index + 1].focus();
    }
  });
});

// ---------------------------------------------------------------
// 9. 총 운동 시간 자동 계산 (세트 수 × 세트당 시간)
// ---------------------------------------------------------------
function updateTotalMinutes() {
  const sets = readNumber('workoutSets');
  const minutes = readNumber('minutesPerSet');
  const box = document.getElementById('total-minutes');

  if (!sets || !minutes || sets < 0 || minutes < 0) {
    box.textContent = '세트 수와 세트당 시간을 넣으면 총 운동 시간이 나와요.';
    box.classList.remove('filled');
    return;
  }

  const total = sets * minutes;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  // 60분 이상이면 "1시간 30분"처럼 함께 보여줘요
  let timeText = total + '분';
  if (hours > 0) timeText += ' (' + hours + '시간' + (rest > 0 ? ' ' + rest + '분' : '') + ')';

  box.innerHTML = '총 운동 시간: ' + sets + '세트 × ' + minutes + '분 = <b>' + timeText + '</b>';
  box.classList.add('filled');
}

document.getElementById('workoutSets').addEventListener('input', updateTotalMinutes);
document.getElementById('minutesPerSet').addEventListener('input', updateTotalMinutes);

// 고친 칸은 빨간 표시를 지워요
document.getElementById('inbody-form').addEventListener('input', event => {
  event.target.classList.remove('invalid');
  const group = event.target.closest('.choices');
  if (group) group.classList.remove('invalid');
});
