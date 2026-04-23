// Hari が World を生成中に出すランダム Giphy 画像。
// 晄希に「単なるスピナー」ではなく「何か起きてる感」を見せるための演出。
// 追加・削除する時はこの配列を編集するだけ。
window.HARI_BUILDING_GIFS = [
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGs5ZzRxdTU1dXVsZ2Ria2o0dzdjcGtpYmppZ2x6Z2R5bnJ4NXR6YiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ymSvq7hQfV09un9QVj/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGs5ZzRxdTU1dXVsZ2Ria2o0dzdjcGtpYmppZ2x6Z2R5bnJ4NXR6YiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/cuHjncTuHW40g/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGs5ZzRxdTU1dXVsZ2Ria2o0dzdjcGtpYmppZ2x6Z2R5bnJ4NXR6YiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/HaGmrsqLkhc4mzPgg5/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGs5ZzRxdTU1dXVsZ2Ria2o0dzdjcGtpYmppZ2x6Z2R5bnJ4NXR6YiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/hfrOgqHzJPoDHGoPnk/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MGVxN3p4Z2U2ZGM3ejlycGxmb205OHVpdW1wNmE3c281cmlsMmdmNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/jrBV2WKIm1YSAtuAe8/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bGlzbG14ZmIwM2QyNm83MDBnN2YyOXgwaTNmNDJndTlybGpzdGR5ZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/JVOm2XYgyiuo5epkDK/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bGlzbG14ZmIwM2QyNm83MDBnN2YyOXgwaTNmNDJndTlybGpzdGR5ZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/NNa07Mf7TvUS8aMRFA/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3em9seXh0cnB6bHhmY2N5azBsd3c5b2QxZ3IwMjJlbmF2bHR3bGliZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/LRfBh4GLVlM8BRElRm/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bWd3ODZkaDVxYWxncTc5bXB0ZDR4emN4YTBxaTkwb29nZGh5cTBlcCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/DqTzKzl7V7OlqXuWc9/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGs5ZzRxdTU1dXVsZ2Ria2o0dzdjcGtpYmppZ2x6Z2R5bnJ4NXR6YiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/OUUnxL2NbwNuX16EfK/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3eTlmMm5qdmF0YmpnMXR3dDJieWdsMmtkaDgweTdrNzNvMW5zMHR5NiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/DZ4RKZEUanJdxLa9rG/giphy.gif',
];

// <figure data-hari-building-gif> にランダム GIF を流し込む（空の時だけ）
window.renderHariBuildingGif = function renderHariBuildingGif(targetEl) {
  if (!targetEl) return;
  if (targetEl.dataset.hariBuildingGifInitialized === '1') return;
  const gifs = window.HARI_BUILDING_GIFS || [];
  if (gifs.length === 0) return;
  const url = gifs[Math.floor(Math.random() * gifs.length)];
  targetEl.innerHTML =
    '<img class="idea-flow-giphy-img" ' +
    'src="' + url + '" ' +
    'alt="Hari が建設中" ' +
    'referrerpolicy="no-referrer">';
  targetEl.dataset.hariBuildingGifInitialized = '1';
};

// 既存 / これから動的挿入される全ての data-hari-building-gif を拾う
function scanHariBuildingGifs(root) {
  const scope = root || document;
  scope.querySelectorAll('[data-hari-building-gif]').forEach((el) => {
    window.renderHariBuildingGif(el);
  });
}
window.scanHariBuildingGifs = scanHariBuildingGifs;

document.addEventListener('DOMContentLoaded', () => {
  scanHariBuildingGifs();
  // app.js が idea details を描画した後にも確実に拾うため MutationObserver を仕掛ける
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue; // Element のみ
        if (node.matches && node.matches('[data-hari-building-gif]')) {
          window.renderHariBuildingGif(node);
        }
        if (node.querySelectorAll) {
          node.querySelectorAll('[data-hari-building-gif]').forEach((el) => {
            window.renderHariBuildingGif(el);
          });
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
});
