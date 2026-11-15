// ハンドスピナー（ログインボーナスの 消しゴム）の とくせいを 画面なしで ためす
// 使い方: node scripts/test-spinner.mjs
import { Game } from '../src/logic/Game.js';
import { findDesk } from '../src/config/desks.js';
import { findEraser, SPINNER_ERASERS } from '../src/config/erasers.js';
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

const make = (a, b = 'white-standard', desk = 'giant') => {
  const players = [a, b].map((id, i) => ({ name: 'P' + i, type: 'human', eraser: findEraser(id), color: '' }));
  return new Game({ desk: findDesk(desk), players, firstTurn: 0 });
};
const run = (g, max = 20000) => {
  let ms = 0;
  while (g.phase !== 'aim' && g.phase !== 'over' && ms < max) {
    g.step(PHYSICS.timeStep);
    ms += PHYSICS.timeStep;
  }
};
// その人の番に、相手の いない ほうへ 弱く 弾く（番を すすめる）
const pass = (g) => {
  const i = g.turnIndex;
  g.flick(i, 0, i === 0 ? 1 : -1, 0.15);
  run(g);
};

check('8色 そろっている', SPINNER_ERASERS.length === 8 && SPINNER_ERASERS.every((e) => e.stats.power + e.stats.balance + e.stats.speed === 9), SPINNER_ERASERS.map((e) => e.name).join('・'));

// 回転は 自分の 番 3回で 止まる（赤は 2回）
{
  const g = make('spinner-blue');
  let stop = 0;
  g.on('trait', (t) => t.type === 'spinStop' && stop++);
  const e = g.erasers[0];
  const seq = [e.spinLeft];
  for (let k = 0; k < 3; k++) {
    pass(g); // 自分
    seq.push(e.spinLeft);
    pass(g); // 相手
  }
  check('青：自分の 番 3回で 回転が 止まる', seq.join(',') === '3,2,1,0' && stop === 1, seq.join(','));
  // 止まったら：まっすぐ 弾いても 回らない。横から 引いて（回転を かけて）弾くと 回し直せる（その 番は へらない）
  g.flick(0, 0, 1, 0.3, 0);
  run(g);
  const still = e.spinLeft === 0 && g.spinStopped(0);
  pass(g);
  let re = 0;
  g.on('trait', (t) => t.type === 'respin' && re++);
  g.flick(0, 0, 1, 0.3, 0.6);
  run(g);
  check('止まったら まっすぐでは 回らず、横から 引いて 弾くと 回し直せる', still && re === 1 && e.spinLeft === 3, `のこり${e.spinLeft}`);
}
{
  // 回っている 間は 横から 引いても 回し直しに ならない（へるだけ）
  const g = make('spinner-blue');
  let re = 0;
  g.on('trait', (t) => t.type === 'respin' && re++);
  g.flick(0, 0, 1, 0.3, 0.8);
  run(g);
  check('回っている 間は 回し直しに ならない', re === 0 && g.erasers[0].spinLeft === 2, `のこり${g.erasers[0].spinLeft}`);
}
{
  // CPU は 止まったら いつも 回し直す
  const players = ['spinner-blue', 'white-standard'].map((id, i) => ({ name: 'P' + i, type: i === 0 ? 'cpu' : 'human', eraser: findEraser(id), color: '' }));
  const g = new Game({ desk: findDesk('giant'), players, firstTurn: 0 });
  g.erasers[0].spinLeft = 0;
  g.flick(0, 0, 1, 0.3, 0);
  check('CPU は 止まったら いつも 回し直す', g.erasers[0].spinLeft === 3);
}
{
  const g = make('spinner-red');
  check('赤：回転は 2回', g.erasers[0].spinLeft === 2);
  const k = make('spinner-black');
  check('黒：回転は 5回', k.erasers[0].spinLeft === 5);
  const gold = make('spinner-gold');
  for (let n = 0; n < 6; n++) pass(gold);
  check('金：回転が ずっと 止まらない', gold.erasers[0].spinLeft === 99 && gold.getState().erasers[0].trait.spinning);
}

