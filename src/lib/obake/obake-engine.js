// たんいぼうえいペット：おばけ Live2D エンジン
// ビューア（おせわビューア）の挙動をそのまま部品化したもの。フレームワーク非依存。
//  - 元の moc3 を Live2D Cubism Core で動かし、体・目・口はベクター図形で描画
//  - 表情差分（にこにこ／しょんぼり／しょんぼり2／すね）と手・すそは rig.json の形で変形
//  - モーションは motions.json（motion3 形式）＋このファイル内の JS モーション
// 使い方は README.md を参照。

const SVGNS = 'http://www.w3.org/2000/svg';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ramp = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
const smooth = x => x * x * (3 - 2 * x);
const lerp = (a, b, k) => a + (b - a) * k;
const env = (t, keys) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; if (t <= b) return va + (vb - va) * smooth(b > a ? (t - a) / (b - a) : 1); } return keys[keys.length - 1][1]; };
const hop = v => (v > 0 && v < 1) ? Math.sin(v * Math.PI) : 0;
const spring = (c, target, k, dt) => c + (target - c) * (1 - Math.exp(-k * dt));

/** 表示範囲のプリセット */
export const PRESETS = {
  // ビューアと同じ正方形の舞台
  square: { viewBox: '-1650 -1550 3300 3300', corner: { x: -900, y: 760, sc: 0.52 }, exitX: 2400 },
  // デモアプリのペット枠（横長・上に「きぶん」とハートの行がある）に合わせた範囲
  appStage: { viewBox: '-2664 -2301 5328 3917', corner: { x: -1950, y: 760, sc: 0.52 }, exitX: 3500 },
};

/** デモ操作パネル用：パラメータの名前と範囲（ビューアと同じ） */
export const PARAM_INFO = [
  { id: 'ParamAngleX', label: '角度 X', min: -30, max: 30, def: 0, group: 'model' },
  { id: 'ParamAngleY', label: '角度 Y', min: -30, max: 30, def: 0, group: 'model' },
  { id: 'ParamAngleZ', label: '角度 Z', min: -30, max: 30, def: 0, group: 'model' },
  { id: 'ParamEyeLOpen', label: '左目 開閉', min: 0, max: 1, def: 1, group: 'model' },
  { id: 'ParamEyeROpen', label: '右目 開閉', min: 0, max: 1, def: 1, group: 'model' },
  { id: 'ParamMouthForm', label: '口 変形', min: -1, max: 1, def: 0, group: 'model' },
  { id: 'ParamBreath', label: '呼吸', min: 0, max: 1, def: 0, group: 'model' },
  { id: 'ParamHairSide', label: 'すそのゆれ（物理）', min: -1, max: 1, def: 0, group: 'model' },
  { id: 'happy', label: 'にこにこ', note: '差分01', min: 0, max: 1, def: 0, group: 'added' },
  { id: 'sad', label: 'しょんぼり', note: '差分03', min: 0, max: 1, def: 0, group: 'added' },
  { id: 'sad2', label: 'しょんぼり2', note: '差分04', min: 0, max: 1, def: 0, group: 'added' },
  { id: 'sulk', label: 'すね', note: '差分05', min: 0, max: 1, def: 0, group: 'added' },
  { id: 'armL', label: '手（画面の左）', note: '−さげる／＋あげる', min: -1, max: 1, def: 0, group: 'added' },
  { id: 'armR', label: '手（画面の右）', note: '−さげる／＋あげる', min: -1, max: 1, def: 0, group: 'added' },
  { id: 'hemWave', label: 'すそ ゆらゆら', min: 0, max: 1, def: 0.3, group: 'added' },
  { id: 'hemSway', label: 'すそ 左右', min: -1, max: 1, def: 0, group: 'added' },
];
/** デモ操作パネル用：単独で再生できるモーション（すね・いえで・みつかるは状態つきなので専用の操作で） */
export const MOTION_INFO = [
  { name: 'greet', label: 'おはよう' }, { name: 'touko', label: 'とうちゃく' }, { name: 'nod', label: 'コクコク' },
  { name: 'shake', label: 'ふるふる' }, { name: 'look', label: 'きょろきょろ' }, { name: 'sleepy', label: 'うとうと' },
  { name: 'sad', label: 'しょんぼり' }, { name: 'nade', label: 'なでられ' }, { name: 'poke', label: 'つつかれ' },
  { name: 'tickle', label: 'くすぐり' }, { name: 'waveL', label: 'ここにいるよ（左）' }, { name: 'waveR', label: 'ここにいるよ（右）' },
  { name: 'banzai', label: 'ばんざい' },
];

let corePromise = null;
/** Live2D Cubism Core を一度だけ読み込む */
export function loadCubismCore(src = '/obake/live2dcubismcore.min.js') {
  if (typeof window === 'undefined') return Promise.reject(new Error('browser only'));
  if (window.Live2DCubismCore) return Promise.resolve();
  if (corePromise) return corePromise;
  corePromise = new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = () => { const wait = () => (window.Live2DCubismCore && window.Live2DCubismCore.Moc) ? resolve() : setTimeout(wait, 20); wait(); };
    s.onerror = () => { corePromise = null; reject(new Error('Cubism Core の読み込みに失敗: ' + src)); };
    document.head.appendChild(s);
  });
  return corePromise;
}

let uid = 0;

/**
 * おばけを root 要素の中に作る
 * @param {HTMLElement} root
 * @param {object} opts
 */
