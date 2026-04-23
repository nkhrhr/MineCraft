const API = '/api';
let resumeRefreshTimer = null;
let latestBuild = null;

// --- 起動 ---
document.addEventListener('DOMContentLoaded', () => {
  loadIdeas();
});

// iPad の PWA/復帰では古い DOM がそのまま見えることがあるので、
// 前面復帰時に最新状態を取り直す。
window.addEventListener('focus', scheduleResumeRefresh);
window.addEventListener('pageshow', (e) => {
  if (e.persisted) scheduleResumeRefresh();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) scheduleResumeRefresh();
});

function scheduleResumeRefresh() {
  if (resumeRefreshTimer) clearTimeout(resumeRefreshTimer);
  resumeRefreshTimer = setTimeout(() => {
    refreshAfterAction().catch((e) => console.error('resume refresh error:', e));
  }, 150);
}

// Build Release が出たら進行中のステップを即反映
async function refreshAfterAction() {
  await loadIdeas();
}

// --- アイデア一覧（アコーディオン） ---
async function loadIdeas() {
  try {
    const [ideasRes, buildRes] = await Promise.all([
      fetch(`${API}/ideas`, { cache: 'no-store' }),
      fetch(`${API}/latest-build`, { cache: 'no-store' }),
    ]);
    const ideas = await ideasRes.json();
    latestBuild = await buildRes.json();

    const container = document.getElementById('idea-list');
    if (!ideas.length) {
      container.innerHTML = '<p class="empty">No ideas yet. Write one above!</p>';
      return;
    }

    // 現在開いているアイデアは再レンダー後も維持する
    const openIssue = container.querySelector('.idea-item.open')?.dataset?.issue;

    container.innerHTML = ideas.map(idea => renderIdeaItem(idea, latestBuild)).join('');

    if (openIssue) {
      const stillThere = container.querySelector(`.idea-item[data-issue="${openIssue}"]`);
      if (stillThere) {
        stillThere.classList.add('open');
        stillThere.querySelector('.idea-details')?.setAttribute('aria-hidden', 'false');
        renderIdeaDetails(Number(openIssue));
      }
    }
  } catch (e) {
    console.error('ideas error:', e);
  }
}

function renderIdeaItem(idea, build) {
  const phase = computeIdeaPhase(idea, build);
  const statusLabel = {
    waiting: 'Waiting',
    responded: 'Responded',
    implementing: 'Building',
    done: 'Done'
  }[idea.status] || 'Draft';

  const updatedAt = new Date(idea.updated_at || idea.created_at);
  const lastUpdated = isNaN(updatedAt.valueOf())
    ? 'Updated'
    : `${formatDateTimeWithTime(updatedAt)} (${formatRelativeFromNow(updatedAt)})`;

  const progressHtml = renderIdeaProgress(phase.steps);
  const ctaHtml = renderIdeaCta(idea.github_issue_number, phase, build);

  // 完成済み（playable）は summary 全体のトグル tap を外し、
  // 「View Design Process」と「Play this Idea」を同サイズで横並び
  const isPlayable = phase.cta?.type === 'play';
  const summaryClass = isPlayable ? 'idea-summary idea-summary--readonly' : 'idea-summary';
  const summaryOnclick = isPlayable ? '' : `onclick="toggleIdea(${idea.github_issue_number})"`;
  const rightHtml = isPlayable
    ? ''  // 完成済みは右端に何も置かない（Play / Chat は下の行に配置）
    : `<span class="idea-chevron" aria-hidden="true">▸</span>`;

  // 完成済みは「View Design Process」と「Play this Idea」を 2 列で表示
  const actionsHtml = isPlayable
    ? `<div class="idea-actions">
         <button class="idea-cta idea-cta--chat" type="button" onclick="event.stopPropagation(); toggleIdea(${idea.github_issue_number})">View Design Process</button>
         <a class="idea-cta idea-cta--play" href="${escapeHtml(phase.cta.url)}" download onclick="event.stopPropagation()">${phase.cta.label}</a>
       </div>`
    : ctaHtml;

  return `
    <div class="idea-item${isPlayable ? ' idea-item--playable' : ''}" data-issue="${idea.github_issue_number}" data-phase="${phase.current}">
      <div class="${summaryClass}" ${summaryOnclick}>
        <div class="idea-summary-main">
          <span class="idea-status">${escapeHtml(statusLabel)}</span>
          <div class="idea-info">
            <h3>${escapeHtml(idea.title)}</h3>
            <div class="date">Updated ${lastUpdated}</div>
          </div>
          ${rightHtml}
        </div>
        ${actionsHtml}
      </div>
      <div class="idea-details" aria-hidden="true">${progressHtml}</div>
    </div>
  `;
}

