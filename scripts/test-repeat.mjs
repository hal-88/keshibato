// 力加減の 再現性：同じ 入力なら いつも 同じ 結果に なるか（摩擦・滑り・ぶつかりに ランダムが まざっていないか）
// 使い方: node scripts/test-repeat.mjs
// ※ サイコロン・ユンノなど「運」が 能力の 消しゴム・カードは 対象外（わざと ランダム）
import { Game } from '../src/logic/Game.js';
import { findDesk } from '../src/config/desks.js';
import { findEraser } from '../src/config/erasers.js';
import { PHYSICS } from '../src/config/physics.js';
import { GAME } from '../src/config/game.js';
import Matter from 'matter-js';

const { Body } = Matter;
let ok = 0;
let ng = 0;
const check = (name, cond, info = '') => {
  if (cond) ok++;
  else ng++;
  console.log(`${cond ? '○' : '×'} ${name} ${info}`);
};

/** 自分 (a) が (-300, 0) から 右へ。相手 (b) は (-150, off)。おわりの 盤面を 文字に して 返す */
function play(a, b, { off = 0, strength = 0.8, spin = 0, desk = 'giant' } = {}) {
  const g = new Game({
    desk: findDesk(desk),
    players: [a, b].map((id) => ({ name: 'P', type: 'human', eraser: findEraser(id), color: '' })),
    firstTurn: 0,
  });
  const [me, o] = g.erasers;
  Body.setPosition(me.body, { x: -300, y: 0 });
  Body.setAngle(me.body, 0);
  Body.setPosition(o.body, { x: -150, y: off });
  Body.setAngle(o.body, Math.PI / 2);
  g.flick(0, 1, 0, strength, spin);
  let ms = 0;
  while (g.phase !== 'aim' && g.phase !== 'over' && ms < 20000) {
    g.step(PHYSICS.timeStep);
    ms += PHYSICS.timeStep;
  }
  const st = g.exportState();
  const r = (v) => v.toFixed(4);
  return [
    ...st.pieces.map((p) => `${r(p.x)},${r(p.y)},${r(p.angle)}`),
    ...st.junk.map((j) => `j:${r(j.x)},${r(j.y)},${r(j.angle)}`),
  ].join(' | ');
}
const same = (fn) => {
  const a = [0, 1, 2, 3].map(fn);
  return { ok: a.every((x) => x === a[0]), sample: a[0].slice(0, 60) };
};

const cases = [
  ['まっすぐ 当てる', () => play('white-standard', 'white-standard')],
  ['ずらして 回転を かけて 当てる', () => play('white-standard', 'white-standard', { off: 14, spin: 0.7 })],
  ['弱く 弾く（当たらない）', () => play('white-standard', 'white-standard', { off: 200, strength: 0.33 })],
  ['ワックス机（すべる）', () => play('fuwakaru', 'jumbo', { desk: 'wax', strength: 0.5, off: 8 })],
  ['パーツが 外れる（ガッタイン）', () => play('jumbo', 'gattain', { strength: 1 })],
  ['カバーが 外れる（ガードン）', () => play('jumbo', 'gardon', { strength: 1, off: 6 })],
  ['ネタが 飛ぶ（スシケシ）', () => play('jumbo', 'sushikeshi', { strength: 1, off: -6 })],
  ['キンメダルが 相手を 回す', () => play('kinmedal', 'white-standard', { strength: 0.9, off: 10 })],
];
for (const [name, fn] of cases) {
  const r = same(fn);
  check(`同じ 入力 4回で 同じ 結果：${name}`, r.ok, r.sample);
}

// 引きの 長さと 強さ（比例・画面の 大きさ）
const c = GAME.input;
const maxPull = (short) => Math.max(c.minMaxPullPx, Math.min(c.maxPullPx, short * c.maxPullScreen));
check('最大パワーの 引きの 長さ：スマホ 225px・タブレット/PC 240px', maxPull(375) === 225 && maxPull(768) === 240 && maxPull(600) === 240, `375→${maxPull(375)} 768→${maxPull(768)}`);
check('とても 小さい 画面でも 180px より 短く しない', maxPull(280) === 180);

console.log(`\n${ok} ok / ${ng} ng`);
