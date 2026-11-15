// ログインボーナス（出席カード）。1日1回、タイトルを 開くと ハンコを 押して ごほうび。
// ・休んでも リセットしない（合計の 日数で すすむ）。7日で カード 1まい。
// ・日付は この 端末の 時計。前の 日付に もどっていたら もらえない（時計を いじっても ふえない）。
// ・保存は この 端末だけ（localStorage。図鑑とは べつ）。ごほうびの 中身は config/game.js の loginDays。

import { GAME } from '../config/game.js';
import { SPINNER_ERASERS, pickByRarity } from '../config/erasers.js';
import { collection } from './collection.js';

const KEY = 'keshigomu-login-v1';

/** きょうの 日付（この 端末の 時計。YYYY-MM-DD） */
export function todayStr(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && typeof d.total === 'number') return d;
  } catch {
    /* はじめから */
  }
  return { total: 0, lastDate: null };
}
let data = load();
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* 保存できなくても 遊べる */
  }
}

const DAYS = () => GAME.collection.loginDays;

export const loginBonus = {
  /** 合計の 日数 */
  total: () => data.total,
  /** きょう まだ ハンコを 押していないか（日付が 前に もどっていたら false） */
  canStamp(today = todayStr()) {
    return !data.lastDate || today > data.lastDate;
  },
  /**
   * いまの カード：{ no（何まいめ）, stamped（この カードで 押した 数 0〜7）, days（ごほうびの ならび） }
   * 7こ 押し おわった ばかりの 日は、その カードを 見せる
   */
  card(today = todayStr()) {
    const n = DAYS().length;
    let done = data.total % n;
    let no = Math.floor(data.total / n) + 1;
    // きょう 7こめを 押した → 完成した カードを 見せる
    if (done === 0 && data.total > 0 && !loginBonus.canStamp(today)) {
      done = n;
      no -= 1;
    }
    return { no, stamped: done, days: DAYS() };
  },
  /**
   * ハンコを 押す（きょう まだなら）。
   * @returns { day（1〜7）, total, reward } または null
   *   reward … { type: 'spinner', def, isNew } / { type: 'ticket', n } / { type: 'shard', n, ticketBack }
   */
  stamp(today = todayStr()) {
    if (!loginBonus.canStamp(today)) return null;
    const days = DAYS();
    const day = (data.total % days.length) + 1;
    const d = days[day - 1];
    let reward;
    if (d.type === 'spinner') {
      // まだ 持っていない 色から（レア度の 重みで）。ぜんぶ あれば チケット1枚
      const left = SPINNER_ERASERS.filter((e) => !collection.owns(e.id));
      if (left.length) {
        const def = pickByRarity(left);
        reward = { type: 'spinner', def, isNew: collection.grantEraser(def.id) };
      } else {
        collection.addTickets(1);
        reward = { type: 'ticket', n: 1, allSpinners: true };
      }
    } else if (d.type === 'ticket') {
      collection.addTickets(d.n);
      reward = { type: 'ticket', n: d.n };
    } else {
      reward = { type: 'shard', n: d.n, ticketBack: collection.addShards(d.n) };
    }
    data.total++;
    data.lastDate = today;
    save();
    return { day, total: data.total, reward };
  },
  /** ためす 用：はじめから */
  reset() {
    data = { total: 0, lastDate: null };
    save();
  },
};