// 回っている 間は 当たった 相手を はじく（止まっていると ふつう）
const hitDistance = (id, stopped) => {
  const g = make(id, 'white-standard', 'giant');
  const me = g.erasers[0];
  const o = g.erasers[1];
  Body.setPosition(me.body, { x: 0, y: 0 });
  Body.setPosition(o.body, { x: 120, y: 0 });
  Body.setAngle(o.body, 0);
  if (stopped) {
    me.spinLeft = 0;
    g._spinState(me);
  }
  g.flick(0, 1, 0, 0.6);
  run(g);
  return o.body.position.x - 120;
};
{
  // ぶつかった ときの 回り方が ランダムなので、8回の 平均で くらべる
  const avg = (id, stopped) => Array.from({ length: 8 }, () => hitDistance(id, stopped)).reduce((a, b) => a + b, 0) / 8;
  const spin = avg('spinner-blue', false);
  const still = avg('spinner-blue', true);
  check('回っている 間は 当たった 相手を はじく', spin > still * 1.1, `回転${spin.toFixed(0)} / 止まり${still.toFixed(0)}`);
  // 赤：はじく 力（push）が ふつうより 大きい。同じ 赤で、ふつうの 強さに した ときと くらべる
  const rt = findEraser('spinner-red').trait;
  const red = avg('spinner-red', false);
  const keep = [rt.push, rt.max];
  [rt.push, rt.max] = [0.2, 3.5];
  const redNormal = avg('spinner-red', false);
  [rt.push, rt.max] = keep;
  check('赤：当てる 力が 強い（相手が 遠くへ 飛ぶ）', red > redNormal + 3, `赤${red.toFixed(0)} / ふつう${redNormal.toFixed(0)}`);
}

// 白：当てた 相手を こおらせる → 相手の 番が おわると とける
{
  const g = make('spinner-white', 'white-standard', 'giant');
  let frz = 0;
  g.on('trait', (t) => t.type === 'freeze' && frz++);
  const me = g.erasers[0];
  const o = g.erasers[1];
  Body.setPosition(me.body, { x: 0, y: 0 });
  Body.setPosition(o.body, { x: 110, y: 0 });
  g.flick(0, 1, 0, 0.6);
  run(g);
  const frozen = !!o.frozen && g.getState().erasers[1].trait.frozen;
  // 保存して 読みなおしても こおった まま
  const g2 = make('spinner-white', 'white-standard', 'giant');
  g2.importState(JSON.parse(JSON.stringify(g.exportState())));
  const kept = !!g2.erasers[1].frozen && g2.erasers[0].spinLeft === g.erasers[0].spinLeft;
  pass(g); // 相手の 番
  check('白：当てた 相手が こおる（保存しても のこる）→ 相手の 番が おわると とける', frz === 1 && frozen && kept && !o.frozen, `こおった${frozen} のこる${kept} とけた${!o.frozen}`);
}

// 銀：止まると ただの 重り（重くて 弱い）
{
  const g = make('spinner-silver');
  const e = g.erasers[0];
  const m1 = e.body.mass;
  e.spinLeft = 0;
  g._spinState(e);
  check('銀：止まると 重くて 弱い', e.body.mass > m1 * 1.2 && g._spinPower(e) < 1, `重さ ${m1.toFixed(2)}→${e.body.mass.toFixed(2)}`);
}

// 金：まっすぐ 弾いても カーブする
{
  const g = make('spinner-gold');
  const e = g.erasers[0];
  const x0 = e.body.position.x;
  g.flick(0, 0, 1, 0.8, 0);
  run(g);
  check('金：まっすぐ 弾いても カーブする', Math.abs(e.body.position.x - x0) > 8, `よこに ${Math.abs(e.body.position.x - x0).toFixed(0)}`);
}

// 黄：弾いた 直後は 速い
{
  const g = make('spinner-yellow');
  const g2 = make('white-standard');
  // 同じ パワー4 の 消しゴム（チビケシ… の かわりに 同じ 数字で くらべる）
  g.flick(0, 0, 1, 0.8);
  const v = g.erasers[0].body.speed;
  const dash = g.erasers[0].def.trait.dash;
  check(`黄：弾いた 直後は 一瞬 速い（${dash}倍）`, dash > 1 && Math.abs(v / (0.8 * g.erasers[0].maxSpeed) - dash) < 0.02, `${(v / (0.8 * g.erasers[0].maxSpeed)).toFixed(2)}倍`);
  void g2;
}

console.log(`\n${ok} ok / ${ng} ng`);
