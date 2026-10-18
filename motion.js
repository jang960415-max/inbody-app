// =====================================================================
//  🎬 운동 동작 설명 + 막대 인형 애니메이션
//
//  - 운동 줄 오른쪽 "▶ 동작" 버튼을 누르면 이 파일의 설명과 애니메이션이 떠요.
//  - 애니메이션은 영상 파일이 아니라, 관절 각도로 그리는 간단한 선 그림이에요 (인터넷 없이 동작).
//  - 설명 출처 표시
//    [계획표] 사회인야구 투수 비시즌 주간 운동계획표 PDF   [능력] 투수에게 필요한 운동능력과 훈련법 PDF
//    [헬마드] 유튜브 헬마드 영상 (헬마드_맨몸운동_정리.md)
//    [KBO] KBO 유소년 투수 교육 "수건을 이용한 훈련법" 영상
//    [코어영상] 유튜브 멸치탈출연구소 "코어운동만 디테일하게" 영상 (데드버그·코펜하겐·사이드 플랭크)
//    [닥터짱] 유튜브 닥터짱 "팔로프 프레스" 영상
//    [일반] 일반적으로 알려진 바른 자세 기준
// =====================================================================


// ---------------------------------------------------------------
// 1. 막대 인형 그리기
//    각도 규칙 (옆에서 본 모습, 오른쪽을 보고 서 있어요)
//    - 팔·다리: 0 = 아래로, 90 = 앞(오른쪽), -90 = 뒤(왼쪽), 180 = 위
//    - 몸통 t: 0 = 똑바로 섬, 90 = 앞으로 엎드림(머리가 오른쪽), -90 = 뒤로 누움(머리가 왼쪽)
//    - l* = 먼 쪽 팔다리(연한 색), r* = 가까운 쪽 팔다리(진한 색)
//    - 정면 모습(view: 'front')에서는 각도가 화면 기준 (양수 = 화면 오른쪽)
// ---------------------------------------------------------------
const MOTION_BOX = { w: 240, h: 190, ground: 172 };
const BONE = { torso: 44, headGap: 14, headR: 9, upper: 25, fore: 23, thigh: 32, shin: 31, foot: 9, shoulderW: 11, hipW: 6 };
const POSE_DEFAULT = { t: 0, lt: 0, ls: 0, rt: 0, rs: 0, lu: 6, lf: 6, ru: -6, rf: -6, lfo: 0, rfo: 0, x: 120, lift: 0 };

function vec(deg) {
  const r = deg * Math.PI / 180;
  return [Math.sin(r), Math.cos(r)];
}
function add(p, d, len) {
  return [p[0] + d[0] * len, p[1] + d[1] * len];
}

// 각도 → 관절 좌표
function solvePose(pose, view) {
  const p = Object.assign({}, POSE_DEFAULT, pose);
  const hip = [p.x, 100];
  const up = [Math.sin(p.t * Math.PI / 180), -Math.cos(p.t * Math.PI / 180)];
  const neck = add(hip, up, BONE.torso);
  const head = add(neck, up, BONE.headGap);
  const side = [up[1] * -1, up[0]];   // 몸통에 직각인 방향 (정면 모습에서 어깨·골반 벌리기)

  let shL = neck, shR = neck, hpL = hip, hpR = hip;
  if (view === 'front') {
    shL = add(neck, side, -BONE.shoulderW); shR = add(neck, side, BONE.shoulderW);   // 왼쪽 = 화면 왼쪽
    hpL = add(hip, side, -BONE.hipW); hpR = add(hip, side, BONE.hipW);
  }
  const limb = (start, a1, l1, a2, l2) => { const m = add(start, vec(a1), l1); return [m, add(m, vec(a2), l2)]; };
  const [lElbow, lHand] = limb(shL, p.lu, BONE.upper, p.lf, BONE.fore);
  const [rElbow, rHand] = limb(shR, p.ru, BONE.upper, p.rf, BONE.fore);
  const [lKnee, lAnkle] = limb(hpL, p.lt, BONE.thigh, p.ls, BONE.shin);
  const [rKnee, rAnkle] = limb(hpR, p.rt, BONE.thigh, p.rs, BONE.shin);
  const footDir = (shin, isLeft, extra) => view === 'front' ? vec(shin + (isLeft ? -90 : 90)) : vec(shin + 90 + extra);
  const lToe = add(lAnkle, footDir(p.ls, true, p.lfo), BONE.foot);
  const rToe = add(rAnkle, footDir(p.rs, false, p.rfo), BONE.foot);

  return { hip, neck, head, shL, shR, hpL, hpR, lElbow, lHand, rElbow, rHand, lKnee, lAnkle, rKnee, rAnkle, lToe, rToe, lift: p.lift };
}

// 바닥에 닿게 내리기 (또는 정해진 점에 고정하기)
function placePose(j, anim) {
  let dx = 0, dy = 0;
  if (anim.anchor) {
    const a = j[anim.anchor.joint];
    dx = anim.anchor.x - a[0]; dy = anim.anchor.y - a[1];
  } else {
    const pts = ['hip', 'neck', 'lElbow', 'lHand', 'rElbow', 'rHand', 'lKnee', 'lAnkle', 'rKnee', 'rAnkle', 'lToe', 'rToe'].map(k => j[k]);
    pts.push([j.head[0], j.head[1] + BONE.headR]);
    const maxY = Math.max(...pts.map(q => q[1]));
    dy = MOTION_BOX.ground - maxY - (j.lift || 0);
  }
  const out = {};
  Object.keys(j).forEach(k => { out[k] = Array.isArray(j[k]) ? [j[k][0] + dx, j[k][1] + dy] : j[k]; });
  return out;
}

// SVG로 그리기
function drawFigure(j, anim) {
  const line = (a, b, cls) => '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" class="' + cls + '"/>';
  let s = '<line x1="8" y1="' + MOTION_BOX.ground + '" x2="' + (MOTION_BOX.w - 8) + '" y2="' + MOTION_BOX.ground + '" class="mf-ground"/>';

  // 도구 그림 (벽, 의자, 봉, 밴드)
  (anim.props || []).forEach(pr => {
    if (pr.type === 'wall') s += '<line x1="' + pr.x + '" y1="20" x2="' + pr.x + '" y2="' + MOTION_BOX.ground + '" class="mf-prop"/>';
    if (pr.type === 'box') s += '<rect x="' + pr.x + '" y="' + (MOTION_BOX.ground - pr.h) + '" width="' + pr.w + '" height="' + pr.h + '" class="mf-box"/>';
    if (pr.type === 'bench' && anim._bench) s += '<rect x="' + (anim._bench[0] - 16) + '" y="' + anim._bench[1] + '" width="32" height="' + (MOTION_BOX.ground - anim._bench[1]) + '" class="mf-box"/>';
    if (pr.type === 'bar' && anim.anchor) s += '<line x1="' + (anim.anchor.x - 22) + '" y1="' + anim.anchor.y + '" x2="' + (anim.anchor.x + 22) + '" y2="' + anim.anchor.y + '" class="mf-bar"/>';
    if (pr.type === 'band') s += line(j.rHand, [pr.x, pr.y], 'mf-band');
  });

  const far = 'mf-far', near = 'mf-near';
  // 먼 쪽 팔다리 → 몸통 → 가까운 쪽 팔다리 순서로 그려요
  s += line(j.hpL, j.lKnee, far) + line(j.lKnee, j.lAnkle, far) + line(j.lAnkle, j.lToe, far);
  s += line(j.shL, j.lElbow, far) + line(j.lElbow, j.lHand, far);
  if (anim.view === 'front') s += line(j.shL, j.shR, near) + line(j.hpL, j.hpR, near);
  s += line(j.hip, j.neck, near);
  s += '<circle cx="' + j.head[0].toFixed(1) + '" cy="' + j.head[1].toFixed(1) + '" r="' + BONE.headR + '" class="mf-head"/>';
  s += line(j.hpR, j.rKnee, near) + line(j.rKnee, j.rAnkle, near) + line(j.rAnkle, j.rToe, near);
  s += line(j.shR, j.rElbow, near) + line(j.rElbow, j.rHand, near);
  return s;
}

function lerpPose(a, b, u) {
  const out = {};
  const keys = new Set(Object.keys(POSE_DEFAULT).concat(Object.keys(a), Object.keys(b)));
  keys.forEach(k => {
    const va = a[k] !== undefined ? a[k] : POSE_DEFAULT[k];
    const vb = b[k] !== undefined ? b[k] : POSE_DEFAULT[k];
    out[k] = va + (vb - va) * u;
  });
  return out;
}


// ---------------------------------------------------------------
// 2. 자주 쓰는 자세
// ---------------------------------------------------------------
const S = {   // side view
  stand:    { t: 0, lt: 0, ls: 0, rt: 0, rs: 0, lu: 4, lf: 4, ru: -4, rf: -4 },
  squat:    { t: 38, lt: 88, ls: -22, rt: 88, rs: -22, lu: 88, lf: 88, ru: 88, rf: 88 },
  pushTop:  { t: 62, lt: -62, ls: -62, rt: -62, rs: -62, lu: 0, lf: 0, ru: 0, rf: 0 },
  pushBot:  { t: 78, lt: -78, ls: -78, rt: -78, rs: -78, lu: -55, lf: 25, ru: -55, rf: 25 },
  plank:    { t: 78, lt: -78, ls: -78, rt: -78, rs: -78, lu: 0, lf: 90, ru: 0, rf: 90 },
  quad:     { t: 70, lt: 0, ls: -90, rt: 0, rs: -90, lu: 0, lf: 0, ru: 0, rf: 0 },
  supine:   { t: -90, lt: 150, ls: -15, rt: 150, rs: -15, lu: 90, lf: 90, ru: 90, rf: 90 },
  prone:    { t: 88, lt: -90, ls: -90, rt: -90, rs: -90, lu: 92, lf: 92, ru: 92, rf: 92 }
};
const F = {   // front view
  stand: { t: 0, lt: -6, ls: -6, rt: 6, rs: 6, lu: -8, lf: -8, ru: 8, rf: 8 }
};
const P = (base, over) => Object.assign({}, base, over || {});


