// 文字の 小さな 道具（いくつかの 画面で 使う）

/** HTML の タグを とって 文字だけに する（<br> は 空白に。シェア画像の 見出しなどに 使う） */
export const plain = (h) =>
  String(h)
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
