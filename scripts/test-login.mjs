// ログインボーナス（出席カード）を 画面なしで ためす
// 使い方: node scripts/test-login.mjs
const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => (store[k] = String(v)),
  removeItem: (k) => delete store[k],
};
const { loginBonus } = await import('../src/progress/loginBonus.js');
const { collection } = await import('../src/progress/collection.js');
const { SPINNER_ERASERS } = await import('../src/config/erasers.js');

let ok = 0;
let ng = 0;
const check = (name, cond, info = '') => {
  if (cond) ok++;
  else ng++;
  console.log(`${cond ? '○' : '×'} ${name} ${info}`);
};
const day = (n) => {
  const d = new Date(2026, 10, 1);
  d.setDate(d.getDate() + n);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const t0 = collection.tickets();
const r1 = loginBonus.stamp(day(0));
check('1日目は ハンドスピナー（新しい色）', r1?.day === 1 && r1.reward.type === 'spinner' && r1.reward.isNew && collection.owns(r1.reward.def.id), r1?.reward.def?.name);
check('同じ日には 2回 押せない', loginBonus.stamp(day(0)) === null && !loginBonus.canStamp(day(0)));
check('時計を もどしても 押せない', loginBonus.stamp(day(-3)) === null);

// 休んでも リセットしない（5日 あけても 2日目）
const r2 = loginBonus.stamp(day(5));
check('休んでも 続きから（2日目：かけら）', r2?.day === 2 && r2.reward.type === 'shard', `合計${loginBonus.total()}日`);
const r3 = loginBonus.stamp(day(6));
check('3日目：チケット1枚', r3?.day === 3 && r3.reward.type === 'ticket' && collection.tickets() === t0 + 1);
for (let k = 7; k <= 9; k++) loginBonus.stamp(day(k));
const r7 = loginBonus.stamp(day(10));
check('7日目：チケット2枚・カード 完成', r7?.day === 7 && r7.reward.n === 2 && loginBonus.card(day(10)).stamped === 7 && loginBonus.card(day(10)).no === 1);
check('かけら 4こ（5こで チケット）', collection.shards() === 4, `かけら${collection.shards()} チケット${collection.tickets()}`);
check('つぎの日は 2まいめの 1日目', loginBonus.card(day(11)).no === 2 && loginBonus.card(day(11)).stamped === 0);

// 1日目を くりかえすと、まだ 持っていない 色が 出る → ぜんぶ そろうと チケット
const got = new Set([r1.reward.def.id]);
let d = 11;
let dup = false;
while (got.size < SPINNER_ERASERS.length && d < 200) {
  const r = loginBonus.stamp(day(d++));
  if (r.day === 1) {
    if (got.has(r.reward.def?.id)) dup = true;
    got.add(r.reward.def.id);
  }
}
check('1日目は いつも まだ 持っていない 色（8色 そろう）', !dup && got.size === 8, `${loginBonus.card(day(d)).no - 1}まい`);
while (loginBonus.card(day(d)).stamped !== 0 || !loginBonus.canStamp(day(d))) loginBonus.stamp(day(d++));
const after = loginBonus.stamp(day(d));
check('ぜんぶ そろったら 1日目は チケット', after.day === 1 && after.reward.type === 'ticket' && after.reward.allSpinners);

console.log(`\n${ok} ok / ${ng} ng`);