// ---------------------------------------------------------------
// 3. 애니메이션 목록 (frames: 자세, ms: 이 자세까지 움직이는 시간, hold: 멈춰 있는 시간, label: 단계 이름)
// ---------------------------------------------------------------
const MOTION_ANIMS = {
  squat: { view: 'side', frames: [
    { p: S.stand, ms: 700, hold: 300, label: '발 어깨너비로 서기' },
    { p: S.squat, ms: 1100, hold: 250, label: '엉덩이 뒤로, 의자에 앉듯이' },
    { p: S.stand, ms: 900, hold: 200, label: '발바닥으로 밀며 일어나기' }] },

  jumpsquat: { view: 'side', frames: [
    { p: S.stand, ms: 600, hold: 200, label: '서기' },
    { p: P(S.squat, { lu: -40, lf: -40, ru: -40, rf: -40 }), ms: 800, hold: 100, label: '앉으며 팔 뒤로' },
    { p: P(S.stand, { lu: 165, lf: 165, ru: 165, rf: 165, lift: 30 }), ms: 300, hold: 80, label: '위로 점프' },
    { p: P(S.squat, { t: 25, lt: 55, ls: -15, rt: 55, rs: -15, lu: 60, lf: 60, ru: 60, rf: 60 }), ms: 300, hold: 300, label: '무릎 굽히며 사뿐히 착지' },
    { p: S.stand, ms: 600, hold: 200, label: '바로 서기' }] },

  wallsit: { view: 'side', props: [{ type: 'wall', x: 98 }], frames: [
    { p: P(S.stand, { x: 106 }), ms: 600, hold: 300, label: '벽에 등 붙이기' },
    { p: { x: 106, t: 0, lt: 90, ls: 0, rt: 90, rs: 0, lu: 0, lf: 0, ru: 0, rf: 0 }, ms: 1100, hold: 1800, label: '무릎 90도, 버티기 (손은 허벅지에 X)' },
    { p: P(S.stand, { x: 106 }), ms: 900, hold: 200, label: '천천히 일어나기' }] },

  lunge: { view: 'side', frames: [
    { p: S.stand, ms: 600, hold: 300, label: '바로 서기' },
    { p: { t: 4, rt: 85, rs: 0, lt: -22, ls: -95, lu: 0, lf: 0, ru: 0, rf: 0 }, ms: 1100, hold: 250, label: '한 발 뒤로, 엉덩이를 아래로' },
    { p: S.stand, ms: 900, hold: 200, label: '앞발 전체로 밀며 돌아오기' }] },

  lungerotate: { view: 'side', frames: [
    { p: S.stand, ms: 600, hold: 200, label: '바로 서기' },
    { p: { t: 4, rt: 85, rs: 0, lt: -22, ls: -95, lu: 90, lf: 90, ru: 90, rf: 90 }, ms: 900, hold: 200, label: '런지 자세로 팔 앞으로' },
    { p: { t: 4, rt: 85, rs: 0, lt: -22, ls: -95, lu: 90, lf: 90, ru: -90, rf: -90 }, ms: 900, hold: 300, label: '앞다리 쪽으로 몸통 돌리며 팔 펼치기' },
    { p: S.stand, ms: 800, hold: 200, label: '돌아와 반대쪽' }] },

  bulgarian: { view: 'side', props: [{ type: 'bench', joint: 'lToe' }], frames: [
    { p: { t: 8, rt: 25, rs: -5, lt: -42, ls: -105, lu: 0, lf: 0, ru: 0, rf: 0 }, ms: 600, hold: 300, label: '뒷발을 의자에 올리기' },
    { p: { t: 14, rt: 82, rs: -2, lt: -12, ls: -118, lu: 0, lf: 0, ru: 0, rf: 0 }, ms: 1200, hold: 250, label: '수직으로 내려가기' },
    { p: { t: 8, rt: 25, rs: -5, lt: -42, ls: -105, lu: 0, lf: 0, ru: 0, rf: 0 }, ms: 900, hold: 200, label: '앞발로 밀어 올라오기' }] },

  sidelunge: { view: 'front', frames: [
    { p: P(F.stand, { lu: 20, lf: 150, ru: -20, rf: -150 }), ms: 600, hold: 300, label: '두 발 넓게 서기' },
    { p: { x: 140, t: 8, rt: 55, rs: -8, lt: -42, ls: -42, lu: 20, lf: 150, ru: -20, rf: -150 }, ms: 1100, hold: 250, label: '한쪽으로 앉기, 반대 다리 쭉' },
    { p: P(F.stand, { lu: 20, lf: 150, ru: -20, rf: -150 }), ms: 900, hold: 200, label: '밀어서 돌아오기' }] },

  stepup: { view: 'side', props: [{ type: 'box', x: 118, w: 46, h: 24 }], frames: [
    { p: P(S.stand, { x: 98 }), ms: 600, hold: 300, label: '의자 앞에 서기' },
    { p: { x: 104, t: 15, rt: 78, rs: -5, lt: 0, ls: 0, lu: 10, lf: 10, ru: -10, rf: -10 }, ms: 800, hold: 200, label: '한 발 전체 올리기' },
    { p: P(S.stand, { x: 135, lift: 24 }), ms: 900, hold: 300, label: '올린 발로 밀어 올라서기' },
    { p: P(S.stand, { x: 98 }), ms: 1000, hold: 200, label: '천천히 내려오기' }] },

  rdl: { view: 'side', frames: [
    { p: P(S.stand, { lt: 8 }), ms: 600, hold: 300, label: '한 발로 서기' },
    { p: { t: 86, rt: 6, rs: 0, lt: -86, ls: -86, lu: 0, lf: 0, ru: 0, rf: 0 }, ms: 1300, hold: 250, label: '엉덩이 뒤로, 뒷다리와 일직선' },
    { p: P(S.stand, { lt: 8 }), ms: 1000, hold: 200, label: '엉덩이 힘으로 일어나기' }] },

  bridge: { view: 'side', frames: [
    { p: S.supine, ms: 600, hold: 300, label: '누워 무릎 세우기' },
    { p: P(S.supine, { t: -66, lt: 118, ls: -8, rt: 118, rs: -8 }), ms: 900, hold: 900, label: '엉덩이 들기, 위에서 2초' },
    { p: S.supine, ms: 900, hold: 200, label: '천천히 내리기' }] },

  calf: { view: 'side', frames: [
    { p: S.stand, ms: 600, hold: 300, label: '바로 서기' },
    { p: P(S.stand, { lfo: 48, rfo: 48 }), ms: 700, hold: 500, label: '뒤꿈치 최대한 들기' },
    { p: S.stand, ms: 900, hold: 200, label: '천천히 내리기' }] },

  pushup: { view: 'side', frames: [
    { p: S.pushTop, ms: 600, hold: 300, label: '머리~발끝 일직선' },
    { p: S.pushBot, ms: 1100, hold: 200, label: '팔꿈치 45도로 내려가기' },
    { p: S.pushTop, ms: 800, hold: 200, label: '바닥 밀어 올라오기' }] },

  pushupknee: { view: 'side', frames: [
    { p: P(S.pushTop, { t: 48, lt: -48, ls: -150, rt: -48, rs: -150 }), ms: 600, hold: 300, label: '무릎 대고 일직선' },
    { p: P(S.pushBot, { t: 66, lt: -66, ls: -160, rt: -66, rs: -160 }), ms: 1100, hold: 200, label: '가슴을 바닥 가까이' },
    { p: P(S.pushTop, { t: 48, lt: -48, ls: -150, rt: -48, rs: -150 }), ms: 800, hold: 200, label: '밀어 올라오기' }] },

  pushupplus: { view: 'side', frames: [
    { p: S.pushTop, ms: 600, hold: 200, label: '푸시업 위 자세' },
    { p: S.pushBot, ms: 1000, hold: 150, label: '내려가기' },
    { p: S.pushTop, ms: 800, hold: 100, label: '올라오기' },
    { p: P(S.pushTop, { t: 57, lt: -60, ls: -60, rt: -60, rs: -60 }), ms: 500, hold: 500, label: '+ 등을 한 번 더 밀어 올리기' }] },

  shouldertap: { view: 'side', frames: [
    { p: S.pushTop, ms: 500, hold: 200, label: '푸시업 위 자세, 발 넓게' },
    { p: P(S.pushTop, { ru: 150, rf: -150 }), ms: 450, hold: 250, label: '한 손으로 반대 어깨 치기' },
    { p: S.pushTop, ms: 450, hold: 150, label: '골반 흔들리지 않게' },
    { p: P(S.pushTop, { lu: 150, lf: -150 }), ms: 450, hold: 250, label: '반대쪽' }] },

  plank: { view: 'side', frames: [
    { p: S.plank, ms: 400, hold: 1400, label: '팔꿈치는 어깨 아래' },
    { p: P(S.plank, { t: 79 }), ms: 600, hold: 1400, label: '머리~발뒤꿈치 일직선, 숨 쉬며 버티기' }] },

  sideplank: { view: 'side', frames: [
    { p: P(S.plank, { t: 70, lt: -70, ls: -70, rt: -70, rs: -70, lu: 180, lf: 180 }), ms: 400, hold: 1400, label: '옆구리 힘으로 받치기' },
    { p: P(S.plank, { t: 71, lt: -71, ls: -71, rt: -71, rs: -71, lu: 180, lf: 180 }), ms: 600, hold: 1400, label: '어깨로 버티지 않기, 숨 내쉬기' }] },

  copenhagen: { view: 'side', props: [{ type: 'bench', joint: 'lKnee' }], frames: [
    { p: { t: 76, lt: -76, ls: -76, rt: -30, rs: -30, lu: 180, lf: 180, ru: 0, rf: 90 }, ms: 400, hold: 1500, label: '위쪽 무릎 안쪽을 의자에, 아래 다리는 아래로' },
    { p: { t: 77, lt: -77, ls: -77, rt: -30, rs: -30, lu: 180, lf: 180, ru: 0, rf: 90 }, ms: 600, hold: 1500, label: '엉덩이 들고, 몸통이 돌아가지 않게' }] },

  deadbug: { view: 'side', frames: [
    { p: { t: -90, lt: 180, ls: 90, rt: 180, rs: 90, lu: 180, lf: 180, ru: 180, rf: 180 }, ms: 500, hold: 300, label: '누워 팔은 위, 무릎 90도' },
    { p: { t: -90, lt: 95, ls: 95, rt: 180, rs: 90, lu: 180, lf: 180, ru: -95, rf: -95 }, ms: 1100, hold: 300, label: '한 팔 머리 뒤 + 반대 다리 쭉 (허리는 바닥에)' },
    { p: { t: -90, lt: 180, ls: 90, rt: 180, rs: 90, lu: 180, lf: 180, ru: 180, rf: 180 }, ms: 900, hold: 200, label: '돌아오기' },
    { p: { t: -90, lt: 180, ls: 90, rt: 95, rs: 95, lu: -95, lf: -95, ru: 180, rf: 180 }, ms: 1100, hold: 300, label: '반대쪽' },
    { p: { t: -90, lt: 180, ls: 90, rt: 180, rs: 90, lu: 180, lf: 180, ru: 180, rf: 180 }, ms: 900, hold: 200, label: '돌아오기' }] },

  hollow: { view: 'side', frames: [
    { p: { t: -90, lt: 90, ls: 90, rt: 90, rs: 90, lu: 90, lf: 90, ru: 90, rf: 90 }, ms: 500, hold: 300, label: '누워서 허리를 바닥에 붙이기' },
    { p: { t: -74, lt: 102, ls: 102, rt: 102, rs: 102, lu: -112, lf: -112, ru: -112, rf: -112 }, ms: 900, hold: 1600, label: '팔다리 살짝 들고 버티기 (떨리면 정상)' },
    { p: { t: -90, lt: 90, ls: 90, rt: 90, rs: 90, lu: 90, lf: 90, ru: 90, rf: 90 }, ms: 800, hold: 200, label: '천천히 내리기' }] },

  birddog: { view: 'side', frames: [
    { p: S.quad, ms: 500, hold: 300, label: '네발 기기' },
    { p: P(S.quad, { ru: 92, rf: 92, lt: -88, ls: -88 }), ms: 900, hold: 700, label: '한 팔 앞 + 반대 다리 뒤, 2초' },
    { p: S.quad, ms: 700, hold: 200, label: '돌아오기' },
    { p: P(S.quad, { lu: 92, lf: 92, rt: -88, rs: -88 }), ms: 900, hold: 700, label: '반대쪽' },
    { p: S.quad, ms: 700, hold: 200, label: '돌아오기' }] },

  bearcrawl: { view: 'side', frames: [
    { p: P(S.quad, { x: 100, lt: 12, ls: -62, rt: 12, rs: -62 }), ms: 500, hold: 200, label: '무릎을 바닥에서 살짝 띄우기' },
    { p: P(S.quad, { x: 110, lt: 30, ls: -45, rt: 4, rs: -70, ru: 18, rf: 18, lu: -6, lf: -6 }), ms: 500, hold: 0, label: '반대 손발 함께 짧게' },
    { p: P(S.quad, { x: 120, lt: 12, ls: -62, rt: 12, rs: -62 }), ms: 500, hold: 0, label: '엉덩이는 낮게' },
    { p: P(S.quad, { x: 130, lt: 4, ls: -70, rt: 30, rs: -45, lu: 18, lf: 18, ru: -6, rf: -6 }), ms: 500, hold: 0, label: '반대쪽' },
    { p: P(S.quad, { x: 140, lt: 12, ls: -62, rt: 12, rs: -62 }), ms: 500, hold: 300, label: '등은 일직선' },
    { p: P(S.quad, { x: 100, lt: 12, ls: -62, rt: 12, rs: -62 }), ms: 1400, hold: 200, label: '뒤로 돌아가기' }] },

  superman: { view: 'side', frames: [
    { p: S.prone, ms: 500, hold: 300, label: '엎드려 팔 앞으로' },
    { p: P(S.prone, { t: 78, lt: -80, ls: -80, rt: -80, rs: -80, lu: 104, lf: 104, ru: 104, rf: 104 }), ms: 900, hold: 800, label: '팔다리 동시에 들기, 2초' },
    { p: S.prone, ms: 800, hold: 200, label: '천천히 내리기' }] },

  pronew: { view: 'side', frames: [
    { p: S.prone, ms: 500, hold: 300, label: '엎드려 팔 앞으로' },
    { p: P(S.prone, { t: 82, lu: -50, lf: 70, ru: -50, rf: 70 }), ms: 900, hold: 700, label: '팔꿈치를 옆구리로, 날개뼈 모으기 (W)' },
    { p: S.prone, ms: 800, hold: 200, label: '돌아가기' }] },

  invrow: { view: 'side', props: [{ type: 'bar' }], anchor: { joint: 'rHand', x: 172, y: 94 }, frames: [
    { p: { t: 72, lt: -72, ls: -72, rt: -72, rs: -72, lu: 168, lf: 168, ru: 168, rf: 168 }, ms: 600, hold: 300, label: '봉 아래 몸 일직선 (발뒤꿈치 바닥)' },
    { p: { t: 48, lt: -48, ls: -48, rt: -48, rs: -48, lu: -40, lf: 130, ru: -40, rf: 130 }, ms: 1000, hold: 300, label: '가슴을 봉 쪽으로, 날개뼈 모으기' },
    { p: { t: 72, lt: -72, ls: -72, rt: -72, rs: -72, lu: 168, lf: 168, ru: 168, rf: 168 }, ms: 1000, hold: 200, label: '천천히 내리기' }] },

  bandrow: { view: 'side', props: [{ type: 'band', x: 228, y: 98 }], frames: [
    { p: P(S.stand, { lu: 90, lf: 90, ru: 90, rf: 90, rt: 8, lt: -8 }), ms: 600, hold: 300, label: '밴드 잡고 팔 앞으로' },
    { p: P(S.stand, { lu: -38, lf: 72, ru: -38, rf: 72, rt: 8, lt: -8 }), ms: 900, hold: 400, label: '팔꿈치를 뒤로, 날개뼈 모으기' },
    { p: P(S.stand, { lu: 90, lf: 90, ru: 90, rf: 90, rt: 8, lt: -8 }), ms: 900, hold: 200, label: '천천히 돌아가기' }] },

  dbrow: { view: 'side', props: [{ type: 'box', x: 168, w: 40, h: 40 }], frames: [
    { p: { t: 70, rt: 12, rs: 0, lt: -14, ls: 0, lu: 22, lf: 22, ru: 0, rf: 0 }, ms: 600, hold: 300, label: '한 손 의자 짚고 숙이기' },
    { p: { t: 70, rt: 12, rs: 0, lt: -14, ls: 0, lu: 22, lf: 22, ru: -75, rf: 8 }, ms: 900, hold: 300, label: '팔꿈치를 엉덩이 쪽으로 당기기' },
    { p: { t: 70, rt: 12, rs: 0, lt: -14, ls: 0, lu: 22, lf: 22, ru: 0, rf: 0 }, ms: 900, hold: 200, label: '천천히 내리기' }] },

  facepull: { view: 'side', props: [{ type: 'band', x: 228, y: 58 }], frames: [
    { p: P(S.stand, { lu: 118, lf: 118, ru: 118, rf: 118 }), ms: 600, hold: 300, label: '밴드를 얼굴 높이로 잡기' },
    { p: P(S.stand, { lu: -96, lf: 168, ru: -96, rf: 168 }), ms: 900, hold: 400, label: '손은 얼굴 쪽, 팔꿈치는 높게' },
    { p: P(S.stand, { lu: 118, lf: 118, ru: 118, rf: 118 }), ms: 900, hold: 200, label: '돌아가기' }] },

  bander: { view: 'front', frames: [
    { p: P(F.stand, { lu: -4, lf: 70, ru: 4, rf: -70 }), ms: 600, hold: 300, label: '팔꿈치는 옆구리에, 90도' },
    { p: P(F.stand, { lu: -4, lf: -80, ru: 4, rf: 80 }), ms: 900, hold: 300, label: '바깥으로 돌리기' },
    { p: P(F.stand, { lu: -4, lf: 70, ru: 4, rf: -70 }), ms: 900, hold: 200, label: '안쪽으로 돌아오기 (가볍게)' }] },

  pullapart: { view: 'front', frames: [
    { p: P(F.stand, { lu: -70, lf: 60, ru: 70, rf: -60 }), ms: 600, hold: 200, label: '밴드 잡고 팔 앞으로' },
    { p: P(F.stand, { lu: -90, lf: -90, ru: 90, rf: 90 }), ms: 800, hold: 300, label: '양옆으로 당기기, 날개뼈 모으기' },
    { p: P(F.stand, { lu: -70, lf: 60, ru: 70, rf: -60 }), ms: 800, hold: 200, label: '돌아오기' }] },

  er90: { view: 'front', frames: [
    { p: P(F.stand, { ru: 90, rf: 25 }), ms: 600, hold: 300, label: '팔을 옆으로 들고 팔꿈치 90도' },
    { p: P(F.stand, { ru: 90, rf: 178 }), ms: 1000, hold: 300, label: '팔뚝을 위로 세우기 (바깥 돌리기)' },
    { p: P(F.stand, { ru: 90, rf: 25 }), ms: 1000, hold: 200, label: '천천히 돌아오기' }] },

  ytw: { view: 'front', frames: [
    { p: F.stand, ms: 500, hold: 300, label: '엎드려서(또는 숙여서) 이 모양으로' },
    { p: P(F.stand, { lu: -152, lf: -152, ru: 152, rf: 152 }), ms: 800, hold: 500, label: 'Y' },
    { p: P(F.stand, { lu: -90, lf: -90, ru: 90, rf: 90 }), ms: 700, hold: 500, label: 'T' },
    { p: P(F.stand, { lu: -70, lf: -168, ru: 70, rf: 168 }), ms: 700, hold: 500, label: 'W (날개뼈 모으기)' }] },

  wallangel: { view: 'front', frames: [
    { p: P(F.stand, { lu: -70, lf: -168, ru: 70, rf: 168 }), ms: 600, hold: 300, label: '등·엉덩이·머리를 벽에, 팔은 W' },
    { p: P(F.stand, { lu: -158, lf: -165, ru: 158, rf: 165 }), ms: 1100, hold: 300, label: '벽에서 떨어지지 않게 위로' },
    { p: P(F.stand, { lu: -70, lf: -168, ru: 70, rf: 168 }), ms: 1000, hold: 200, label: '천천히 내리기' }] },

  crossbody: { view: 'front', frames: [
    { p: P(F.stand, { ru: -82, rf: -82, lu: -18, lf: 70 }), ms: 700, hold: 1800, label: '팔을 가슴 앞으로, 반대 팔로 당기기 30초' },
    { p: F.stand, ms: 700, hold: 300, label: '반대쪽도' }] },

  s9090: { view: 'side', frames: [
    { p: { t: 0, rt: 90, rs: 20, lt: -90, ls: -20, lu: 10, lf: 10, ru: 30, rf: 30 }, ms: 600, hold: 500, label: '앞다리·뒷다리 모두 90도로 앉기' },
    { p: { t: 34, rt: 90, rs: 20, lt: -90, ls: -20, lu: 60, lf: 60, ru: 60, rf: 60 }, ms: 1000, hold: 1400, label: '허리 곧게, 앞다리 쪽으로 숙이기' },
    { p: { t: 0, rt: 90, rs: 20, lt: -90, ls: -20, lu: 10, lf: 10, ru: 30, rf: 30 }, ms: 900, hold: 200, label: '반대쪽도' }] },

  openbook: { view: 'front', frames: [
    { p: P(F.stand, { t: 0, lu: 90, lf: 90, ru: 90, rf: 90 }), ms: 600, hold: 300, label: '옆으로 누워 두 팔을 앞으로 모으기' },
    { p: P(F.stand, { t: -8, lu: 90, lf: 90, ru: 180, rf: 180 }), ms: 800, hold: 100, label: '위쪽 팔을 천천히' },
    { p: P(F.stand, { t: -14, lu: 90, lf: 90, ru: -90, rf: -90 }), ms: 800, hold: 600, label: '책 펼치듯 반대쪽으로, 눈은 손을 따라' },
    { p: P(F.stand, { t: 0, lu: 90, lf: 90, ru: 90, rf: 90 }), ms: 1200, hold: 200, label: '돌아오기' }] },

  inchworm: { view: 'side', anchor: { joint: 'rToe', x: 70, y: MOTION_BOX.ground }, frames: [
    { p: S.stand, ms: 600, hold: 300, label: '바로 서기' },
    { p: { t: 168, lt: 0, ls: 0, rt: 0, rs: 0, lu: 0, lf: 0, ru: 0, rf: 0 }, ms: 1000, hold: 200, label: '무릎 펴고 숙여 손을 바닥에' },
    { p: { t: 110, lt: -20, ls: -20, rt: -20, rs: -20, lu: 0, lf: 0, ru: 0, rf: 0 }, ms: 900, hold: 0, label: '손으로 걸어 나가기' },
    { p: S.pushTop, ms: 900, hold: 400, label: '푸시업 자세까지 (어깨는 귀에서 멀리)' },
    { p: { t: 168, lt: 0, ls: 0, rt: 0, rs: 0, lu: 0, lf: 0, ru: 0, rf: 0 }, ms: 1300, hold: 100, label: '손을 발 쪽으로 걸어오기' },
    { p: S.stand, ms: 900, hold: 200, label: '일어나기' }] },

  woodchop: { view: 'front', frames: [
    { p: { t: -6, lt: -10, ls: -10, rt: 10, rs: 10, lu: 148, lf: 148, ru: 148, rf: 148 }, ms: 600, hold: 300, label: '두 손으로 밴드를 높이 잡기' },
    { p: { t: 14, lt: -18, ls: -4, rt: 20, rs: 4, lu: -36, lf: -36, ru: -36, rf: -36 }, ms: 800, hold: 300, label: '엉덩이부터 돌리며 대각선 아래로' },
    { p: { t: -6, lt: -10, ls: -10, rt: 10, rs: 10, lu: 148, lf: 148, ru: 148, rf: 148 }, ms: 900, hold: 200, label: '천천히 돌아오기' }] },

  pallof: { view: 'side', frames: [
    { p: P(S.stand, { lt: -8, rt: 8, lu: -20, lf: 155, ru: -20, rf: 155 }), ms: 600, hold: 300, label: '밴드는 옆에, 손은 가슴 앞 (숨 들이쉬기)' },
    { p: P(S.stand, { lt: -8, rt: 8, lu: 90, lf: 90, ru: 90, rf: 90 }), ms: 1000, hold: 1200, label: '숨 내쉬며 앞으로 쭉, 몸이 돌아가지 않게 10초' },
    { p: P(S.stand, { lt: -8, rt: 8, lu: -20, lf: 155, ru: -20, rf: 155 }), ms: 900, hold: 200, label: '가슴으로 돌아오기' }] },

  broadjump: { view: 'side', frames: [
    { p: P(S.squat, { x: 70, t: 42, lt: 70, ls: -30, rt: 70, rs: -30, lu: -70, lf: -70, ru: -70, rf: -70 }), ms: 700, hold: 150, label: '팔 뒤로, 엉덩이 뒤로' },
    { p: { x: 118, t: 30, lt: 45, ls: -40, rt: 45, rs: -40, lu: 150, lf: 150, ru: 150, rf: 150, lift: 32 }, ms: 380, hold: 0, label: '앞으로 멀리 점프' },
    { p: P(S.squat, { x: 160, t: 35, lt: 82, ls: -22, rt: 82, rs: -22, lu: 80, lf: 80, ru: 80, rf: 80 }), ms: 380, hold: 900, label: '무릎 굽혀 착지, 2초 멈춤' },
    { p: P(S.squat, { x: 70, t: 42, lt: 70, ls: -30, rt: 70, rs: -30, lu: -70, lf: -70, ru: -70, rf: -70 }), ms: 500, hold: 100, label: '처음 자리로' }] },

  skater: { view: 'front', frames: [
    { p: { x: 155, t: 10, rt: 20, rs: -12, lt: 30, ls: 55, lu: -40, lf: -40, ru: -20, rf: -20 }, ms: 500, hold: 250, label: '한 다리로 서기' },
    { p: { x: 120, t: 0, rt: 30, rs: 30, lt: -30, ls: -30, lu: -60, lf: -60, ru: 60, rf: 60, lift: 22 }, ms: 380, hold: 0, label: '옆으로 크게 뛰기' },
    { p: { x: 85, t: -10, lt: -20, ls: 12, rt: -30, rs: -55, lu: 20, lf: 20, ru: 40, rf: 40 }, ms: 380, hold: 300, label: '반대 다리로 착지, 버티기' },
    { p: { x: 120, t: 0, rt: 30, rs: 30, lt: -30, ls: -30, lu: -60, lf: -60, ru: 60, rf: 60, lift: 22 }, ms: 380, hold: 0, label: '반대로 뛰기' },
    { p: { x: 155, t: 10, rt: 20, rs: -12, lt: 30, ls: 55, lu: -40, lf: -40, ru: -20, rf: -20 }, ms: 380, hold: 300, label: '착지' }] },

  landing: { view: 'side', frames: [
    { p: S.stand, ms: 500, hold: 200, label: '서기' },
    { p: P(S.squat, { t: 25, lt: 50, ls: -20, rt: 50, rs: -20, lu: -30, lf: -30, ru: -30, rf: -30 }), ms: 500, hold: 100, label: '살짝 앉기' },
    { p: P(S.stand, { lift: 18, lu: 120, lf: 120, ru: 120, rf: 120 }), ms: 300, hold: 50, label: '작게 점프' },
    { p: { t: 22, rt: 40, rs: -18, lt: 80, ls: -15, lu: 70, lf: 70, ru: 60, rf: 60 }, ms: 300, hold: 1200, label: '한 발로 착지, 흔들림 없이 2초' },
    { p: S.stand, ms: 600, hold: 200, label: '바로 서기' }] },

  sprint: { view: 'side', frames: [
    { p: { t: 16, rt: 62, rs: -30, lt: -38, ls: -95, ru: -55, rf: 25, lu: 55, lf: 110, lift: 5 }, ms: 260, hold: 0, label: '몸 살짝 앞으로, 팔 크게' },
    { p: { t: 16, lt: 62, ls: -30, rt: -38, rs: -95, lu: -55, lf: 25, ru: 55, rf: 110, lift: 5 }, ms: 260, hold: 0, label: '발 가운데로 착지' }] },

  jog: { view: 'side', frames: [
    { p: { t: 8, rt: 35, rs: -25, lt: -20, ls: -60, ru: -35, rf: 50, lu: 35, lf: 90, lift: 3 }, ms: 380, hold: 0, label: '가볍게 제자리 뛰기' },
    { p: { t: 8, lt: 35, ls: -25, rt: -20, rs: -60, lu: -35, lf: 50, ru: 35, rf: 90, lift: 3 }, ms: 380, hold: 0, label: '숨이 조금 찰 정도로' }] },

  walk: { view: 'side', frames: [
    { p: { t: 2, rt: 22, rs: 5, lt: -18, ls: -30, ru: -20, rf: 0, lu: 20, lf: 30 }, ms: 500, hold: 0, label: '바른 자세로 걷기' },
    { p: { t: 2, lt: 22, ls: 5, rt: -18, rs: -30, lu: -20, lf: 0, ru: 20, rf: 30 }, ms: 500, hold: 0, label: '팔을 자연스럽게 흔들며' }] },

  highknee: { view: 'side', frames: [
    { p: { t: 4, rt: 92, rs: 0, lt: 0, ls: 0, ru: -40, rf: 60, lu: 40, lf: 100, lift: 2 }, ms: 300, hold: 0, label: '무릎을 골반 높이로' },
    { p: { t: 4, lt: 92, ls: 0, rt: 0, rs: 0, lu: -40, lf: 60, ru: 40, rf: 100, lift: 2 }, ms: 300, hold: 0, label: '번갈아 빠르게' }] },

  jack: { view: 'front', frames: [
    { p: F.stand, ms: 300, hold: 50, label: '팔다리 모으기' },
    { p: { lt: -24, ls: -24, rt: 24, rs: 24, lu: -165, lf: -165, ru: 165, rf: 165, lift: 10 }, ms: 300, hold: 50, label: '점프하며 벌리기' }] },

  stepjack: { view: 'front', frames: [
    { p: F.stand, ms: 400, hold: 100, label: '모으기' },
    { p: { lt: -6, ls: -6, rt: 26, rs: 26, lu: -160, lf: -160, ru: 160, rf: 160 }, ms: 400, hold: 100, label: '한 발 옆으로 + 팔 위로 (점프 없이)' },
    { p: F.stand, ms: 400, hold: 100, label: '모으기' },
    { p: { lt: -26, ls: -26, rt: 6, rs: 6, lu: -160, lf: -160, ru: 160, rf: 160 }, ms: 400, hold: 100, label: '반대 발' }] },

  squatthrust: { view: 'side', frames: [
    { p: S.stand, ms: 500, hold: 200, label: '서기' },
    { p: { x: 122, t: 62, lt: 98, ls: -35, rt: 98, rs: -35, lu: 0, lf: 0, ru: 0, rf: 0 }, ms: 600, hold: 100, label: '쪼그려 앉아 손 짚기' },
    { p: P(S.pushTop, { x: 92 }), ms: 450, hold: 300, label: '다리 뒤로 뻗기 (허리 꺼지지 않게)' },
    { p: { x: 122, t: 62, lt: 98, ls: -35, rt: 98, rs: -35, lu: 0, lf: 0, ru: 0, rf: 0 }, ms: 450, hold: 100, label: '다리 당겨 오기' },
    { p: S.stand, ms: 600, hold: 200, label: '일어나기' }] },

  climber: { view: 'side', frames: [
    { p: S.pushTop, ms: 300, hold: 0, label: '푸시업 위 자세' },
    { p: P(S.pushTop, { rt: 25, rs: -75 }), ms: 300, hold: 0, label: '무릎을 가슴으로' },
    { p: S.pushTop, ms: 300, hold: 0, label: '번갈아' },
    { p: P(S.pushTop, { lt: 25, ls: -75 }), ms: 300, hold: 0, label: '빠르게' }] },

  throw: { view: 'side', frames: [
    { p: { x: 105, t: 0, lt: 0, ls: 0, rt: 0, rs: 0, lu: 15, lf: 150, ru: 15, rf: 150 }, ms: 700, hold: 300, label: '세트 (수건은 공 잡듯이)' },
    { p: { x: 105, t: 4, lt: 92, ls: -12, rt: 2, rs: 0, lu: 15, lf: 150, ru: 15, rf: 150 }, ms: 700, hold: 300, label: '앞다리 들기, 균형' },
    { p: { x: 135, t: -6, lt: 62, ls: -12, rt: -42, rs: -55, lu: 92, lf: 92, ru: -102, rf: 172 }, ms: 600, hold: 100, label: '앞발 내딛기, 팔은 뒤로' },
    { p: { x: 150, t: 26, lt: 40, ls: -6, rt: -58, rs: -72, lu: 30, lf: 150, ru: 150, rf: 118 }, ms: 300, hold: 150, label: '앞에서 공 놓기 (글러브는 몸 안쪽)' },
    { p: { x: 160, t: 54, lt: 42, ls: -10, rt: -82, rs: -120, lu: 25, lf: 150, ru: 20, rf: -15 }, ms: 400, hold: 600, label: '팔로스루, 정면 보며 균형' },
    { p: { x: 105, t: 0, lt: 0, ls: 0, rt: 0, rs: 0, lu: 15, lf: 150, ru: 15, rf: 150 }, ms: 900, hold: 200, label: '다시 세트' }] },

  wrist: { view: 'side', frames: [
    { p: P(S.stand, { lu: 90, lf: 82, ru: 90, rf: 98 }), ms: 400, hold: 0, label: '팔 앞으로 뻗고' },
    { p: P(S.stand, { lu: 90, lf: 98, ru: 90, rf: 82 }), ms: 400, hold: 0, label: '손목을 번갈아 감기' }] },

  stretch: { view: 'side', frames: [
    { p: S.stand, ms: 600, hold: 300, label: '바로 서기' },
    { p: { t: 148, lt: 0, ls: 0, rt: 0, rs: 0, lu: 0, lf: 0, ru: 0, rf: 0 }, ms: 1300, hold: 1500, label: '반동 없이 천천히, 숨 참지 않기' },
    { p: S.stand, ms: 1100, hold: 200, label: '천천히 일어나기' }] },

  breathe: { view: 'front', frames: [
    { p: F.stand, ms: 1500, hold: 300, label: '코로 천천히 들이쉬기' },
    { p: P(F.stand, { lu: -14, lf: -14, ru: 14, rf: 14 }), ms: 1800, hold: 300, label: '입으로 길게 내쉬기' }] }
};