export async function createObake(root, opts = {}) {
  const base = opts.assetBase ?? '/obake';
  const preset = typeof opts.preset === 'object' ? opts.preset : (PRESETS[opts.preset || 'square'] || PRESETS.square);
  const CORNER = Object.assign({}, preset.corner, opts.corner), EXIT_X = opts.exitX ?? preset.exitX;
  await loadCubismCore(opts.coreSrc || `${base}/live2dcubismcore.min.js`);
  const [mocBuf, RIG, MOTION3] = await Promise.all([
    opts.moc ? Promise.resolve(opts.moc) : fetch(`${base}/obake.moc3`).then(r => { if (!r.ok) throw new Error('moc3 が読めません'); return r.arrayBuffer(); }),
    opts.rig ? Promise.resolve(opts.rig) : fetch(`${base}/rig.json`).then(r => r.json()),
    opts.motions ? Promise.resolve(opts.motions) : fetch(`${base}/motions.json`).then(r => r.json()),
  ]);
  const Core = window.Live2DCubismCore;
  const model = Core.Model.fromMoc(Core.Moc.fromArrayBuffer(mocBuf));
  const PIDX = {}, DIDX = {};
  model.parameters.ids.forEach((id, i) => PIDX[id] = i);
  model.drawables.ids.forEach((id, i) => DIDX[id] = i);

  // ---------- DOM ----------
  const id = 'obk' + (++uid);
  const wrap = document.createElement('div');
  wrap.className = 'obake-root';
  wrap.style.cssText = 'position:relative;width:100%;height:100%;touch-action:none;user-select:none;-webkit-user-select:none;';
  wrap.innerHTML = `
<svg viewBox="${preset.viewBox}" preserveAspectRatio="${opts.preserveAspectRatio || 'xMidYMid meet'}" style="width:100%;height:100%;display:block;cursor:grab" role="img" aria-label="${opts.ariaLabel || 'おばけのペット'}">
  <defs><path id="${id}-heart" d="M0 30 C -40 -10 -70 -30 -70 -60 C -70 -90 -45 -105 -22 -100 C -10 -97 -3 -90 0 -80 C 3 -90 10 -97 22 -100 C 45 -105 70 -90 70 -60 C 70 -30 40 -10 0 30 Z"/></defs>
  <ellipse data-k="shadow" cx="0" cy="1380" rx="720" ry="90" fill="${opts.shadowColor || '#9EA376'}" opacity=".45"/>
  <g data-k="pet">
    <path data-k="outline" fill="${opts.bodyColor || '#FFFFFF'}" stroke="#9A9A9A" stroke-width="24" stroke-linejoin="round"/>
    <path data-k="eyeL" fill="#1B1B1B"/><path data-k="eyeR" fill="#1B1B1B"/><path data-k="mouth" fill="#1B1B1B"/>
  </g>
  <g data-k="fx"></g>
</svg>`;
  const bubbleOn = opts.bubble !== false;
  let bubble = null;
  if (bubbleOn) {
    bubble = document.createElement('div');
    bubble.className = 'obake-bubble';
    bubble.style.cssText = 'position:absolute;left:50%;bottom:4%;transform:translateX(-50%);background:#fff;border:2px solid #5E6158;border-radius:12px;padding:.35em .9em;font-weight:700;white-space:nowrap;transition:opacity .25s;pointer-events:none;opacity:0;font-size:' + (opts.bubbleFontSize || '14px');
    wrap.appendChild(bubble);
  }
  root.appendChild(wrap);
  const q = k => wrap.querySelector(`[data-k="${k}"]`);
  const svg = wrap.querySelector('svg'), outline = q('outline'), petG = q('pet'), shadow = q('shadow'), fxFront = q('fx');
  const eyeLp = q('eyeL'), eyeRp = q('eyeR'), mouthP = q('mouth');

  // ---------- イベント ----------
  const listeners = {};
  const emit = (ev, ...a) => { (listeners[ev] || []).forEach(f => { try { f(...a); } catch (e) { console.error(e); } }); };

  // ---------- Live2D の形 ----------
  const PART = { eyeL: 'ArtMesh3', eyeR: 'ArtMesh2', mouth: 'ArtMesh', body: 'ArtMesh4' };
  const PRE = {};
  for (const part of Object.values(PART)) {
    const Q = RIG.quads[part], A = Q.A;
    PRE[part] = Q.tris.map(tr => { const a = A[tr[0]], b = A[tr[1]], c = A[tr[2]]; const v0 = [b[0] - a[0], b[1] - a[1]], v1 = [c[0] - a[0], c[1] - a[1]]; const d00 = v0[0] * v0[0] + v0[1] * v0[1], d01 = v0[0] * v1[0] + v0[1] * v1[1], d11 = v1[0] * v1[0] + v1[1] * v1[1]; return { t: tr, a, v0, v1, d00, d01, d11, den: d00 * d11 - d01 * d01 }; });
  }
  function mapPts(pts, part) {
    const pos = model.drawables.vertexPositions[DIDX[part]];
    const P = [[pos[0] * 2000, -pos[1] * 2000], [pos[2] * 2000, -pos[3] * 2000], [pos[4] * 2000, -pos[5] * 2000], [pos[6] * 2000, -pos[7] * 2000]];
    const pre = PRE[part];
    return pts.map(p => {
      let best = null;
      for (const qq of pre) { const v2 = [p[0] - qq.a[0], p[1] - qq.a[1]]; const d20 = v2[0] * qq.v0[0] + v2[1] * qq.v0[1], d21 = v2[0] * qq.v1[0] + v2[1] * qq.v1[1]; const v = (qq.d11 * d20 - qq.d01 * d21) / qq.den, w = (qq.d00 * d21 - qq.d01 * d20) / qq.den, u = 1 - v - w; const m = Math.min(u, v, w); if (!best || m > best.m) best = { m, u, v, w, t: qq.t }; }
      const [i, j, k] = best.t; return [best.u * P[i][0] + best.v * P[j][0] + best.w * P[k][0], best.u * P[i][1] + best.v * P[j][1] + best.w * P[k][1]];
    });
  }

  // ---------- パラメータ ----------
  const PARAMS = [
    { id: 'ParamAngleX', min: -30, max: 30, def: 0, l2d: 1 }, { id: 'ParamAngleY', min: -30, max: 30, def: 0, l2d: 1 }, { id: 'ParamAngleZ', min: -30, max: 30, def: 0, l2d: 1 },
    { id: 'ParamEyeLOpen', min: 0, max: 1, def: 1, l2d: 1 }, { id: 'ParamEyeROpen', min: 0, max: 1, def: 1, l2d: 1 }, { id: 'ParamMouthForm', min: -1, max: 1, def: 0, l2d: 1 },
    { id: 'ParamBreath', min: 0, max: 1, def: 0, l2d: 1 }, { id: 'ParamHairSide', min: -1, max: 1, def: 0, l2d: 1 },
    { id: 'happy', min: 0, max: 1, def: 0 }, { id: 'sad', min: 0, max: 1, def: 0 }, { id: 'sad2', min: 0, max: 1, def: 0 }, { id: 'sulk', min: 0, max: 1, def: 0 },
    { id: 'armL', min: -1, max: 1, def: 0 }, { id: 'armR', min: -1, max: 1, def: 0 }, { id: 'hemWave', min: 0, max: 1, def: 0.3 }, { id: 'hemSway', min: -1, max: 1, def: 0 },
  ];
  const DEF = Object.fromEntries(PARAMS.map(p => [p.id, p.def]));
  const V = Object.assign({}, DEF), held = {};

  // ---------- 状態 ----------
  let t = 0, state = 'idle', st = 0, cur = null, ct = 0, fired = new Set();
  let lastTouch = 0, lastPet = -9, petEnergy = 0, sulkTaps = 0, pui = 0, pointer = { x: 0, y: 0, inside: false };
  const POS = { x: 0, y: 0, sc: 1 }, TPOS = { x: 0, y: 0, sc: 1 };
  const NEG = opts.neglect || null; // { idleToSulkSec, sulkToIedeSec }：デモ用。アプリ本番では null（日数で判定して API を呼ぶ）
  let bubbleUntil = 0, mood = 'ふつう';
  function say(text, dur = 1.6) { if (bubble) { bubble.textContent = text; bubble.style.opacity = '1'; } bubbleUntil = t + dur; emit('say', text, dur); }
  function setMood(m) { mood = m; emit('mood', m); }
  let cstart = { x: 0, y: 0, sc: 1 };
  function setStateVal(s) { if (state !== s) { state = s; emit('state', s); } }

  // ---------- エフェクト ----------
  const parts = [];
  function addPart(el, o) { fxFront.appendChild(el); parts.push(Object.assign({ el, age: 0, s: 1 }, o)); }
  function hearts(n) { for (let i = 0; i < n; i++) { const u = document.createElementNS(SVGNS, 'use'); u.setAttribute('href', `#${id}-heart`); u.setAttribute('fill', '#F0637E'); addPart(u, { x: POS.x + (Math.random() - .5) * 800 * POS.sc, y: POS.y - 1080 * POS.sc, vx: (Math.random() - .5) * 260, vy: -520 - Math.random() * 260, life: 1.3, s: 0.9 + Math.random() * .5, kind: 'heart' }); } }
  function textPart(text, x, y, o) { const tx = document.createElementNS(SVGNS, 'text'); tx.textContent = text; tx.setAttribute('font-size', o.size || 190); tx.setAttribute('font-weight', '900'); tx.setAttribute('fill', '#5E6158'); tx.setAttribute('text-anchor', 'middle'); tx.setAttribute('font-family', 'inherit'); addPart(tx, Object.assign({ x, y }, o)); }
  function mark(ch) { textPart(ch, POS.x + 560 * POS.sc, POS.y - 820 * POS.sc, { size: 260, vx: 0, vy: -120, life: 1.1, s: 0.8, kind: 'mark' }); }
  function spawnZ() { textPart('z', POS.x + 520, POS.y - 820, { vx: 160, vy: -260, life: 2.2, s: 0.7, kind: 'z' }); }
  function spawnDots() { textPart('…', POS.x + 80, POS.y - 1060 * POS.sc, { size: 300, vx: 0, vy: -60, life: 1.8, s: 1, kind: 'dots' }); }
  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.age += dt;
      if (p.age > p.life) { p.el.remove(); parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'heart') { p.vx *= 0.96; p.vy *= 0.97; }
      if (p.kind === 'z') { p.x += Math.sin(p.age * 4) * 3; p.s += dt * 0.35; }
      const k = p.age / p.life, op = k < .15 ? k / .15 : 1 - smooth(ramp(k, .55, 1));
      p.el.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${p.s.toFixed(3)})`); p.el.setAttribute('opacity', op.toFixed(2));
    }
  }

  // ---------- モーション ----------
  function parseM3(j) {
    const curves = j.Curves.map(c => { const s = c.Segments, pts = [[s[0], s[1]]]; for (let i = 2; i < s.length; i += 3) pts.push([s[i + 1], s[i + 2]]); return { id: c.Id, pts }; });
    return { dur: j.Meta.Duration, loop: j.Meta.Loop, fin: j.Meta.FadeInTime ?? 0.3, fout: j.Meta.FadeOutTime ?? 0.3,
      f: tt => { const o = {}; for (const c of curves) { const p = c.pts; let v = p[p.length - 1][1]; for (let i = 1; i < p.length; i++) if (tt <= p[i][0]) { const a = p[i - 1], b = p[i]; v = a[1] + (b[1] - a[1]) * ((tt - a[0]) / ((b[0] - a[0]) || 1)); break; } o[c.id] = v; } return o; } };
  }
  const L2DM = {}; for (const k in MOTION3) L2DM[k] = parseM3(MOTION3[k]);
  const MOTIONS = {
    greet: Object.assign({ label: 'おはよう' }, L2DM.greet, { f: tt => { const o = L2DM.greet.f(tt); const h = hop(ramp(tt, 0.35, 0.8)) + 0.45 * hop(ramp(tt, 1.0, 1.35)); const up = smooth(ramp(tt, 0.35, 0.55)) * (1 - smooth(ramp(tt, 1.5, 2.1)));
        o.lift = 300 * h; o.squash = -0.45 * hop(ramp(tt, 0.35, 0.8)) + 0.4 * (tt > 0.8 && tt < 0.98 ? Math.sin((tt - 0.8) / 0.18 * Math.PI) : 0) - 0.25 * (tt < 0.35 ? Math.sin(tt / 0.35 * Math.PI) : 0);
        o.armL = up * (0.85 + 0.25 * Math.sin(tt * 15)); o.armR = up * (0.85 - 0.25 * Math.sin(tt * 15)); o.hemWave = 0.9; return o; },
      ev: [[0.36, () => { say('おはよっ！', 1.8); mark('!'); }]] }),
    nod: Object.assign({ label: 'コクコク' }, L2DM.nod, { ev: [[0.1, () => say('コクコク！', 1.4)]], f: tt => { const o = L2DM.nod.f(tt); const d = Math.max(0, (o.ParamAngleY || 0)) / 30; o.lift = -40 * d; o.squash = 0.12 * d; return o; } }),
    shake: Object.assign({ label: 'ふるふる' }, L2DM.shake),
    look: Object.assign({ label: 'きょろきょろ' }, L2DM.look, { ev: [[0.3, () => mark('?')]] }),
    sleepy: Object.assign({ label: 'うとうと' }, L2DM.sleepy, { f: tt => { const o = L2DM.sleepy.f(tt); const w = hop(ramp(tt, 3.42, 3.8)); o.lift = 220 * w; o.squash = -0.35 * w; o.armL = o.armR = tt < 3.4 ? -0.3 : 0.9 * hop(ramp(tt, 3.42, 4.2)); o.hemWave = tt < 3.4 ? 0.12 : 0.9; return o; },
      ev: [[0.4, () => say('うと…うと…', 2.6)], [3.43, () => { say('はっ！？', 1.4); mark('!'); }]] }),
    sad: { label: 'しょんぼり', dur: L2DM.sad.dur, fin: 0.5, fout: 0.6, ev: [[0.9, () => say('しょぼん…', 1.8)]], f: tt => { const o = L2DM.sad.f(tt); const e = env(tt, [[0, 0], [1.2, 1], [3.2, 1], [3.8, 0]]); o.sad = e; o.armL = o.armR = -0.55 * e; o.hemWave = 0.15; return o; } },
    nade: { label: 'なでられ', dur: 2.6, fin: 0.25, fout: 0.4, f: tt => { const e = env(tt, [[0, 0], [0.3, 1], [2.2, 1], [2.6, 0]]); return { happy: e, ParamAngleZ: 9 * Math.sin(tt * 5) * e, ParamAngleY: -6 * e, ParamBreath: 0.5 + 0.5 * Math.sin(tt * 7), armL: 0.3 * e + 0.12 * Math.sin(tt * 7), armR: 0.3 * e - 0.12 * Math.sin(tt * 7), hemWave: 0.3 + 0.5 * e }; },
      ev: [[0.2, () => say('えへへ〜', 1.6)], [0.4, () => hearts(2)], [1.4, () => hearts(2)]] },
    poke: { label: 'つつかれ', dur: 1.1, fin: 0.05, fout: 0.3, f: tt => { const k = Math.exp(-tt * 5) * Math.sin(tt * 24); return { ParamEyeLOpen: tt < 0.28 ? 0.1 : 1, ParamEyeROpen: tt < 0.28 ? 0.1 : 1, happy: tt < 0.28 ? 0 : 0.5 * (1 - ramp(tt, 0.8, 1.1)), ParamAngleY: -14 * Math.max(0, k), ParamAngleZ: 8 * k, squash: 0.8 * k, lift: 60 * Math.max(0, k) }; },
      ev: [[0, () => say('ぴっ！', 1.2)]] },
    tickle: { label: 'くすぐり', dur: 1.9, fin: 0.1, fout: 0.4, f: tt => { const e = 1 - smooth(ramp(tt, 1.4, 1.9)); return { happy: e, ParamAngleX: 16 * Math.sin(tt * 17) * e, ParamAngleZ: 12 * Math.sin(tt * 13) * e, hemSway: 0.8 * Math.sin(tt * 11) * e, hemWave: 1, armL: (0.35 + 0.35 * Math.sin(tt * 19)) * e, armR: (0.35 - 0.35 * Math.sin(tt * 19)) * e, ParamBreath: 0.5 + 0.5 * Math.sin(tt * 20) }; },
      ev: [[0, () => say('くすぐったい〜！', 1.6)]] },
    waveR: { label: 'ここにいるよ（右）', dur: 1.9, fin: 0.15, fout: 0.4, f: tt => { const e = 1 - smooth(ramp(tt, 1.5, 1.9)); return { armR: (0.62 + 0.38 * Math.sin(tt * 13)) * e, armL: -0.15 * e, happy: 0.6 * e, ParamAngleZ: -9 * e, ParamAngleX: 8 * e }; },
      ev: [[0, () => say('ここにいるよ！', 1.4)]] },
    waveL: { label: 'ここにいるよ（左）', dur: 1.9, fin: 0.15, fout: 0.4, f: tt => { const e = 1 - smooth(ramp(tt, 1.5, 1.9)); return { armL: (0.62 + 0.38 * Math.sin(tt * 13)) * e, armR: -0.15 * e, happy: 0.6 * e, ParamAngleZ: 9 * e, ParamAngleX: -8 * e }; },
      ev: [[0, () => say('ここにいるよ！', 1.4)]] },
    banzai: { label: 'ばんざい', dur: 1.7, fin: 0.1, fout: 0.3, f: tt => { const h = hop(ramp(tt, 0.1, 0.55)) + 0.7 * hop(ramp(tt, 0.65, 1.05)); const up = smooth(ramp(tt, 0.05, 0.3)) * (1 - smooth(ramp(tt, 1.3, 1.7))); return { armL: up, armR: up, lift: 260 * h, squash: -0.35 * h, happy: 0.9 * up, ParamAngleY: -10 * up, hemWave: 0.9 }; } },
    touko: { label: 'とうちゃく', dur: 1.9, fin: 0.1, fout: 0.3, f: tt => MOTIONS.banzai.f(Math.min(tt, 1.7)), ev: [[0.1, () => say('とうちゃく！ えらいっ', 1.8)], [0.35, () => hearts(3)]] },
    iede: { label: 'いえで', dur: 4.4, fin: 0.01, fout: 0.01, pos: true, f: tt => {
        const o = { sulk: 1, armL: -0.7, armR: -0.7, hemWave: 0.3 };
        const k = smooth(ramp(tt, 1.0, 4.2));
        o.px = lerp(cstart.x, EXIT_X, k); o.py = lerp(cstart.y, Math.min(cstart.y, 620), k); o.sc = lerp(cstart.sc, 0.5, ramp(tt, 0.8, 1.6));
        o.ParamAngleY = env(tt, [[0, 12], [0.6, 22], [1.0, 10], [4.4, 10]]); o.ParamAngleX = env(tt, [[0, 10], [0.8, 26], [4.4, 26]]); o.ParamAngleZ = -6;
        if (tt > 1.0) { const h = hop(((tt - 1.0) * 2.4) % 1); o.lift = 90 * h; o.squash = -0.15 * h; o.armL = -0.5 + 0.25 * Math.sin(tt * 15); o.armR = -0.5 - 0.25 * Math.sin(tt * 15); o.hemWave = 0.7; o.hemSway = -0.4; }
        return o; },
      ev: [[0.2, () => say('……いえで しても さがしに きてくれる？', 2.4)], [2.7, () => say('だいがくで まってるね', 1.8)]] },
    mitsuketa: { label: 'みつかる', dur: 9.6, fin: 0.01, fout: 0.3, pos: true, f: tt => {
        const o = { hemWave: 0.3 }; const k = smooth(ramp(tt, 5.6, 8.4));
        o.px = lerp(CORNER.x, 0, k); o.py = lerp(CORNER.y, 0, k); o.sc = lerp(CORNER.sc, 1, k);
        o.fade = ramp(tt, 0, 0.6);
        o.sulk = env(tt, [[0, 0.8], [0.8, 0.8], [1.3, 0], [9.6, 0]]);
        o.sad = env(tt, [[0, 0], [0.9, 0], [1.4, 1], [8.2, 1], [8.9, 0.4], [9.6, 0.4]]);
        o.happy = env(tt, [[0, 0], [8.4, 0], [9.0, 0.5], [9.6, 0.5]]);
        o.ParamAngleX = env(tt, [[0, 18], [0.8, 18], [1.4, 0], [9.6, 0]]);
        o.ParamAngleY = env(tt, [[0, 12], [1.4, 6], [3.6, 8], [4.2, 24], [5.4, 22], [6.0, 12], [8.4, 6], [9.0, 0], [9.6, 0]]);
        o.ParamAngleZ = env(tt, [[0, -6], [1.4, 0], [4.2, -6], [5.4, -6], [6, 0]]) + (tt > 3.8 && tt < 5.4 ? 1.8 * Math.sin(tt * 22) : 0);
        o.armL = o.armR = env(tt, [[0, -0.7], [1.4, -0.5], [4.2, -0.9], [5.4, -0.9], [5.8, -0.4]]);
        if (tt > 5.6) { const w = 1 - smooth(ramp(tt, 8.3, 8.8)); o.armR = (0.35 + 0.35 * Math.sin(tt * 11)) * w + 0.2 * (1 - w); o.armL = -0.4 * w + 0.2 * (1 - w); o.ParamAngleZ += 5 * Math.sin(tt * 5.5) * w; }
        const h = tt > 5.6 && tt < 8.4 ? hop(((tt - 5.6) * 1.6) % 1) : 0; o.lift = 60 * h + (tt > 8.4 && tt < 8.9 ? 80 * hop(ramp(tt, 8.4, 8.9)) : 0);
        return o; },
      ev: [[0.9, () => say('ほんとうに みつけにきて……くれたんだね……', 2.6)], [3.7, () => say('さみしかった………', 2.2)], [8.5, () => say('……ただいま', 1.8)], [9.0, () => { hearts(2); setMood('ほっとした'); }]] },
    comeback: { label: 'すねから戻る', dur: 5.4, fin: 0.01, fout: 0.3, pos: true, f: tt => {
        const o = { hemWave: 0.3 }; const k = ramp(tt, 2.4, 4.0);
        o.px = lerp(CORNER.x, 0, smooth(k)); o.py = lerp(CORNER.y, 0, smooth(k)); o.sc = lerp(CORNER.sc, 1, smooth(k));
        o.sulk = env(tt, [[0, 1], [0.6, 0.35], [1.0, 0], [5.4, 0]]);
        o.sad = env(tt, [[0, 0], [0.8, 0], [1.1, 1], [1.9, 1], [2.2, 0], [5.4, 0]]);
        o.happy = env(tt, [[0, 0], [2.0, 0], [2.3, 1], [5.4, 1]]);
        o.ParamAngleX = env(tt, [[0, 14], [0.5, -10], [1.0, -4], [2.0, 0], [5.4, 0]]);
        o.ParamAngleY = env(tt, [[0, 10], [0.5, 0], [1.1, 14], [1.9, 14], [2.3, -6], [5.4, -6]]);
        o.ParamAngleZ = env(tt, [[0, -8], [1.1, -6], [1.5, 6], [1.9, -4], [2.3, 0]]);
        o.armL = o.armR = env(tt, [[0, -0.8], [1.0, -0.6], [1.9, -0.4], [2.3, 0.3], [5.4, 0.3]]);
        if (tt > 2.4 && tt < 4.0) { const h = hop((k * 4) % 1); o.lift = 260 * h; o.squash = -0.3 * h; o.armL = 0.3 + 0.5 * Math.sin(tt * 14); o.armR = 0.3 - 0.5 * Math.sin(tt * 14); o.hemWave = 0.8; o.ParamAngleZ = 8 * Math.sin(tt * 7); }
        if (tt >= 4.0) { const b = tt - 4.0; const up = smooth(ramp(b, 0.15, 0.4)) * (1 - smooth(ramp(b, 1.0, 1.4))); o.squash = 0.45 * (b < 0.2 ? Math.sin(b / 0.2 * Math.PI) : 0); o.armL = o.armR = 0.3 + 0.7 * up; o.lift = 60 * up * Math.abs(Math.sin(b * 8)); o.hemWave = 0.8; }
        return o; },
      ev: [[0.3, () => mark('?')], [1.1, () => say('……おはよ', 1.4)], [2.1, () => setMood('ごきげん')], [4.15, () => { say('おはよ！ まってたよ', 2.0); hearts(4); }]] },
  };
  // 外から差し替え・追加できるセリフ（例：日記やAIの一言）
  if (opts.lines) for (const k in opts.lines) if (MOTIONS[k]) { const L = opts.lines[k]; MOTIONS[k].ev = (MOTIONS[k].ev || []).map(([et, fn], i) => L[i] ? [et, () => say(L[i], 1.8)] : [et, fn]); }

  function play(name) {
    if (!MOTIONS[name]) { console.warn('unknown motion', name); return false; }
    cur = name; ct = 0; fired = new Set(); cstart = { x: POS.x, y: POS.y, sc: POS.sc }; emit('motionstart', name); return true;
  }
  function touch() { lastTouch = t; }
  function goCenter() { TPOS.x = 0; TPOS.y = 0; TPOS.sc = 1; }
  function snapPos() { POS.x = TPOS.x; POS.y = TPOS.y; POS.sc = TPOS.sc; }
  function setGone(g) { if (g) setStateVal('gone'); petG.style.display = g ? 'none' : ''; shadow.style.display = g ? 'none' : ''; }

  // ---------- 操作（アプリの機能と対応） ----------
  function startSulk() { cur = null; setStateVal('sulk'); st = 0; sulkTaps = 0; TPOS.x = CORNER.x; TPOS.y = CORNER.y; TPOS.sc = CORNER.sc; say('……むぅ', 1.6); setMood('すねてる'); }
  function ohayo() { touch(); sulkTaps = 0; if (state === 'gone') return false; if (state === 'sulk') { setStateVal('idle'); play('comeback'); setMood('……'); } else { setStateVal('idle'); goCenter(); play('greet'); setMood('ごきげん'); } return true; }
  function touko() { touch(); if (state === 'gone') return false; if (state !== 'idle') { setStateVal('idle'); goCenter(); } play('touko'); setMood('ごきげん'); return true; }
  function oyasumi() { touch(); if (state === 'gone') return false; cur = null; goCenter(); setStateVal('sleep'); st = 0; say('じかんわり みたよ… おやすみ', 2.0); setMood('ねむい'); return true; }
  function iede() { if (state === 'gone') return false; if (state !== 'sulk') { startSulk(); snapPos(); } setStateVal('idle'); play('iede'); setMood('いえでちゅう…'); return true; }
  function find() { if (state !== 'gone') return false; petG.style.display = ''; shadow.style.display = ''; setStateVal('idle'); POS.x = TPOS.x = CORNER.x; POS.y = TPOS.y = CORNER.y; POS.sc = TPOS.sc = CORNER.sc; play('mitsuketa'); setMood('……'); touch(); return true; }
  /** アニメーションなしで状態を合わせる（ページを開いた時など） */
  function setState(s) {
    cur = null; petG.style.opacity = ''; shadow.style.opacity = ''; bubbleUntil = t;
    if (s === 'gone') { setGone(true); TPOS.x = EXIT_X; snapPos(); setMood('いえでちゅう…'); return; }
    setGone(false);
    if (s === 'sulk') { setStateVal('sulk'); st = 0; TPOS.x = CORNER.x; TPOS.y = CORNER.y; TPOS.sc = CORNER.sc; snapPos(); setMood('すねてる'); return; }
    goCenter(); snapPos(); st = 0; setStateVal(s === 'sleep' ? 'sleep' : 'idle'); setMood(s === 'sleep' ? 'ねむい' : 'ふつう');
  }

  // ---------- さわる ----------
  const toStage = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
  function region(s) {
    const x = (s.x - POS.x) / POS.sc, y = (s.y - POS.y) / POS.sc, ax = Math.abs(x);
    if (y < -1080 || y > 1050 || ax > 1100) return null;
    if (y > -330 && y < 250 && ax > 640) return x < 0 ? 'armL' : 'armR';
    if (y > 520) return 'hem';
    if (y < -250 && ax < 700) return 'head';
    return 'body';
  }
  function onSulkTouch() { if (cur === 'comeback' || pui > 0) return; sulkTaps++; pui = 0.8; say(sulkTaps < 3 ? 'ぷいっ' : 'おはよう してくれたら ゆるす', 1.8); }
  function onTap(r) {
    if (!r || state === 'gone') return;
    emit('tap', r);
    if (state === 'sleep') { setStateVal('idle'); play('sleepy'); ct = 3.38; setMood('ふつう'); return; }
    if (state === 'sulk') { onSulkTouch(); return; }
    if (cur) return;
    play(r === 'hem' ? 'tickle' : r === 'armL' ? 'waveL' : r === 'armR' ? 'waveR' : 'poke');
  }
  let drag = null, heartAcc = 0;
  const interactive = opts.interactive !== false;
  const onDown = e => { touch(); drag = { r: region(toStage(e)), lx: e.clientX, ly: e.clientY, dist: 0, t0: t }; try { svg.setPointerCapture(e.pointerId); } catch (_) {} };
  const onMove = e => {
    const s = toStage(e); pointer = { x: s.x, y: s.y, inside: true };
    if (!drag) return;
    const d = Math.hypot(e.clientX - drag.lx, e.clientY - drag.ly); drag.lx = e.clientX; drag.ly = e.clientY; drag.dist += d; touch();
    if ((drag.r === 'head' || region(s) === 'head') && drag.dist > 14) {
      if (state === 'sulk') { onSulkTouch(); return; }
      if (state === 'sleep' || cur) return;
      lastPet = t; petEnergy = clamp(petEnergy + d * 0.004, 0, 1.4); heartAcc += d;
      if (heartAcc > 180) { heartAcc = 0; hearts(1); emit('pet'); }
      if (bubbleUntil < t) say(['えへへ〜', 'すき〜', 'もっと〜'][Math.floor(Math.random() * 3)], 1.4);
    }
  };
  const onLeave = () => { pointer.inside = false; };
  const onUp = () => { if (drag && drag.dist < 14 && t - drag.t0 < 0.5) onTap(drag.r); drag = null; };
  const onCancel = () => { drag = null; };
  if (interactive) { svg.addEventListener('pointerdown', onDown); svg.addEventListener('pointermove', onMove); svg.addEventListener('pointerleave', onLeave); svg.addEventListener('pointerup', onUp); svg.addEventListener('pointercancel', onCancel); }
  else svg.style.cursor = 'default';

  // ---------- 物理 ----------
  const PH = { th: 0, om: 0, armL: 0, armLv: 0, armR: 0, armRv: 0, hem: 0, hemv: 0, prevLift: 0, prevLiftV: 0, prevX: 0, prevXV: 0, prevZ: 0 };
  function physics(v, lift, dt) {
    const rootX = v.ParamAngleX / 30 * 10, ang = v.ParamAngleZ / 30 * 10 * Math.PI / 180 * 3;
    const ax = (rootX - PH.prevX) / dt; const aax = (ax - PH.prevXV) / dt; PH.prevX = rootX; PH.prevXV = ax;
    PH.om += (-38 * (PH.th - ang) - 3.2 * PH.om - clamp(aax, -4000, 4000) * 0.03) * dt; PH.th += PH.om * dt;
    const hair = clamp(-PH.th * 3.2, -1, 1);
    const vy = (lift - PH.prevLift) / dt, ay = (vy - PH.prevLiftV) / dt; PH.prevLift = lift; PH.prevLiftV = vy;
    const zv = (v.ParamAngleZ - PH.prevZ) / dt; PH.prevZ = v.ParamAngleZ;
    for (const s of ['armL', 'armR']) { const sgn = s === 'armL' ? 1 : -1; PH[s + 'v'] += (-40 * PH[s] - 4 * PH[s + 'v'] - vy * 0.004 - clamp(ay, -60000, 60000) * 0.00045 + sgn * zv * 0.02) * dt; PH[s] += PH[s + 'v'] * dt; }
    PH.hemv += (-30 * PH.hem - 2.6 * PH.hemv - clamp(aax, -4000, 4000) * 0.05 - zv * 0.05) * dt; PH.hem += PH.hemv * dt;
    for (const k in PH) if (!Number.isFinite(PH[k])) PH[k] = 0;
    return { hair: Number.isFinite(hair) ? hair : 0, armL: clamp(PH.armL, -0.6, 0.6), armR: clamp(PH.armR, -0.6, 0.6), hem: clamp(PH.hem, -0.8, 0.8), wave: clamp(Math.abs(PH.hemv) * 0.05, 0, 0.6) };
  }

  // ---------- 形 ----------
  const BODY = RIG.body, P12 = RIG.p12, P14 = RIG.p14, NB = BODY.length, HALFN = (NB + 2) / 2;
  const armW = BODY.map(([, y]) => smooth(ramp(y - 16, 420, 640)) * (1 - smooth(ramp(y - 16, 1320, 1560))));
  let hemPhase = 0;
  function bodyAtlas(v) {
    const out = new Array(NB);
    for (let i = 0; i < NB; i++) {
      const [bx, by] = BODY[i], y0 = by - 16, x0 = bx - 960; let x = bx, y = by;
      const a = i < HALFN - 1 ? v.armL : v.armR, w = armW[i];
      if (w > 0 && a) { const T = a > 0 ? P12[i] : P14[i]; const k = (a > 0 ? Math.min(1.2, a) * 0.6 : Math.min(1, -a) * 0.4) * w; x += (T[0] - bx) * k; y += (T[1] - by) * k; }
      const wHem = Math.pow(ramp(y0, 1380, 1931), 1.3);
      if (wHem > 0) y += (18 + 55 * v.hemWave) * Math.sin(hemPhase + x0 * 0.0045) * wHem;
      const wSway = smooth(ramp(y0, 950, 1931));
      if (wSway > 0 && v.hemSway) { x += v.hemSway * 220 * Math.pow(wSway, 1.4); y -= Math.abs(v.hemSway) * 26 * wSway * (x0 * Math.sign(v.hemSway) < 0 ? 1 : -0.3); }
      out[i] = [x, y];
    }
    return out;
  }
  const FB = RIG.face_base, FV = RIG.faces;
  function faceAtlas(key, v) {
    const b0 = FB[key], ws = [['happy', v.happy], ['sad', v.sad], ['sad2', v.sad2], ['sulk', v.sulk]].filter(([, w]) => w > 0.001);
    return b0.map((b, i) => { let x = b[0], y = b[1]; for (const [k, w] of ws) { x += (FV[k][key][i][0] - b[0]) * w; y += (FV[k][key][i][1] - b[1]) * w; } return [x, y]; });
  }
  function closedPath(pts) {
    const n = pts.length; let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`; }
    return d + 'Z';
  }

  // ---------- 1フレーム ----------
  const shadowS = { x: 0 };
  let blinkNext = 3, blinkT = -1, blinkDouble = false, zAcc = 0, dotsAcc = 0, squashS = 0, liftS = 0;
  function step(dt) {
    if (!(dt > 0)) return;
    t += dt; st += dt;
    if (NEG) {
      const idleFor = t - lastTouch;
      if (state === 'idle' && !cur && idleFor > NEG.idleToSulkSec) startSulk();
      else if (state === 'sulk' && !cur && st > NEG.sulkToIedeSec) iede();
    }
    let v = Object.assign({}, DEF), lift = 0, squash = 0;
    if (state === 'idle') { Object.assign(v, L2DM.idle.f(t % L2DM.idle.dur)); v.ParamEyeLOpen = v.ParamEyeROpen = 1; lift += 28 * Math.sin(t * 2.1); v.armL += 0.12 * Math.sin(t * 2.1 - 0.6); v.armR += 0.12 * Math.sin(t * 2.1 - 0.6); }
    if (state === 'sulk') lift += 10 * Math.sin(t * 1.3);
    if (state === 'sleep') {
      const k = (st % 3.4) / 3.4, fall = k < 0.8 ? smooth(k / 0.8) : 1 - smooth((k - 0.8) / 0.2);
      Object.assign(v, { ParamEyeLOpen: 0, ParamEyeROpen: 0, ParamAngleY: 10 + 16 * fall, ParamAngleZ: 8 + 4 * fall, ParamAngleX: 0, hemWave: 0.12, armL: -0.2, armR: -0.2 });
      zAcc += dt; if (zAcc > 1.2) { zAcc = 0; spawnZ(); }
    }
    if (state === 'sulk') {
      const k = (st % 5) / 5, peek = k > 0.62 && k < 0.86 ? Math.sin((k - 0.62) / 0.24 * Math.PI) : 0;
      Object.assign(v, { sulk: 1 - 0.5 * peek, armL: -0.75, armR: -0.75, ParamAngleX: 14 - 18 * peek, ParamAngleY: 12 - 8 * peek, ParamAngleZ: -6, hemWave: 0.1 });
      if (pui > 0) { pui -= dt; const e = Math.sin(clamp(1 - pui / 0.8, 0, 1) * Math.PI); v.ParamAngleX = 28 * e + v.ParamAngleX * (1 - e); v.ParamAngleZ = -18 * e - 6; lift += 60 * e; }
      dotsAcc += dt; if (dotsAcc > 2.6) { dotsAcc = 0; spawnDots(); }
    }
    petEnergy = Math.max(0, petEnergy - dt * (t - lastPet < 0.35 ? 0.2 : 0.9));
    if (petEnergy > 0.02 && state === 'idle' && !cur) { const e = clamp(petEnergy, 0, 1); v.happy = e; v.ParamAngleZ += 8 * Math.sin(t * 5) * e; v.ParamAngleY -= 5 * e; v.armL += 0.3 * e; v.armR += 0.3 * e; v.hemWave = 0.3 + 0.5 * e; v.ParamBreath = 0.5 + 0.5 * Math.sin(t * 7) * e; }
    if (cur) {
      const M = MOTIONS[cur]; ct += dt;
      for (const [et, fn] of (M.ev || [])) if (ct >= et && !fired.has(et)) { fired.add(et); fn(); }
      const o = M.f(Math.min(ct, M.dur));
      const w = M.pos ? 1 : Math.min(1, ct / Math.max(0.01, M.fin)) * (1 - ramp(ct, M.dur - M.fout, M.dur));
      for (const kk in o) { if (kk in v) v[kk] = lerp(v[kk], o[kk], w); }
      lift += (o.lift || 0) * w; squash += (o.squash || 0) * w;
      if (M.pos) { TPOS.x = o.px; TPOS.y = o.py; TPOS.sc = o.sc; }
      petG.style.opacity = ('fade' in o) ? o.fade.toFixed(3) : '';
      shadow.style.opacity = ('fade' in o && o.fade < 1) ? (0.45 * o.fade).toFixed(3) : '';
      if (ct >= M.dur) { const was = cur; cur = null; petG.style.opacity = ''; shadow.style.opacity = ''; if (was === 'iede') { setGone(true); TPOS.x = EXIT_X; } else if (M.pos) goCenter(); emit('motionend', was); }
    }
    const TP = 2 * Math.PI;
    v.ParamAngleX += 7.5 * Math.sin(TP * t / 6.5345); v.ParamAngleY += 4 * Math.sin(TP * t / 3.5345); v.ParamAngleZ += 5 * Math.sin(TP * t / 5.5345);
    v.ParamBreath = clamp(v.ParamBreath + 0.25 + 0.25 * Math.sin(TP * t / 3.2345), 0, 1);
    if (pointer.inside && state === 'idle' && !cur) { const fx = clamp((pointer.x - POS.x) / 1300, -1, 1), fy = clamp((pointer.y - POS.y + 300) / 1300, -1, 1); v.ParamAngleX += fx * 18; v.ParamAngleY += fy * 14; v.ParamAngleZ += -fx * fy * 10; }
    // まばたき：6〜10秒ごと、2割で2回続ける。モーション中も続ける
    if (blinkT < 0 && t >= blinkNext) {
      blinkT = 0;
      if (!blinkDouble && Math.random() < 0.2) { blinkDouble = true; blinkNext = t + 0.32 + Math.random() * 0.08; }
      else { blinkDouble = false; blinkNext = t + 6 + Math.random() * 4; }
    }
    let b = 1;
    if (blinkT >= 0) { blinkT += dt; const k = blinkT / 0.2; b = k < 0.4 ? 1 - k / 0.4 : clamp((k - 0.4) / 0.6, 0, 1); b = smooth(b); if (blinkT > 0.2) blinkT = -1; }
    if (state !== 'sleep') { if (v.ParamEyeLOpen >= 0.6) v.ParamEyeLOpen *= Math.max(0.02, b); if (v.ParamEyeROpen >= 0.6) v.ParamEyeROpen *= Math.max(0.02, b); }
    liftS = spring(liftS, lift, 30, dt); squashS = spring(squashS, squash, 30, dt);
    const ph = physics(v, liftS, dt);
    v.ParamHairSide = ph.hair; v.armL += ph.armL; v.armR += ph.armR; v.hemSway += ph.hem; v.hemWave = clamp(v.hemWave + ph.wave, 0, 1);
    v.happy *= 0.6; v.sad *= 0.6; v.sad2 *= 0.6; // 笑顔・しょんぼりは描いた形の6割まで
    for (const k in held) v[k] = held[k];
    for (const p of PARAMS) { V[p.id] = p.l2d ? v[p.id] : spring(V[p.id], v[p.id], 18, dt); V[p.id] = clamp(V[p.id], p.min, p.max + (p.id.startsWith('arm') ? 0.2 : 0)); }
    hemPhase += (2 + 6 * V.hemWave) * dt;
    const posK = cur && MOTIONS[cur].pos ? 8 : 2.4;
    POS.x = spring(POS.x, TPOS.x, posK, dt); POS.y = spring(POS.y, TPOS.y, posK, dt); POS.sc = spring(POS.sc, TPOS.sc, posK, dt);
    const pv = model.parameters.values;
    for (const p of PARAMS) if (p.l2d) pv[PIDX[p.id]] = V[p.id];
    model.update();
    outline.setAttribute('d', closedPath(mapPts(bodyAtlas(V), PART.body)));
    eyeLp.setAttribute('d', closedPath(mapPts(faceAtlas('eyeL', V), PART.eyeL)));
    eyeRp.setAttribute('d', closedPath(mapPts(faceAtlas('eyeR', V), PART.eyeR)));
    mouthP.setAttribute('d', closedPath(mapPts(faceAtlas('mouth', V), PART.mouth)));
    const sx = 1 + 0.1 * squashS, sy = 1 - 0.12 * squashS;
    petG.setAttribute('transform', `translate(${POS.x.toFixed(1)} ${(POS.y - liftS * POS.sc).toFixed(1)}) scale(${POS.sc.toFixed(4)}) translate(0 1000) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(0 -1000)`);
    const lf = clamp(liftS / 300, 0, 1);
    const lean = V.ParamAngleZ * 7 + V.ParamHairSide * 70 + V.hemSway * 90 + V.ParamAngleX * 2;
    const sw = 1 + 0.10 * squashS + 0.025 * (V.ParamBreath - 0.5) + 0.04 * Math.abs(V.hemSway);
    const shK = 1 - 0.38 * lf;
    shadowS.x = spring(shadowS.x, lean, 8, dt);
    shadow.setAttribute('cx', (POS.x + shadowS.x * POS.sc).toFixed(1)); shadow.setAttribute('cy', (POS.y + 1330 * POS.sc).toFixed(1));
    shadow.setAttribute('rx', (720 * POS.sc * sw * shK).toFixed(1)); shadow.setAttribute('ry', (90 * POS.sc * (1 + 0.06 * squashS) * shK).toFixed(1));
    shadow.setAttribute('opacity', (0.45 * (1 - 0.45 * lf)).toFixed(3));
    updateParts(dt);
    if (bubbleUntil && t > bubbleUntil) { if (bubble) bubble.style.opacity = '0'; bubbleUntil = 0; emit('sayend'); }
  }

  // ---------- ループ（dt=0 のフレームは飛ばす・タブ非表示中は止める） ----------
  let raf = 0, last = 0, running = false, destroyed = false;
  const manual = !!opts.manual;
  function loop(now) {
    if (!running) return;
    if (!last) last = now;
    const raw = (now - last) / 1000;
    if (raw > 0.004) { last = now; step(Math.min(0.05, raw)); } else if (raw < 0) last = now;
    raf = requestAnimationFrame(loop);
  }
  function resume() { if (destroyed || manual || running) return; running = true; last = 0; raf = requestAnimationFrame(loop); }
  function pause() { running = false; cancelAnimationFrame(raf); }
  const onVis = () => { document.hidden ? pause() : resume(); };
  document.addEventListener('visibilitychange', onVis);

  if (opts.initialState) setState(opts.initialState);
  step(1 / 60);
  if (!document.hidden) resume();

  const api = {
    // アプリの機能と対応する操作
    ohayo, touko, oyasumi, sulk: () => { if (state === 'gone') return false; startSulk(); return true; }, iede, find,
    // その他
    play, setState, hearts, say, setMood,
    getState: () => state, getMood: () => mood, isPlaying: () => cur, motions: () => Object.keys(MOTIONS),
    on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return () => { listeners[ev] = (listeners[ev] || []).filter(f => f !== fn); }; },
    pause, resume, step,
    hold(o) { Object.assign(held, o); }, release(ids) { if (ids) for (const k of ids) delete held[k]; else for (const k in held) delete held[k]; },
    /** 今のパラメータの値（スライダー表示用） */
    getValues: () => ({ ...V }), getHeld: () => ({ ...held }),
    /** 単独モーションを再生（いえで中は無視。寝ている・すね中なら起こして中央に戻してから） */
    playDemo(name) { if (state === 'gone' || !MOTIONS[name] || MOTIONS[name].pos) return false; touch(); if (state !== 'idle') { setStateVal('idle'); goCenter(); } return play(name); },
    tap: onTap,
    destroy() {
      destroyed = true; pause(); document.removeEventListener('visibilitychange', onVis);
      if (interactive) { svg.removeEventListener('pointerdown', onDown); svg.removeEventListener('pointermove', onMove); svg.removeEventListener('pointerleave', onLeave); svg.removeEventListener('pointerup', onUp); svg.removeEventListener('pointercancel', onCancel); }
      try { model.release(); } catch (_) {}
      wrap.remove(); for (const k in listeners) delete listeners[k];
    },
    _debug: () => ({ t, state, cur, POS: { ...POS }, V: { ...V } }),
  };
  return api;
}
