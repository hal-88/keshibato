// メンテナンス中（遊べない 時間）：決めた 時間の あいだは、画面を おおって「メンテナンス中」を 出す。
// ・時間は この 端末の 時計（GAME.maintenance.windows）。
// ・対戦の とちゅうで 時間に なったら、その 対戦は 最後まで 遊べる（終わって 画面が かわったら メンテナンス中に）。
// ・時間が おわったら 自動で 消えて、タイトルに もどる。
// ・開発中（npm run dev）だけ、URL に ?time=08:00 を つけると その 時刻の つもりで ためせる。

import { GAME } from '../config/game.js';

const toMin = (s) => {
  const [h, m] = String(s).split(':').map(Number);
  return h * 60 + (m || 0);
};

/** いまの 時刻（分）。開発中は ?time=HH:MM で かえられる */
function nowMin() {
  if (import.meta.env?.DEV) {
    const t = new URLSearchParams(location.search).get('time');
    if (t && /^\d{1,2}:\d{2}$/.test(t)) return toMin(t);
  }
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** きょうの 曜日（0 日曜〜6 土曜）。開発中は ?day=0〜6 で かえられる */
function nowDay() {
  if (import.meta.env?.DEV) {
    const d = new URLSearchParams(location.search).get('day');
    if (d && /^[0-6]$/.test(d)) return Number(d);
  }
  return new Date().getDay();
}

/** いま メンテナンス中なら { from, until }（遊べるように なる 時刻）、ちがえば null */
export function maintenanceNow(min = nowMin(), day = nowDay()) {
  const c = GAME.maintenance;
  if (!c?.enabled) return null;
  if (c.days && !c.days.includes(day)) return null; // 平日だけ（土日は いつでも 遊べる）
  for (const [from, until] of c.windows) {
    if (min >= toMin(from) && min < toMin(until)) return { from, until };
  }
  return null;
}

/**
 * メンテナンスの 見はりを はじめる
 * @param inBattle () => 対戦中か（対戦中は じゃましない）
 * @param onEnd    メンテナンスが おわったとき（タイトルに もどす など）
 * @returns { check() } 画面が かわったときに よぶ
 */
export function setupMaintenance({ inBattle, onEnd }) {
  let ov = null;
  const show = (info) => {
    if (!ov) {
      ov = document.createElement('div');
      ov.className = 'maint';
      document.body.appendChild(ov);
    }
    const key = info.until;
    if (ov.dataset.until === key) return;
    ov.dataset.until = key;
    ov.innerHTML = `
      <div class="maint-box">
        <div class="maint-icon">🔧</div>
        <h2>メンテナンス中</h2>
        <p>いまは 遊べないよ</p>
        <div class="maint-next"><b>${info.until}</b> から 遊べるよ</div>
        <p class="maint-note">消しゴムたちも 休けい中…</p>
      </div>`;
  };
  const hide = () => {
    ov?.remove();
    ov = null;
  };
  const check = () => {
    const info = maintenanceNow();
    if (info && !inBattle()) show(info);
    else if (!info && ov) {
      hide();
      onEnd?.();
    }
  };
  setInterval(check, 15000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
  return { check };
}