// Returns phase state for progress bar + CTA.
// steps: ['done' | 'current' | 'pending'] for [design, discussion, build, play]
// current: which phase is currently active ('discussion' | 'build' | 'play' | 'complete')
// cta: { type: 'build' | 'play' | null, label, url? }
// statusPill: { label } or null
function computeIdeaPhase(idea, build) {
  const steps = { design: 'done', discussion: 'pending', build: 'pending' };
  let current = 'discussion';
  let cta = null;
  let statusPill = null;

  const buildIsNewer = build?.available && build?.date
    && new Date(build.date) > new Date(idea.updated_at || idea.created_at);

  if (idea.status === 'waiting') {
    steps.discussion = 'current';
    current = 'discussion';
    statusPill = { label: 'Hari is reading your idea...' };
  } else if (idea.status === 'responded') {
    steps.discussion = 'current';
    current = 'discussion';
    cta = { type: 'build', label: 'Build' };
  } else if (idea.status === 'implementing') {
    steps.discussion = 'done';
    if (buildIsNewer && build?.mcworld_url) {
      steps.build = 'done';
      current = 'complete';
      cta = { type: 'play', label: 'Play this Idea', url: build.mcworld_url };
    } else {
      steps.build = 'current';
      current = 'build';
      statusPill = { label: 'Hari is building...' };
    }
  } else if (idea.status === 'done') {
    steps.discussion = 'done';
    steps.build = 'done';
    current = 'complete';
    if (build?.mcworld_url) {
      cta = { type: 'play', label: 'Play this Idea', url: build.mcworld_url };
    }
  }

  return { steps, current, cta, statusPill };
}

function renderIdeaProgress(steps) {
  const entries = [
    ['design', 'Idea'],
    ['discussion', 'Discussion with Hari'],
    ['build', 'Build with Hari'],
  ];
  return `
    <div class="idea-progress" aria-label="Phase progress">
      ${entries.map(([key, label]) => {
        const state = steps[key];
        return `<span class="idea-progress-step idea-progress-step--${state}">
          <span class="idea-progress-icon"></span>
          <span class="idea-progress-label">${label}</span>
        </span>`;
      }).join('')}
    </div>
  `;
}

function renderIdeaCta(issueNumber, phase, build) {
  if (phase.cta?.type === 'play') {
    return `<a class="idea-cta idea-cta--play" href="${escapeHtml(phase.cta.url)}" download onclick="event.stopPropagation()">${phase.cta.label}</a>`;
  }
  if (phase.cta?.type === 'build') {
    return `<button class="idea-cta idea-cta--build" onclick="event.stopPropagation(); approveIdea(${issueNumber})">${phase.cta.label}</button>`;
  }
  if (phase.statusPill) {
    return `<div class="idea-cta idea-cta--status">${escapeHtml(phase.statusPill.label)}</div>`;
  }
  return '';
}

// iMessage 風のチャット行（アバター写真 + バブル）
function renderChatRow(m) {
  const photo = m.type === 'hari' ? '/photo-hari.png' : '/photo-koki.png';
  const alt = m.type === 'hari' ? 'Hari' : 'Koki';
  return `
    <div class="chat-row chat-row--${m.type}">
      <img class="chat-avatar chat-avatar--${m.type}" src="${photo}" alt="${alt}" loading="lazy">
      <div class="chat-bubble chat-${m.type}">${escapeHtml(m.body)}</div>
    </div>
  `;
}