// ---------------------------------------------------------------
// 4. 동작 설명 (steps: 순서, cues: 자세 포인트, caution: 주의, src: 출처)
// ---------------------------------------------------------------
const MOTION_GUIDES = {
  squat: { title: '맨몸 스쿼트', anim: 'squat',
    steps: ['발을 어깨너비로 벌리고 발끝은 살짝 바깥으로', '엉덩이를 뒤로 빼며 의자에 앉듯이 내려가기', '허벅지가 바닥과 수평이 될 때까지', '발바닥 전체로 바닥을 밀며 일어나기'],
    cues: ['무릎은 발끝 방향으로 (안쪽으로 모이지 않게)', '가슴 펴고 허리 곧게', '뒤꿈치가 들리지 않게'], src: ['헬마드', '일반'] },
  goblet: { title: '고블릿 스쿼트', anim: 'squat',
    steps: ['덤벨이나 케틀벨을 가슴 앞에 세워 잡기', '3초 동안 천천히 앉기', '허벅지 수평까지 내려가기', '발바닥으로 밀며 일어나기'],
    cues: ['팔꿈치가 무릎 안쪽을 지나가게', '상체를 세우기'], src: ['계획표', '일반'] },
  jumpsquat: { title: '점프 스쿼트 / 스쿼트 점프', anim: 'jumpsquat',
    steps: ['스쿼트 자세로 앉으며 팔을 뒤로', '바닥을 세게 밀며 위로 점프', '무릎을 굽히며 사뿐히 착지', '자세를 다시 잡고 다음 반복'],
    cues: ['착지는 소리가 안 날 정도로 부드럽게', '무릎이 안쪽으로 모이지 않게', '지치기 전에, 운동 맨 앞에서'],
    caution: '무릎이나 허리가 불편하면 점프 없이 일반 스쿼트로 해요.', src: ['헬마드', '계획표'] },
  wallsit: { title: '벽에 기대 앉기 (월 싯)', anim: 'wallsit',
    steps: ['벽에 등을 붙이고 서기', '발을 앞으로 빼고 벽을 따라 내려가기', '무릎 90도, 허벅지가 바닥과 수평', '손은 허벅지에 올리지 않고 다리로만 버티기'],
    cues: ['무릎이 발끝보다 앞으로 나가면 발을 더 앞으로', '허리를 벽에 붙이기'], src: ['헬마드'] },
  lunge: { title: '뒤로 런지', anim: 'lunge',
    steps: ['바로 서기', '한 발을 뒤로 크게 빼기', '뒷무릎이 바닥 가까이 갈 때까지 수직으로 내려가기', '앞발 전체로 바닥을 밀며 돌아오기'],
    cues: ['무릎이 아니라 엉덩이를 아래로 내린다는 느낌', '앞무릎이 안쪽으로 모이지 않게', '상체는 세우고, 흔들리면 벽을 살짝 잡아도 돼요'],
    caution: '앞으로 내딛는 런지보다 무릎 부담이 적어요.', src: ['헬마드'] },
  lungerotate: { title: '런지 자세에서 팔 뻗어 몸통 돌리기', anim: 'lungerotate',
    steps: ['한 발 앞으로 런지 자세', '두 팔을 앞으로 모으기', '앞다리 쪽으로 몸통을 돌리며 팔 펼치기', '돌아와 반대쪽 (좌우 5회)'],
    cues: ['골반은 정면, 가슴만 돌리기', '숨을 내쉬며 돌리기'], src: ['계획표'] },
  bulgarian: { title: '불가리안 스플릿 스쿼트', anim: 'bulgarian',
    steps: ['의자에 뒷발 등을 올리기', '앞발은 의자에서 한 걸음 반 앞에', '수직으로 내려가 앞허벅지가 수평이 될 때까지', '앞발로 밀어 올라오기'],
    cues: ['상체는 살짝 앞으로', '앞무릎은 발끝 방향', '투구는 한 다리 동작이 많아서 투수에게 특히 좋아요'], src: ['계획표', '능력'] },
  sidelunge: { title: '옆으로 런지 (사이드 런지)', anim: 'sidelunge',
    steps: ['발을 넓게 벌리고 서기', '한쪽으로 체중을 옮기며 그쪽 무릎 굽히기', '반대 다리는 쭉 펴기', '굽힌 다리로 밀어 돌아오기'],
    cues: ['엉덩이를 뒤로 빼며 앉기', '발끝은 앞을 보게'], src: ['일반'] },
  stepup: { title: '의자 스텝업', anim: 'stepup',
    steps: ['흔들리지 않는 의자 앞에 서기', '한 발 전체를 의자에 올리기', '올린 발로 밀어 올라서기', '천천히 내려오기'],
    cues: ['뒷발로 튕기지 않고 올린 다리 힘으로', '무릎은 발끝 방향'], caution: '바퀴 달린 의자는 쓰지 마세요.', src: ['일반'] },
  rdl: { title: '한 발 루마니안 데드리프트', anim: 'rdl',
    steps: ['한 발로 서기 (덤벨은 손에)', '엉덩이를 뒤로 빼며 상체를 숙이고 뒷다리를 뒤로', '등은 곧게, 허벅지 뒤가 당길 때까지', '엉덩이 힘으로 일어나기'],
    cues: ['골반이 옆으로 돌아가지 않게', '서 있는 무릎은 살짝 굽힘', '한 발 균형이 좋아지면 제구도 안정돼요'], src: ['계획표', '능력'] },
  bridge: { title: '엉덩이 들기 (글루트 브릿지)', anim: 'bridge',
    steps: ['누워서 무릎을 세우기', '발뒤꿈치로 바닥을 밀며 엉덩이 들기', '어깨~무릎이 일직선, 위에서 2초', '천천히 내리기'],
    cues: ['허리가 아니라 엉덩이에 힘', '한 발 버전은 한 다리를 펴고 같은 방법으로'], src: ['계획표', '헬마드'] },
  calf: { title: '종아리 들기 (카프 레이즈)', anim: 'calf',
    steps: ['발 앞꿈치로 계단 끝이나 바닥에 서기', '뒤꿈치를 최대한 들기', '천천히 내리기'],
    cues: ['한 발 버전은 벽을 살짝 잡고', '반동 없이'], src: ['일반'] },
  pushup: { title: '푸시업', anim: 'pushup',
    steps: ['손은 어깨보다 조금 넓게', '머리부터 발끝까지 일직선', '팔꿈치를 몸통에서 45도로 하고 가슴이 바닥 가까이', '바닥을 밀어 올라오기'],
    cues: ['엉덩이가 솟거나 처지지 않게', '팔꿈치를 90도로 쫙 벌리면 어깨가 상해요', '20개 넘게 쉬우면 물병·책 넣은 가방을 메고'],
    caution: '어렵다면 무릎을 대거나 책상에 손을 짚고 해요.', src: ['헬마드'] },
  pushupknee: { title: '무릎 대고 푸시업', anim: 'pushupknee',
    steps: ['무릎을 바닥에 대고 손은 어깨보다 조금 넓게', '머리~무릎 일직선', '가슴을 바닥 가까이', '밀어 올라오기'],
    cues: ['엉덩이가 뒤로 빠지지 않게'], src: ['헬마드'] },
  pushupplus: { title: '푸시업 플러스', anim: 'pushupplus',
    steps: ['일반 푸시업 하기', '위에서 팔을 다 편 뒤', '등을 한 번 더 천장 쪽으로 밀어 날개뼈 벌리기', '천천히 돌아오기'],
    cues: ['날개뼈가 잘 잡혀야 어깨가 안전하게 움직여요'], src: ['능력', '계획표'] },
  shouldertap: { title: '플랭크 자세로 어깨 치기', anim: 'shouldertap',
    steps: ['푸시업 위 자세, 발은 넓게', '한 손으로 바닥을 강하게 밀어 몸통 고정', '반대 손으로 어깨를 가볍게 터치', '번갈아 반복'],
    cues: ['골반이 좌우로 흔들리면 발을 더 넓게', '어려우면 무릎 대고'], src: ['헬마드'] },
  plank: { title: '플랭크', anim: 'plank',
    steps: ['팔꿈치를 어깨 바로 아래에', '머리·등·엉덩이·발뒤꿈치 일직선', '배와 엉덩이에 힘', '숨을 쉬며 버티기'],
    cues: ['엉덩이가 솟으면 너무 쉬워지고, 처지면 허리가 아파요', '시간은 타이머로 재기'], src: ['헬마드', '코어영상'] },
  sideplank: { title: '사이드 플랭크', anim: 'sideplank',
    steps: ['옆으로 누워 팔꿈치를 어깨 아래에', '팔꿈치를 대자마자 옆구리 힘으로 받치기', '엉덩이를 들어 머리~발 일직선', '숨을 내쉬며 버티기'],
    cues: ['어깨 힘으로 버티지 않기', '쉬운 버전: 아래 무릎을 바닥에 대고', '흔들리지 않게 고정'], src: ['코어영상', '계획표'] },
  copenhagen: { title: '코펜하겐 플랭크 (무릎 버전)', anim: 'copenhagen',
    steps: ['옆으로 누워 위쪽 다리 무릎 안쪽을 의자에 올리기', '아래 팔꿈치는 어깨 아래', '위쪽 허벅지 안쪽 힘으로 엉덩이 들기', '일직선으로 버티고 반대쪽도'],
    cues: ['몸통이 돌아가지 않게, 옆을 그대로 정면으로', '허벅지 안쪽에 힘이 꽉 들어오는 게 정상', '어깨에 힘이 많이 들어가면 자세를 다시 잡기'],
    caution: '투수가 다리를 넓게 벌릴 때 잘 다치는 허벅지 안쪽 근육을 길러줘요. 사타구니가 아프면 멈춰요.', src: ['계획표', '코어영상'] },
  deadbug: { title: '데드버그', anim: 'deadbug',
    steps: ['누워서 팔은 천장으로, 무릎은 90도로 들기', '허리를 바닥에 붙이고 배에 힘', '한 팔은 머리 뒤로, 반대 다리는 앞으로 쭉', '돌아와서 반대쪽'],
    cues: ['허리가 뜨면 안 돼요', '팔다리를 내릴 때 숨을 길게 내쉬기 (풍선 부는 느낌)', '몸이 덜덜 떨리면 정상'], src: ['코어영상', '능력'] },
  hollow: { title: '할로우 홀드', anim: 'hollow',
    steps: ['누워서 허리를 바닥에 딱 붙이기', '팔은 머리 위로, 다리는 모으기', '팔다리와 어깨를 살짝 들어 버티기'],
    cues: ['배꼽을 바닥으로 눌러 넣는 느낌', '허리가 뜨면 다리를 더 높이 들거나 무릎 굽히기'], src: ['헬마드'] },
  birddog: { title: '버드독', anim: 'birddog',
    steps: ['네발 기기 자세', '한 팔은 앞으로, 반대 다리는 뒤로 일직선', '2초 멈추기', '돌아와서 반대쪽'],
    cues: ['골반이 돌아가지 않게', '허리가 꺾이지 않게 배에 힘'], src: ['일반'] },
  bearcrawl: { title: '베어 크롤', anim: 'bearcrawl',
    steps: ['네발 기기 자세에서 무릎을 바닥에서 5cm 띄우기', '등은 일직선', '반대쪽 손과 발을 함께 짧게 앞으로', '앞뒤로 기어 다니기'],
    cues: ['엉덩이가 하늘로 솟지 않게 눌러주기', '엉덩이가 올라가면 어깨로만 버티게 돼요'], src: ['헬마드'] },
  superman: { title: '슈퍼맨', anim: 'superman',
    steps: ['엎드려 팔을 앞으로 뻗기', '팔다리를 동시에 살짝 들기', '2초 멈추고 천천히 내리기'],
    cues: ['목은 길게, 고개를 너무 들지 않기'], caution: '허리가 아프면 높이를 줄여요.', src: ['일반'] },
  pronew: { title: '엎드려 팔 당기기 (프론 로우 / W)', anim: 'pronew',
    steps: ['엎드려 팔을 앞으로', '팔꿈치를 옆구리 쪽으로 당겨 W 모양 만들기', '날개뼈를 모으고 2초', '천천히 돌아가기'],
    cues: ['어깨가 귀 쪽으로 올라가지 않게'], src: ['일반', '능력'] },
  invrow: { title: '인버티드 로우', anim: 'invrow',
    steps: ['낮은 봉 아래 누워 어깨너비로 잡기', '발뒤꿈치를 바닥에 대고 몸을 일직선', '가슴을 봉 쪽으로 당기며 날개뼈 모으기', '천천히 내리기'],
    cues: ['무릎을 굽히면 쉬워지고, 다리를 펴면 어려워져요', '허리 부담이 적은 당기기 운동이에요'], src: ['헬마드', '계획표'] },
  bandrow: { title: '밴드 로우', anim: 'bandrow',
    steps: ['밴드를 앞쪽에 고정하고 잡기', '팔꿈치를 옆구리를 따라 뒤로 당기기', '날개뼈를 모으고 잠깐 멈추기', '천천히 돌아가기'],
    cues: ['팔이 아니라 등으로 당기는 느낌'], src: ['능력'] },
  dbrow: { title: '덤벨(밴드) 한 팔 로우', anim: 'dbrow',
    steps: ['한 손과 무릎을 의자에 짚고 상체 숙이기', '반대 손으로 덤벨을 아래로', '팔꿈치를 엉덩이 쪽으로 당기기', '천천히 내리기'],
    cues: ['등은 평평하게, 몸통이 돌아가지 않게'], src: ['계획표', '능력'] },
  facepull: { title: '밴드 페이스풀', anim: 'facepull',
    steps: ['밴드를 얼굴 높이에 고정하고 잡기', '손을 얼굴 쪽으로 당기며 팔꿈치를 높게 벌리기', '날개뼈를 모으고 잠깐 멈추기', '천천히 돌아가기'],
    cues: ['가볍게, 정확하게'], src: ['계획표', '능력'] },
  bander: { title: '밴드 팔 바깥/안쪽 돌리기', anim: 'bander',
    steps: ['팔꿈치를 옆구리에 붙이고 90도로 굽히기', '밴드를 잡고 팔뚝을 바깥쪽으로 돌리기', '천천히 돌아오기 (안쪽 돌리기는 반대 방향으로)'],
    cues: ['팔꿈치가 옆구리에서 떨어지지 않게', '무거운 것보다 가벼운 밴드로 정확하게, 자주', '어깨 속 작은 근육(회전근개)이 팔을 제자리에 잡아줘요'],
    caution: '밴드가 없으면 옆으로 누워 500ml 물병으로 해요.', src: ['능력', '계획표'] },
  pullapart: { title: '밴드 양옆으로 당기기 (풀어파트)', anim: 'pullapart',
    steps: ['밴드를 어깨너비로 잡고 팔을 앞으로', '양옆으로 벌리며 날개뼈 모으기', '천천히 돌아오기'],
    cues: ['어깨가 올라가지 않게'], src: ['계획표'] },
  er90: { title: '90도 자세에서 밴드 돌리기', anim: 'er90',
    steps: ['팔을 옆으로 들어 팔꿈치 90도 (투구 팔 각도)', '밴드를 잡고 팔뚝을 위로 세우기 (바깥 돌리기)', '천천히 돌아오기'],
    cues: ['통증 없는 범위에서만', '가볍게, 정확하게'], caution: '어깨 앞쪽이 콕콕 찌르면 바로 멈춰요.', src: ['능력'] },
  ytw: { title: 'Y-T-W', anim: 'ytw',
    steps: ['엎드리거나 상체를 숙이기', '엄지를 위로 하고 팔을 Y 모양으로 들기', '다음은 T 모양, 그다음 W 모양', '각 모양마다 날개뼈를 모으기'],
    cues: ['10kg 덤벨 말고 맨손이나 500ml 물병으로'], src: ['계획표', '능력'] },
  wallangel: { title: '월 엔젤', anim: 'wallangel',
    steps: ['벽에 등·엉덩이·머리를 붙이고 서기', '팔을 W 모양으로 벽에 대기', '벽에서 떨어지지 않게 위로 올렸다 내리기'],
    cues: ['허리가 뜨지 않게 배에 힘'], src: ['능력'] },
  crossbody: { title: '크로스바디 어깨 스트레칭', anim: 'crossbody',
    steps: ['한 팔을 가슴 앞으로 뻗기', '반대 팔로 팔꿈치 근처를 당기기', '30초 유지하고 반대쪽'],
    cues: ['어깨가 올라가지 않게'], src: ['능력'] },
  s9090: { title: '고관절 스트레칭 (90/90)', anim: 's9090',
    steps: ['앉아서 앞다리와 뒷다리를 모두 90도로', '허리를 곧게 세우기', '앞다리 쪽으로 상체를 천천히 숙이기', '반대쪽도'],
    cues: ['허리가 굽지 않게', '숨을 내쉬며 조금씩'], src: ['계획표', '능력'] },
  openbook: { title: '오픈북 스트레칭', anim: 'openbook',
    steps: ['옆으로 누워 무릎을 굽히기', '두 팔을 앞으로 모으기', '위쪽 팔을 책 펼치듯 반대쪽으로 열기, 눈은 손을 따라', '천천히 돌아오기'],
    cues: ['무릎이 떨어지지 않게', '등 위쪽이 돌아가는 느낌'], src: ['계획표', '능력'] },
  inchworm: { title: '인치웜', anim: 'inchworm',
    steps: ['선 자세에서 숙여 손바닥을 바닥에', '손으로 하나씩 짚으며 앞으로 걸어 나가기', '푸시업 자세까지 가기', '손을 발 쪽으로 걸어와 일어나기'],
    cues: ['무릎은 최대한 펴기', '어깨가 귀에 붙지 않게 아래로'], src: ['헬마드'] },
  woodchop: { title: '우드찹 (몸통 회전)', anim: 'woodchop',
    steps: ['밴드를 높은 곳에 걸고 두 손으로 잡기', '엉덩이부터 돌리며 대각선 아래로 당기기', '천천히 돌아오기', '반대 방향(아래→위)도'],
    cues: ['팔이 아니라 엉덩이부터 돌린다는 느낌'], src: ['계획표', '능력'] },
  pallof: { title: '팔로프 프레스', anim: 'pallof',
    steps: ['밴드를 몸 옆에 고정하고 가슴 앞에서 잡기', '숨을 들이쉬며 배에 힘 (앞뒤로 공기 채우기)', '숨을 내쉬며 천천히 앞으로 쭉 밀고 버티기', '가슴으로 돌아오기'],
    cues: ['몸이 밴드 쪽으로 돌아가지 않게 버티는 운동이에요', '배에 힘을 끝까지 유지'], src: ['계획표', '닥터짱'] },
  broadjump: { title: '제자리 멀리뛰기', anim: 'broadjump',
    steps: ['팔을 뒤로 흔들며 엉덩이 뒤로', '앞으로 멀리 점프', '무릎을 굽혀 착지하고 2초 멈춤'],
    cues: ['착지 때 무릎이 안쪽으로 모이지 않게', '한 번 한 번 전력으로, 지치면 쉬기'], src: ['계획표', '능력'] },
  skater: { title: '스케이터 점프 / 옆 바운드', anim: 'skater',
    steps: ['한 다리로 서기', '옆으로 크게 뛰기', '반대 다리로 착지하고 버티기', '반대로 반복'],
    cues: ['투구 때 옆으로 이동하는 동작과 비슷해요', '착지 다리 무릎은 발끝 방향'], src: ['능력', '계획표'] },
  rotjump: { title: '90도 회전 점프', anim: 'jumpsquat',
    steps: ['스쿼트 자세로 앉기', '점프하며 공중에서 90도 돌기', '사뿐히 착지', '반대 방향으로'],
    cues: ['엉덩이부터 돌리기', '착지는 부드럽게'], src: ['능력'] },
  landing: { title: '한 발 착지 연습', anim: 'landing',
    steps: ['작게 점프', '한 발로 착지', '흔들림 없이 2초 버티기'],
    cues: ['무릎은 살짝 굽히고 발끝 방향'], src: ['능력'] },
  sprint: { title: '짧은 질주 / 인터벌', anim: 'sprint',
    steps: ['몸을 살짝 앞으로 기울이기', '팔을 크게 흔들며 빠르게', '발 가운데로 착지', '걸어서 돌아오며 충분히 쉬기'],
    cues: ['허리는 곧게, 숨이 차도 구부정하지 않게'], caution: '실내라면 제자리 빠르게 무릎 들기로 바꿔도 돼요.', src: ['계획표', '헬마드'] },
  agility: { title: '신호에 맞춰 방향 바꿔 뛰기', anim: 'sprint',
    steps: ['낮은 자세로 준비', '신호에 맞춰 짧게 뛰기', '빠르게 방향 바꾸기'],
    cues: ['던진 뒤 번트 수비, 1루 커버 같은 순발력'], src: ['능력'] },
  highknee: { title: '제자리 무릎 들기', anim: 'highknee',
    steps: ['바로 서기', '무릎을 골반 높이까지 번갈아 들기', '팔도 함께 흔들기'], cues: ['허리 곧게'], src: ['일반'] },
  jack: { title: '점핑잭', anim: 'jack', steps: ['팔다리를 모으고 서기', '점프하며 팔은 위로, 다리는 옆으로', '다시 모으기'], cues: ['착지는 앞꿈치로 부드럽게'], src: ['일반'] },
  stepjack: { title: '스텝 잭 (점프 없는 점핑잭)', anim: 'stepjack', steps: ['한 발을 옆으로 내밀며 팔 위로', '모으기', '반대 발'], cues: ['무릎·발목 부담이 적어요'], src: ['일반'] },
  squatthrust: { title: '스쿼트 스러스트 / 버피', anim: 'squatthrust',
    steps: ['서서 쪼그려 앉아 손을 바닥에', '다리를 뒤로 뻗어 푸시업 자세', '다리를 당겨 와서', '일어나기 (버피는 여기서 점프)'],
    cues: ['다리를 뻗을 때 엉덩이가 솟거나 허리가 꺼지지 않게', '배와 엉덩이에 힘'], src: ['헬마드'] },
  climber: { title: '마운틴 클라이머', anim: 'climber', steps: ['푸시업 위 자세', '무릎을 가슴 쪽으로 번갈아 빠르게'], cues: ['엉덩이가 솟지 않게'], src: ['일반'] },
  shadow: { title: '수건 섀도우 피칭', anim: 'throw',
    steps: ['수건 끝을 공 잡듯이 쥐기', '실제 투구처럼 다리 들기 → 내딛기 → 던지기', '앞에 글러브를 두고 수건 끝으로 치며 공 놓는 지점을 앞으로', '던진 뒤 정면을 보며 균형 잡고 멈추기'],
    cues: ['글러브 팔은 던지는 순간 몸 안쪽에', '엉덩이는 포수 쪽으로 똑바로 (옆으로 새지 않게)', '고개는 기울지 않고 목표를 보기', '힘보다 동작 순서: 다리 → 엉덩이 → 몸통 → 팔'],
    caution: '공을 매일 던질 수 없을 때 어깨 부담 없이 폼을 연습하는 방법이에요.', src: ['KBO', '계획표', '능력'] },
  pitch: { title: '투구', anim: 'throw',
    steps: ['던지기 전 몸풀기와 밴드 운동', '캐치볼은 가까운 거리부터 천천히 늘리기', '정해진 공 개수만큼 던지기', '던진 후 가벼운 밴드·걷기·스트레칭'],
    cues: ['던진 날은 다른 근력 운동 하지 않기'], caution: '팔꿈치 안쪽이 찌릿하거나 어깨 앞쪽이 콕콕 찌르면 바로 멈춰요.', src: ['계획표'] },
  catch: { title: '캐치볼', anim: 'throw',
    steps: ['가까운 거리에서 가볍게 시작', '몸이 풀리면 거리를 천천히 늘리기'], cues: ['처음부터 세게 던지지 않기'], src: ['계획표'] },
  wrist: { title: '추감기 / 손목 운동', anim: 'wrist',
    steps: ['팔을 앞으로 뻗고 막대를 잡기', '손목을 번갈아 감아 무게를 끝까지 올리기', '천천히 풀어 내리기 (왕복 1번)'],
    cues: ['쌀통 운동: 쌀에 손을 넣고 쥐었다 폈다', '손목 굽히기/펴기는 가벼운 덤벨로'], caution: '팔꿈치나 손목이 아프면 멈춰요.', src: ['계획표', '능력'] },
  walk: { title: '걷기 / 가벼운 자전거', anim: 'walk',
    steps: ['바른 자세로 걷기', '숨이 조금 찰 정도의 속도', '체중 줄이기라면 식후 10~15분씩 나눠 걸어도 돼요'], cues: ['허리 펴고 팔 자연스럽게'], src: ['계획표', '헬마드'] },
  jog: { title: '제자리 가볍게 뛰기', anim: 'jog', steps: ['제자리에서 가볍게 뛰기 2분'], cues: ['숨이 조금 찰 정도로'], src: ['계획표'] },
  stretch: { title: '스트레칭', anim: 'stretch',
    steps: ['반동 없이 천천히', '당기는 느낌에서 20~30초 유지', '숨은 참지 않기'], cues: ['아플 정도로 당기지 않기'], src: ['일반'] },
  breathe: { title: '천천히 심호흡', anim: 'breathe', steps: ['코로 천천히 들이쉬기', '입으로 길게 내쉬기', '1분 반복'], cues: ['어깨 힘 빼기'], src: ['일반'] }
};


