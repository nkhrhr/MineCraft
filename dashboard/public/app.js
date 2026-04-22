const API = '/api';
let currentIssue = null;
let progressTimer = null;

// --- 起動 ---
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadIdeas();
  loadBuild();
  loadProgress();
});

// --- いまここステップ ---
async function loadProgress() {
  try {
    const res = await fetch(`${API}/progress`);
    const p = await res.json();
    renderProgress(p);

    // 完了していない間は 8 秒ごとにポーリング
    if (progressTimer) clearTimeout(progressTimer);
    if (p.step < 5) {
      progressTimer = setTimeout(loadProgress, 8000);
    }
  } catch (e) {
    console.error('progress error:', e);
  }
}

function renderProgress(p) {
  const steps = document.querySelectorAll('#steps .step');
  const hint = document.getElementById('rail-hint');

  steps.forEach(el => {
    const s = Number(el.dataset.step);
    el.classList.remove('done', 'current', 'loading');
    if (s < p.step) el.classList.add('done');
    if (s === p.step) {
      el.classList.add('current');
      if (p.loading) el.classList.add('loading');
    }
  });

  const hints = {
    1: 'あたらしいアイデアを書こう！',
    2: p.loading ? 'hari が読んでるよ...' : 'hari の返事を読んで「Go！」を押そう',
    3: 'hari が作ってるよ！ あとちょっと',
    4: 'ビルド中... もうすぐ遊べるよ',
    5: '⬇️ 下のみどりボタンで遊ぼう！'
  };
  hint.textContent = hints[p.step] || '';
}

// Build Release が出たら進行中のステップを即反映
async function refreshAfterAction() {
  await loadIdeas();
  await loadStats();
  await loadProgress();
  await loadBuild();
}

// --- 冒険者ステータス ---
async function loadStats() {
  try {
    const res = await fetch(`${API}/stats`);
    const stats = await res.json();
    document.getElementById('level').textContent = stats.level;
    document.getElementById('total-ideas').textContent = stats.total_ideas;
    document.getElementById('total-done').textContent = stats.total_completed;

    // レベルに応じたアイコン
    const icons = ['🗡️', '⚔️', '🛡️', '🏹', '🔮', '👑', '🐉', '⭐', '🌟', '💎'];
    document.getElementById('level-icon').textContent = icons[Math.min(stats.level - 1, icons.length - 1)];
  } catch (e) {
    console.error('stats error:', e);
  }
}

// --- アイデア一覧 ---
async function loadIdeas() {
  try {
    const res = await fetch(`${API}/ideas`);
    const ideas = await res.json();
    const container = document.getElementById('idea-list');

    if (!ideas.length) {
      container.innerHTML = '<p class="empty">まだアイデアがないよ。上に書いてみよう！</p>';
      return;
    }

    container.innerHTML = ideas.map(idea => {
      const statusIcon = {
        'waiting': '⏳',
        'responded': '💬',
        'implementing': '🔨',
        'done': '✅'
      }[idea.status] || '📝';

      const date = new Date(idea.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });

      return `
        <div class="idea-item" onclick="openIdea(${idea.github_issue_number})">
          <span class="idea-status">${statusIcon}</span>
          <div class="idea-info">
            <h3>${escapeHtml(idea.title)}</h3>
            <div class="date">${date}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.error('ideas error:', e);
  }
}

// --- アイデア送信 ---
async function submitIdea() {
  const titleEl = document.getElementById('idea-title');
  const bodyEl = document.getElementById('idea-body');
  const statusEl = document.getElementById('submit-status');
  const btn = document.getElementById('submit-btn');

  const title = titleEl.value.trim();
  const body = bodyEl.value.trim();

  if (!title || !body) {
    statusEl.textContent = 'タイトルと内容を書いてね！';
    statusEl.style.color = '#e94560';
    return;
  }

  btn.disabled = true;
  statusEl.textContent = '送信中...';
  statusEl.style.color = '#888';

  try {
    const res = await fetch(`${API}/ideas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body })
    });

    if (res.ok) {
      statusEl.textContent = '📮 送れたよ！hari が読んでくれるよ';
      statusEl.style.color = '#4ade80';
      titleEl.value = '';
      bodyEl.value = '';
      refreshAfterAction();
    } else {
      const err = await res.json();
      statusEl.textContent = err.error || 'エラーが起きたよ';
      statusEl.style.color = '#e94560';
    }
  } catch (e) {
    statusEl.textContent = 'ネットワークエラー';
    statusEl.style.color = '#e94560';
  }

  btn.disabled = false;
}

