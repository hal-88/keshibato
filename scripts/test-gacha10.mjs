// 10連ガチャを 画面なしで ためす
// 使い方: node scripts/test-gacha10.mjs
const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => (store[k] = String(v)),
  removeItem: (k) => delete store[k],
};
// チケットを たくさん 持っている ことに する（読みこむ 前に）
store['keshigomu-collection-v1'] = JSON.stringify({ owned: ['white-standard'], seen: ['white-standard'], tickets: 5000 });
const { collection } = await import('../src/progress/collection.js');
const { GAME } = await import('../src/config/game.js');

let ok = 0;
let ng = 0;
const check = (name, cond, info = '') => {
  if (cond) ok++;
  else ng++;
  console.log(`${cond ? '○' : '×'} ${name} ${info}`);
};

const N = GAME.collection.tenPull;
let allHaveRare = true;
let ticketsOk = true;
let batches = 0;
for (const mode of ['normal', 'asobi']) {
  for (let b = 0; b < 40; b++) {
    const before = collection.tickets();
    const res = collection.pullGacha10(mode);
    if (!res) break;
    batches++;
    if (res.length !== N) ticketsOk = false;
    if (!res.some((r) => (r.def.rarity || 'normal') !== 'normal')) allHaveRare = false;
    const back = res.filter((r) => r.ticketBack).length;
    if (collection.tickets() !== before - N + back) ticketsOk = false;
  }
}
check('10連は 10こ 出て、チケットが 10枚 へる（かけらの もどりは 足す）', ticketsOk && batches === 80, `${batches}回`);
check('10連には かならず レア以上が 1こ 以上', allHaveRare);

// チケットが 足りないと 引けない（へらない）
store['keshigomu-collection-v1'] = JSON.stringify({ ...JSON.parse(store['keshigomu-collection-v1']), tickets: 3 });
const mod2 = await import('../src/progress/collection.js?few');
const before = mod2.collection.tickets();
check('チケット 9枚以下では 引けない', mod2.collection.pullGacha10('normal') === null && mod2.collection.tickets() === before, `チケット${before}枚`);

console.log(`\n${ok} ok / ${ng} ng`);