// ---------------------------------------------------------------
// 5. 운동 이름 → 동작 설명 찾기 (위에서부터 먼저 맞는 것)
// ---------------------------------------------------------------
const MOTION_RULES = [
  [/스쿼트 점프|점프 스쿼트/, 'jumpsquat'], [/스쿼트 스러스트|버피/, 'squatthrust'], [/고블릿/, 'goblet'],
  [/불가리안/, 'bulgarian'], [/옆으로 런지|사이드 런지/, 'sidelunge'], [/몸통 돌리기/, 'lungerotate'], [/런지/, 'lunge'],
  [/스텝업/, 'stepup'], [/벽에 기대|월 ?싯/, 'wallsit'], [/스쿼트/, 'squat'], [/루마니안|데드리프트/, 'rdl'],
  [/엉덩이 들기|브릿지/, 'bridge'], [/종아리 스트레칭|종아리 풀기/, 'stretch'], [/종아리/, 'calf'],
  [/푸시업 플러스/, 'pushupplus'], [/무릎 대고 푸시업/, 'pushupknee'], [/푸시업/, 'pushup'], [/어깨 치기/, 'shouldertap'],
  [/코펜하겐/, 'copenhagen'], [/사이드 플랭크|플랭크 버티기/, 'sideplank'], [/베어 크롤/, 'bearcrawl'], [/플랭크/, 'plank'],
  [/데드버그/, 'deadbug'], [/할로우/, 'hollow'], [/버드독/, 'birddog'], [/슈퍼맨/, 'superman'],
  [/인버티드 로우/, 'invrow'], [/프론 로우|W 모양/, 'pronew'], [/한 팔 로우/, 'dbrow'], [/로우|등으로 당기기/, 'bandrow'],
  [/페이스풀/, 'facepull'], [/90도 자세/, 'er90'], [/풀어파트|양옆으로 당기기/, 'pullapart'],
  [/바깥|안쪽 돌리기|팔 돌리기/, 'bander'], [/Y-T-W/, 'ytw'], [/월 엔젤/, 'wallangel'], [/크로스바디/, 'crossbody'],
  [/90\/90|고관절 스트레칭/, 's9090'], [/오픈북|흉추/, 'openbook'], [/인치웜/, 'inchworm'],
  [/우드찹|몸통 회전/, 'woodchop'], [/팔로프/, 'pallof'], [/멀리뛰기/, 'broadjump'],
  [/스케이터|바운드/, 'skater'], [/회전 점프/, 'rotjump'], [/착지 연습/, 'landing'],
  [/방향 바꿔/, 'agility'], [/질주|인터벌|전력/, 'sprint'], [/무릎 (높이 )?들/, 'highknee'],
  [/점핑잭/, 'jack'], [/스텝 잭/, 'stepjack'], [/마운틴 클라이머/, 'climber'],
  [/섀도우 피칭/, 'shadow'], [/^투구$/, 'pitch'], [/캐치볼/, 'catch'],
  [/추감기|손목|쌀통/, 'wrist'], [/가볍게 뛰기/, 'jog'], [/심호흡/, 'breathe'],
  [/걷기|자전거|숨 고르기|페달/, 'walk'], [/햄스트링|스트레칭|풀기/, 'stretch']
];