// --- アイデア詳細（モーダル） ---
async function openIdea(issueNumber) {
  currentIssue = issueNumber;
  const modal = document.getElementById('modal');
  const chatEl = document.getElementById('modal-chat');

  document.getElementById('modal-title').textContent = '読み込み中...';
  document.getElementById('modal-body').textContent = '';
  chatEl.innerHTML = '';
  document.getElementById('modal-reply').style.display = 'none';
  modal.style.display = 'flex';

  try {
    const res = await fetch(`${API}/ideas/${issueNumber}`);
    const data = await res.json();

    document.getElementById('modal-title').textContent = data.idea?.title || 'アイデア';
    document.getElementById('modal-body').textContent = data.idea?.body || '';

    // チャット表示
    const messages = [];

    // hari の返事
    for (const h of (data.hari || [])) {
      messages.push({ type: 'hari', body: h.body, time: h.created_at });
    }

    // 晄希の返事
    for (const k of (data.koki || [])) {
      messages.push({ type: 'koki', body: k.body, time: k.created_at });
    }

    // 時系列ソート
    messages.sort((a, b) => new Date(a.time) - new Date(b.time));

    if (messages.length === 0) {
      chatEl.innerHTML = '<p class="empty">⏳ hari が読んでるよ、ちょっと待ってね...</p>';
    } else {
      chatEl.innerHTML = messages.map(m =>
        `<div class="chat-bubble chat-${m.type}">${escapeHtml(m.body)}</div>`
      ).join('');
    }

    // 返信フォーム表示（hari が返事済みなら）
    if (data.hari && data.hari.length > 0) {
      document.getElementById('modal-reply').style.display = 'block';
      document.getElementById('reply-text').value = '';
    }

  } catch (e) {
    document.getElementById('modal-title').textContent = 'エラー';
    chatEl.innerHTML = '<p class="empty">読み込みに失敗したよ</p>';
  }
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  currentIssue = null;
}

// モーダル外クリックで閉じる
document.getElementById('modal')?.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) closeModal();
});

// --- 返信送信 ---
async function sendReply(preset) {
  const message = preset || document.getElementById('reply-text').value.trim();
  if (!message || !currentIssue) return;

  try {
    const res = await fetch(`${API}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue_number: currentIssue, message })
    });

    if (res.ok) {
      // チャットに追加
      const chatEl = document.getElementById('modal-chat');
      chatEl.innerHTML += `<div class="chat-bubble chat-koki">${escapeHtml(message)}</div>`;
      document.getElementById('reply-text').value = '';

      if (/^(go|Go|GO|いいよ|OK|ok|おねがい|やって)/i.test(message)) {
        chatEl.innerHTML += '<p class="empty">🔨 hari が作り始めるよ！できたら教えるね</p>';
        document.getElementById('modal-reply').style.display = 'none';
      }

      refreshAfterAction();
    }
  } catch (e) {
    console.error('reply error:', e);
  }
}

// --- 最新ビルド ---
async function loadBuild() {
  try {
    const res = await fetch(`${API}/latest-build`);
    const build = await res.json();
    const container = document.getElementById('build-info');

    if (!build.available) {
      container.innerHTML = '<p class="empty">まだビルドがないよ</p>';
      return;
    }

    const date = new Date(build.date).toLocaleDateString('ja-JP');
    let html = '';

    if (build.mcworld_url) {
      html += `<a href="${build.mcworld_url}" download class="build-btn play">
        🎮 iPad で遊ぶ
        <span class="sub">タップすると Minecraft がひらくよ</span>
      </a>`;
    }
    if (build.mcaddon_url) {
      html += `<a href="${build.mcaddon_url}" download class="build-btn mcaddon">🧩 アドオンだけ DL</a>`;
    }

    html += `<p class="build-version">${build.version} ・ ${date}</p>`;
    container.innerHTML = html;
  } catch (e) {
    console.error('build error:', e);
  }
}

// --- ユーティリティ ---
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
