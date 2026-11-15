// 回転（スピン）の きき方を 数字で 見る（調整用・変更前後の くらべ用）: node scripts/spin-report.mjs
// 巨人の机（広い）で、相手に 当たらない 向きへ 弾いて、回った回数・進んだきょり・よこへの 曲がり・止まるまでの 時間を 出す
import { Game } from '../src/logic/Game.js';
import { findDesk } from '../src/config/desks.js';
import { findEraser } from '../src/config/erasers.js';
import { PHYSICS } from '../src/config/physics.js';
import Matter from 'matter-js';

const { Body } = Matter;
const mk = (id = 'white-standard') => {
  const g = new Game({
    desk: findDesk('giant'),
    players: [
      { name: 'A', type: 'human', eraser: findEraser(id), color: '' },
      { name: 'B', type: 'human', eraser: findEraser('white-standard'), color: '' },
    ],
    firstTurn: 0,
  });
  Body.setPosition(g.erasers[0].body, { x: -300, y: 0 });
  Body.setAngle(g.erasers[0].body, 0);
  Body.setPosition(g.erasers[1].body, { x: 300, y: 250 }); // じゃまに ならない ところ
  return g;
};

function shoot(strength, spin, id) {
  const g = mk(id);
  const e = g.erasers[0];
  const p0 = { ...e.body.position };
  g.flick(0, 1, 0, strength, spin);
  let ms = 0;
  let rot = 0;
  let prev = e.body.angle;
  let moveMs = 0;
  while (g.phase !== 'aim' && g.phase !== 'over' && ms < 20000) {
    g.step(PHYSICS.timeStep);
    ms += PHYSICS.timeStep;
    rot += Math.abs(e.body.angle - prev);
    prev = e.body.angle;
    if (e.body.speed > 0.3) moveMs = ms;
  }
  return {
    forward: e.body.position.x - p0.x,
    side: e.body.position.y - p0.y,
    turns: rot / (2 * Math.PI),
    ms,
    moveMs,
  };
}

const f = (v, d = 0) => v.toFixed(d).padStart(6);
console.log('強さ 回転 | 前へ   よこ   回った回数 動いた時間 番の時間');
for (const s of [0.5, 1]) {
  for (const spin of [0, 0.5, 1]) {
    const r = shoot(s, spin);
    console.log(`${s.toFixed(1)}  ${spin.toFixed(1)}  |${f(r.forward)} ${f(r.side)}   ${f(r.turns, 2)}      ${f(r.moveMs)}ms ${f(r.ms)}ms`);
  }
}

// 同じ 入力で 同じ 結果か（ばらつき）
const a = Array.from({ length: 5 }, () => shoot(0.8, 0.7));
const spread = Math.max(...a.map((r) => r.forward)) - Math.min(...a.map((r) => r.forward));
console.log(`\n同じ 入力 5回の ばらつき（前へ）: ${spread.toFixed(3)}`);