function motionKeyFor(name) {
  const rule = MOTION_RULES.find(r => r[0].test(name));
  return rule ? rule[1] : null;
}

// 운동 하나에서 보여줄 동작 목록 (서킷·몸풀기·마무리 스트레칭은 여러 동작)
function motionTargets(item) {
  let list = [];
  if (item.warmup) list = WARMUP_STEPS.slice();
  else if (item.id === 'cooldown') list = COOLDOWN.steps.slice();
  else if (/circuit$/.test(item.id) && item.steps) list = item.steps.slice();
  if (list.length) {
    return list.map(text => ({ label: text, key: motionKeyFor(text) })).filter(t => t.key);
  }
  const key = motionKeyFor(item.name);
  return key ? [{ label: item.name, key: key }] : [];
}


// ---------------------------------------------------------------
// 6. 동작 보기 창
// ---------------------------------------------------------------
let motionRaf = null;
let motionState = null;

function openMotion(title, targets) {
  closeMotion();
  const box = document.createElement('div');
  box.className = 'motion-overlay';
  box.innerHTML = '<div class="motion-card" role="dialog" aria-modal="true" aria-label="' + escapeHtml(title) + ' 동작 설명">'
    + '<div class="motion-head"><h2>' + escapeHtml(title) + '</h2>'
    + '<button type="button" class="motion-close" aria-label="닫기">✕</button></div>'
    + (targets.length > 1 ? '<div class="motion-tabs">' + targets.map((t, i) =>
        '<button type="button" class="motion-tab' + (i === 0 ? ' on' : '') + '" data-i="' + i + '">' + escapeHtml(t.label) + '</button>').join('') + '</div>' : '')
    + '<div class="motion-body"></div>'
    + '</div>';
  document.body.appendChild(box);
  document.body.classList.add('motion-open');

  const show = i => {
    box.querySelectorAll('.motion-tab').forEach(b => b.classList.toggle('on', Number(b.dataset.i) === i));
    renderMotionBody(box.querySelector('.motion-body'), targets[i].key);
  };
  box.querySelectorAll('.motion-tab').forEach(b => b.addEventListener('click', () => show(Number(b.dataset.i))));
  box.querySelector('.motion-close').addEventListener('click', closeMotion);
  box.addEventListener('click', e => { if (e.target === box) closeMotion(); });
  show(0);
}