// "Go!" 相当 — Discussion → Build に進める
async function approveIdea(issueNumber) {
  try {
    const res = await fetch(`${API}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue_number: issueNumber, message: 'Go!' }),
    });
    if (res.ok) {
      refreshAfterAction();
    }
  } catch (e) {
    console.error('approve error:', e);
  }
}

async function toggleIdea(issueNumber) {
  const item = document.querySelector(`.idea-item[data-issue="${issueNumber}"]`);
  if (!item) return;

  const isOpen = item.classList.contains('open');
  if (isOpen) {
    item.classList.remove('open');
    item.querySelector('.idea-details')?.setAttribute('aria-hidden', 'true');
    return;
  }

  // 一度に一つだけ開く（New Idea カードは常時展開なので除外）
  document.querySelectorAll('.idea-item.open').forEach(el => {
    if (el.id === 'new-idea-card') return;
    el.classList.remove('open');
    el.querySelector('.idea-details')?.setAttribute('aria-hidden', 'true');
  });

  item.classList.add('open');
  const details = item.querySelector('.idea-details');
  details.setAttribute('aria-hidden', 'false');

  await renderIdeaDetails(issueNumber);
}

async function renderIdeaDetails(issueNumber) {
  const item = document.querySelector(`.idea-item[data-issue="${issueNumber}"]`);
  if (!item) return;
  const details = item.querySelector('.idea-details');
  if (!details) return;

  try {
    const res = await fetch(`${API}/ideas/${issueNumber}`, { cache: 'no-store' });
    const data = await res.json();

    // 最新ステータスに基づいた進捗を再計算してトグル内の先頭に表示
    const phase = computeIdeaPhase(data.idea || {}, latestBuild);
    const progressHtml = renderIdeaProgress(phase.steps);

    const messages = [];
    for (const h of (data.hari || [])) messages.push({ type: 'hari', body: h.body, time: h.created_at });
    for (const k of (data.koki || [])) messages.push({ type: 'koki', body: k.body, time: k.created_at });
    messages.sort((a, b) => new Date(a.time) - new Date(b.time));

    // Idea グループ: タイトルと本文をプレーン表示
    const designGroup = `
      <section class="idea-group">
        <h4 class="idea-group-title">Idea</h4>
        <div class="idea-title-display">${escapeHtml(data.idea?.title || '')}</div>
        <div class="idea-body">${escapeHtml(data.idea?.body || '')}</div>
      </section>
    `;

    // Discussion with Hari グループ: Chat + Reply
    const chatContent = messages.length === 0
      ? '<p class="empty">Hari is reading it. Please wait...</p>'
      : `<div class="idea-chat">${messages.map(m => renderChatRow(m)).join('')}</div>`;

    // Build（承認）は summary の primary CTA にあるので、ここは修正返信だけ。
    // 完成したアイデアには返信フォームを出さない。
    const canReply = data.hari && data.hari.length > 0
      && data.idea?.status !== 'implementing' && data.idea?.status !== 'done';
    const replyContent = canReply
      ? `
        <div class="idea-reply">
          <p class="field-kicker">Reply</p>
          <textarea id="reply-text-${issueNumber}" rows="3" placeholder="hari に変えたい所を伝える..."></textarea>
          <div class="reply-buttons">
            <button class="btn-discussion" onclick="sendReply(${issueNumber})">Discussion</button>
          </div>
        </div>
      `
      : '';

    const discussionGroup = `
      <section class="idea-group">
        <h4 class="idea-group-title">Discussion with Hari</h4>
        ${chatContent}
        ${replyContent}
      </section>
    `;

    details.innerHTML = progressHtml + designGroup + discussionGroup;
  } catch (e) {
    // エラー時も進捗は残す
    const existingProgress = details.querySelector('.idea-progress')?.outerHTML || '';
    details.innerHTML = existingProgress + '<p class="empty">Could not load this idea.</p>';
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
    statusEl.textContent = 'Please write a title and details.';
    statusEl.style.color = '#000000';
    return;
  }

  btn.disabled = true;
  statusEl.textContent = 'Sending...';
  statusEl.style.color = '#000000';

  try {
    const res = await fetch(`${API}/ideas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body })
    });

    if (res.ok) {
      statusEl.textContent = 'Sent! Hari will read it soon.';
      statusEl.style.color = '#000000';
      titleEl.value = '';
      bodyEl.value = '';
      refreshAfterAction();
    } else {
      const err = await res.json();
      statusEl.textContent = mapSubmitError(err.error);
      statusEl.style.color = '#000000';
    }
  } catch (e) {
    statusEl.textContent = 'Network error.';
    statusEl.style.color = '#000000';
  }

  btn.disabled = false;
}

// --- 返信送信 ---
async function sendReply(issueNumber, preset) {
  const textarea = document.getElementById(`reply-text-${issueNumber}`);
  const message = preset || (textarea && textarea.value.trim());
  if (!message) return;

  try {
    const res = await fetch(`${API}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue_number: issueNumber, message })
    });

    if (res.ok) {
      const item = document.querySelector(`.idea-item[data-issue="${issueNumber}"]`);
      const chatEl = item?.querySelector('.idea-chat');
      const details = item?.querySelector('.idea-details');

      // 楽観的に自分の返信を追加
      const rowHtml = renderChatRow({ type: 'koki', body: message });
      if (chatEl) {
        chatEl.insertAdjacentHTML('beforeend', rowHtml);
      } else if (details) {
        details.insertAdjacentHTML('beforeend',
          `<div class="idea-chat">${rowHtml}</div>`);
      }
      if (textarea) textarea.value = '';

      if (/^(go|Go|GO|いいよ|OK|ok|おねがい|やって)/i.test(message)) {
        const replyEl = item?.querySelector('.idea-reply');
        if (replyEl) replyEl.style.display = 'none';
        const chat2 = item?.querySelector('.idea-chat');
        if (chat2) {
          chat2.insertAdjacentHTML('beforeend',
            '<p class="empty">Hari is starting now. I will let you know when it is ready.</p>');
        }
      }

    }
  } catch (e) {
    console.error('reply error:', e);
  }
}

function mapSubmitError(errorMessage) {
  if (errorMessage === 'タイトルと内容を書いてね') {
    return 'Please write a title and details.';
  }
  if (errorMessage === 'Issue 作成に失敗しました') {
    return 'Could not create the idea.';
  }
  return errorMessage || 'Something went wrong.';
}

// --- ユーティリティ ---
function formatDateTimeWithTime(date) {
  const monthDay = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return `${monthDay} ${time}`;
}

function formatRelativeFromNow(date) {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const deltaSeconds = Math.floor((new Date(date).getTime() - Date.now()) / 1000);
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ];

  if (Math.abs(deltaSeconds) < 60) return 'just now';

  for (const [unit, seconds] of units) {
    if (Math.abs(deltaSeconds) >= seconds) {
      const value = Math.trunc(deltaSeconds / seconds);
      return rtf.format(value, unit);
    }
  }

  return 'just now';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
