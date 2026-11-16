// 当たり方で 相手が どれだけ 飛ぶか・回るかを 数字で 見る（調整用・変更前後の くらべ用）: node scripts/hit-report.mjs
// 広い机。自分（シロカク）は (-300, 0) から 右へ 0.7 の 強さで。相手（シロカク・たて向き）は (-150, ずれ)
import { Game } from '../src/logic/Game.js';
import { findDesk } from '../src/config/desks.js';
import { findEraser } from '../src/config/erasers.js';
import { PHYSICS } from '../src/config/physics.js';
import Matter from 'matter-js';

const { Body } = Matter;
function shoot(offset, spin, strength = 0.7) {
  const g = new Game({
    desk: findDesk('giant'),
    players: ['white-standard', 'white-standard'].map((id) => ({ name: 'P', type: 'human', eraser: findEraser(id), color: '' })),
    firstTurn: 0,
  });
  const [me, o] = g.erasers;
  Body.setPosition(me.body, { x: -300, y: 0 });
  Body.setAngle(me.body, 0);
  Body.setPosition(o.body, { x: -150, y: offset });
  Body.setAngle(o.body, Math.PI / 2);
  g.flick(0, 1, 0, strength, spin);
  let ms = 0;
  let rot = 0;
  let prev = o.body.angle;
  while (g.phase !== 'aim' && g.phase !== 'over' && ms < 20000) {
    g.step(PHYSICS.timeStep);
    ms += PHYSICS.timeStep;
    rot += Math.abs(o.body.angle - prev);
    prev = o.body.angle;
  }
  return {
    push: Math.hypot(o.body.position.x + 150, o.body.position.y - offset), // 相手が 動いた きょり
    side: o.body.position.y - offset, // 相手が よこへ それた ぶん
    turns: rot / (2 * Math.PI), // 相手が 回った 回数
    self: me.body.position.x + 300, // 自分が 進んだ きょり
    selfSide: me.body.position.y,
  };
}

const f = (v, d = 0) => v.toFixed(d).padStart(6);
console.log('当てる 場所（まん中からの ずれ）と 回転 → 相手の 動き');
console.log('ずれ 回転 | 相手が 飛ぶ  よこ  回った回数 | 自分 進む よこ');
for (const off of [0, 10, 20, 28]) {
  const r = shoot(off, 0);
  console.log(`${String(off).padStart(3)}  0.0  |   ${f(r.push)}   ${f(r.side)}   ${f(r.turns, 2)}   | ${f(r.self)} ${f(r.selfSide)}`);
}
for (const spin of [0.5, 1, -1]) {
  const r = shoot(0, spin);
  console.log(`  0 ${spin.toFixed(1).padStart(4)}  |   ${f(r.push)}   ${f(r.side)}   ${f(r.turns, 2)}   | ${f(r.self)} ${f(r.selfSide)}`);
}