function closeMotion() {
  cancelAnimationFrame(motionRaf);
  motionRaf = null;
  motionState = null;
  const old = document.querySelector('.motion-overlay');
  if (old) old.remove();
  document.body.classList.remove('motion-open');
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMotion(); });

function renderMotionBody(body, key) {
  const g = MOTION_GUIDES[key];
  body.innerHTML = '<div class="motion-stage">'
    + '<svg viewBox="0 0 ' + MOTION_BOX.w + ' ' + MOTION_BOX.h + '" class="motion-svg" role="img" aria-label="' + escapeHtml(g.title) + ' 애니메이션"></svg>'
    + '<div class="motion-phase"></div>'
    + '<button type="button" class="motion-play" aria-label="멈춤">⏸</button>'
    + '</div>'
    + '<h3 class="motion-sub">' + escapeHtml(g.title) + '</h3>'
    + '<ol class="motion-steps">' + g.steps.map(s => '<li>' + s + '</li>').join('') + '</ol>'
    + (g.cues && g.cues.length ? '<div class="motion-cues"><b>자세 포인트</b><ul>' + g.cues.map(c => '<li>' + c + '</li>').join('') + '</ul></div>' : '')
    + (g.caution ? '<div class="notice">⚠️ ' + g.caution + '</div>' : '')
    + '<p class="footnote">출처: ' + g.src.map(s => '[' + s + ']').join(' ') + ' · 그림은 동작 순서를 보여주는 간단한 막대 인형이에요.</p>';
  startMotion(body, MOTION_ANIMS[g.anim]);
}

