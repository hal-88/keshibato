// 当たり方による 威力の 差を 画面なしで ためす
// 使い方: node scripts/test-hit.mjs
import { Game } from '../src/logic/Game.js';
import { findDesk } from '../src/config/desks.js';
import { findEraser } from '../src/config/erasers.js';
import { PHYSICS } from '../src/config/physics.js';
import Matter from 'matter-js';

const { Body } = Matter;
let ok = 0;
let ng = 0;
const check = (name, cond, info = '') => {
  if (cond) ok++;
  else ng++;
  console.log(`${cond ? '○' : '×'} ${name} ${info}`);
};

/** 自分は (-300, 0) から 右へ。相手（たて向き）は (-150, ずれ) */
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
  const hits = [];
  g.on('hit', (h) => hits.push(h));
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
    fwd: o.body.position.x + 150, // 相手が 前へ 押された きょり
    side: o.body.position.y - offset,
    turns: rot / (2 * Math.PI),
    hits,
    pos: `${o.body.position.x.toFixed(2)},${o.body.position.y.toFixed(2)},${me.body.position.x.toFixed(2)},${me.body.position.y.toFixed(2)}`,
  };
}

// まん中を まっすぐ：押す 力が 最大。はしに 当たるほど 弱い
const c = shoot(0, 0);
const o10 = shoot(10, 0);
const o20 = shoot(20, 0);
const o28 = shoot(28, 0);
check('まん中を まっすぐ つくと いちばん 押せる（はしほど 弱い）', c.fwd > o10.fwd && o10.fwd > o20.fwd && o20.fwd > o28.fwd, `まん中${c.fwd.toFixed(0)} → ${o10.fwd.toFixed(0)} → ${o20.fwd.toFixed(0)} → はし${o28.fwd.toFixed(0)}`);
check('まん中を まっすぐ つくと 相手は 回らない', c.turns < 0.05, `${c.turns.toFixed(2)}回転`);
check('まん中を 強く つくと「ジャスト」', shoot(0, 0, 1).hits[0]?.just === true && !shoot(28, 0, 1).hits[0]?.just);

// 回転を かけて 当てる：押す 力は 弱く、相手が 回って よこへ それる
for (const st of [0.7, 1]) {
  const s0 = shoot(0, 0, st);
  const s1 = shoot(0, 1, st);
  const s2 = shoot(0, -1, st);
  check(`回転で 当てると 押す 力は 弱い（強さ${st}）`, s1.fwd < s0.fwd && s2.fwd < s0.fwd, `まっすぐ${s0.fwd.toFixed(0)} / 回転${s1.fwd.toFixed(0)}・${s2.fwd.toFixed(0)}`);
  check(`回転で 当てると 相手が 回る（強さ${st}）`, s1.turns > s0.turns + 0.4 && s2.turns > s0.turns + 0.4, `まっすぐ${s0.turns.toFixed(2)} / 回転${s1.turns.toFixed(2)}・${s2.turns.toFixed(2)}回転`);
}
check('回転で 当てると「回転」の しるし', shoot(0, 1, 1).hits[0]?.spun === true && !shoot(0, 0, 1).hits[0]?.spun);

// 同じ 入力なら 同じ 結果
const again = [0, 1, 2].map(() => shoot(12, 0.7, 0.85).pos);
check('同じ 入力なら いつも 同じ 結果', again.every((p) => p === again[0]), again[0]);

// 倍率は 設定の 範囲（かってに 強く なりすぎない）
const H = PHYSICS.hit;
check('設定：まん中 > はし、回転で へる', H.centerPower > H.edgePower && H.spinPushLoss > 0 && H.minScale <= H.edgePower * (1 - H.spinPushLoss) + 0.2);

console.log(`\n${ok} ok / ${ng} ng`);
