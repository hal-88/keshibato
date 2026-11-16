// 強さ％の 表示（Game.aimPower）を 画面なしで ためす
// 使い方: node scripts/test-power.mjs
import { Game } from '../src/logic/Game.js';
import { findDesk } from '../src/config/desks.js';
import { findEraser } from '../src/config/erasers.js';
import { findCard } from '../src/config/cards.js';
import Matter from 'matter-js';

let ok = 0;
let ng = 0;
const check = (name, cond, info = '') => {
  if (cond) ok++;
  else ng++;
  console.log(`${cond ? '○' : '×'} ${name} ${info}`);
};
const make = (id, card) => new Game({
  desk: findDesk('giant'),
  players: [id, 'white-standard'].map((x, i) => ({ name: 'P', type: 'human', eraser: findEraser(x), color: '', card: i === 0 && card ? findCard(card) : null })),
  firstTurn: 0,
});
const pct = (g, s, spin = 0) => Math.round(g.aimPower(0, s, spin) * 100);

{
  const g = make('white-standard');
  check('ふつうは 引いた 強さ そのまま（0〜100％）', pct(g, 0) === 0 && pct(g, 0.5) === 50 && pct(g, 1) === 100);
}
{
  const g = make('white-standard', 'fullpower');
  const r = g.useCard(0, {});
  check('フルパワーの カード：全力で 150％（100％で 止まらない）', r.ok && pct(g, 1) === 150 && pct(g, 0.5) === 75, `${pct(g, 1)}%`);
}
{
  const g = make('white-standard');
  g.turn.powerMul = 2; // ため打ち（つぎの 番 2倍）
  check('ため打ち：全力で 200％', pct(g, 1) === 200);
}
{
  const g = make('boccia');
  check('ボッチャ：いつも 同じ 強さ（引いても かわらない）', pct(g, 0.2) === pct(g, 1), `${pct(g, 1)}%`);
}
{
  const g = make('petan');
  Matter.Body.setPosition(g.erasers[0].body, { x: 0, y: 0 });
  check('ペタン：まんなかからだと 130％', pct(g, 1) === 130);
}
{
  const g = make('spinner-silver');
  const spinning = pct(g, 1);
  g.erasers[0].spinLeft = 0;
  g._spinState(g.erasers[0]);
  check('メタルスピナー：止まっていると 70％、横から 引いて 回し直すと 100％', spinning === 100 && pct(g, 1, 0) === 70 && pct(g, 1, 0.8) === 100);
}
{
  // 表示の 強さと、本当に 弾いた 速さが 合っているか（フルパワー）
  const g = make('white-standard', 'fullpower');
  g.useCard(0, {});
  const shown = g.aimPower(0, 0.8);
  const e = g.erasers[0];
  g.flick(0, 1, 0, 0.8, 0);
  check('表示の ％と 本当の 速さが 合う', Math.abs(e.body.speed / e.maxSpeed - shown) < 0.01, `表示${Math.round(shown * 100)}% / 実際${Math.round((e.body.speed / e.maxSpeed) * 100)}%`);
}

console.log(`\n${ok} ok / ${ng} ng`);
