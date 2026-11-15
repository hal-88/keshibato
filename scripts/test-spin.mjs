// 回転（スピン）の しくみを 画面なしで ためす
// 使い方: node scripts/test-spin.mjs
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

// 広い机。自分は (-300, 0) から 右へ。相手は (ox, oy)
const make = (ox = 300, oy = 250) => {
  const g = new Game({
    desk: findDesk('giant'),
    players: ['white-standard', 'white-standard'].map((id) => ({ name: 'P', type: 'human', eraser: findEraser(id), color: '' })),
    firstTurn: 0,
  });
  Body.setPosition(g.erasers[0].body, { x: -300, y: 0 });
  Body.setAngle(g.erasers[0].body, 0);
  Body.setPosition(g.erasers[1].body, { x: ox, y: oy });
  Body.setAngle(g.erasers[1].body, Math.PI / 2); // 相手は たて向き（当たる 面が まっすぐ）
  return g;
};
/** 弾いて 番が おわるまで。とちゅうの いちばん 速い 回転も おぼえる */
const shoot = (g, strength, spin) => {
  g.flick(0, 1, 0, strength, spin);
  const w0 = g.erasers[0].body.angularVelocity;
  let ms = 0;
  let peakB = 0;
  let rot = 0;
  let prev = g.erasers[0].body.angle;
  while (g.phase !== 'aim' && g.phase !== 'over' && ms < 20000) {
    g.step(PHYSICS.timeStep);
    ms += PHYSICS.timeStep;
    const wb = g.erasers[1].body.angularVelocity;
    if (Math.abs(wb) > Math.abs(peakB)) peakB = wb;
    rot += Math.abs(g.erasers[0].body.angle - prev);
    prev = g.erasers[0].body.angle;
  }
  const [a, b] = g.erasers.map((e) => ({ x: e.body.position.x, y: e.body.position.y }));
  return { w0, ms, peakB, turns: rot / (2 * Math.PI), a, b };
};

// ---- かけ方 ----
{
  const weak = shoot(make(), 0.3, 1);
  const none = shoot(make(), 0.3, 0);
  check('弱く 弾いても 回転が かかる', Math.abs(weak.w0) > PHYSICS.spin.maxAngular * 0.4 && weak.turns > 1 && none.turns === 0, `${weak.turns.toFixed(2)}回転`);
  const l = shoot(make(), 1, -1);
  const r = shoot(make(), 1, 1);
  check('右回り・左回りで 反対へ 曲がる', l.a.y < -20 && r.a.y > 20 && Math.abs(l.a.y + r.a.y) < 1, `よこ ${l.a.y.toFixed(0)} / ${r.a.y.toFixed(0)}`);
  check('しっかり 回る（全力で 4回転 以上）', r.turns >= 4, `${r.turns.toFixed(2)}回転`);
}

// ---- すべり方 ----
{
  const s0 = shoot(make(), 1, 0);
  const s1 = shoot(make(), 1, 1);
  const d0 = s0.a.x + 300;
  const d1 = Math.hypot(s1.a.x + 300, s1.a.y);
  check('回っていると よく すべる（遠くまで）', d1 > d0 * 1.05, `まっすぐ${d0.toFixed(0)} / 回転${d1.toFixed(0)}`);
  check('回転しても 番は 長く ならない（2秒 以内）', s1.ms < 2000, `${Math.round(s1.ms)}ms`);
}

// ---- ぶつかった とき ----
{
  // まん中を まっすぐ：相手は ほとんど 回らない
  const c = shoot(make(-150, 0), 0.7, 0);
  // 上に ずらして 当てる・下に ずらして 当てる：相手は 反対向きに 回る
  const up = shoot(make(-150, -22), 0.7, 0);
  const dn = shoot(make(-150, 22), 0.7, 0);
  check('まん中を まっすぐ つくと 相手は ほとんど 回らない', Math.abs(c.peakB) < 0.03, `回転 ${c.peakB.toFixed(3)}`);
  check('ずれて 当たると 相手が 回る（ずれた 向きで 回る 向きが きまる）', Math.abs(up.peakB) > 0.05 && Math.sign(up.peakB) === -Math.sign(dn.peakB), `${up.peakB.toFixed(3)} / ${dn.peakB.toFixed(3)}`);
  // 回りながら 当たると、自分が よこへ それる（回転の 向きで 反対へ）
  const r = shoot(make(-150, 0), 0.7, 1);
  const l = shoot(make(-150, 0), 0.7, -1);
  check('回りながら 当たると 自分が よこへ それる', Math.abs(r.a.y - c.a.y) > 8 && Math.sign(r.a.y - c.a.y) === -Math.sign(l.a.y - c.a.y), `まっすぐ${c.a.y.toFixed(0)} 右回り${r.a.y.toFixed(0)} 左回り${l.a.y.toFixed(0)}`);
  // 同じ 入力なら 同じ 結果
  const again = [0, 1, 2].map(() => shoot(make(-150, 14), 0.8, 0.6));
  const same = again.every((x) => x.a.x === again[0].a.x && x.a.y === again[0].a.y && x.b.x === again[0].b.x && x.b.y === again[0].b.y);
  check('同じ 入力なら いつも 同じ 結果（ランダムなし）', same, `相手 (${again[0].b.x.toFixed(1)}, ${again[0].b.y.toFixed(1)})`);
}

console.log(`\n${ok} ok / ${ng} ng`);