function startMotion(body, anim) {
  cancelAnimationFrame(motionRaf);
  const svg = body.querySelector('.motion-svg');
  const phase = body.querySelector('.motion-phase');
  const playBtn = body.querySelector('.motion-play');

  // 의자(bench)는 첫 자세의 발·무릎 위치에 맞춰 그려요
  anim._bench = null;
  const benchProp = (anim.props || []).find(p => p.type === 'bench');
  if (benchProp) {
    const j0 = placePose(solvePose(anim.frames[0].p, anim.view), anim);
    anim._bench = [j0[benchProp.joint][0], j0[benchProp.joint][1] + 3];
  }

  // 구간마다 걸리는 시간 (움직임 + 멈춤)
  const n = anim.frames.length;
  const segs = anim.frames.map((f, i) => {
    const next = anim.frames[(i + 1) % n];
    return { from: f.p, to: next.p, ms: next.ms, hold: next.hold || 0, label: next.label };
  });
  const total = segs.reduce((s, g) => s + g.ms + g.hold, 0);
  motionState = { paused: false, elapsed: 0, last: performance.now() };

  playBtn.addEventListener('click', () => {
    motionState.paused = !motionState.paused;
    playBtn.textContent = motionState.paused ? '▶' : '⏸';
    playBtn.setAttribute('aria-label', motionState.paused ? '재생' : '멈춤');
  });

  const tick = now => {
    if (!motionState) return;
    if (!motionState.paused) motionState.elapsed += now - motionState.last;
    motionState.last = now;
    let t = motionState.elapsed % total;
    let seg = segs[0], u = 0;
    for (const g of segs) {
      if (t < g.ms + g.hold) { seg = g; u = t < g.ms ? t / g.ms : 1; break; }
      t -= g.ms + g.hold;
    }
    const eased = 0.5 - 0.5 * Math.cos(Math.PI * u);
    const pose = lerpPose(seg.from, seg.to, eased);
    svg.innerHTML = drawFigure(placePose(solvePose(pose, anim.view), anim), anim);
    phase.textContent = seg.label;
    motionRaf = requestAnimationFrame(tick);
  };
  motionRaf = requestAnimationFrame(tick);
}
