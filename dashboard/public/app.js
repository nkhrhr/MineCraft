const API = '/api';
let resumeRefreshTimer = null;
let latestBuild = null;
let liveToastTimer = null;

// フォント読み込み完了までロゴを非表示にしてから表示する。
function revealBrandAfterFonts() {
  const markReady = () => {
    document.documentElement.classList.remove('font-loading');
    document.documentElement.classList.add('font-ready');
  };

  if (!document.fonts || !document.fonts.ready) {
    markReady();
    return;
  }

  const fallbackTimer = setTimeout(markReady, 1800);
  document.fonts.ready
    .then(() => {
      clearTimeout(fallbackTimer);
      markReady();
    })
    .catch(() => {
      clearTimeout(fallbackTimer);
      markReady();
    });
}

revealBrandAfterFonts();

// --- 起動 ---
document.addEventListener('DOMContentLoaded', () => {
  loadIdeas();
  initTipsModal();
  initLiveToast();
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

function initTipsModal() {
  const openBtn = document.getElementById('open-tips-btn');
  const closeBtn = document.getElementById('close-tips-btn');
  const overlay = document.getElementById('tips-modal-overlay');

  if (!openBtn || !closeBtn || !overlay) {
    return;
  }

  const closeTipsModal = () => {
    overlay.hidden = true;
    document.body.classList.remove('tips-modal-open');
  };

  const openTipsModal = () => {
    overlay.hidden = false;
    document.body.classList.add('tips-modal-open');
  };

  openBtn.addEventListener('click', openTipsModal);
  closeBtn.addEventListener('click', closeTipsModal);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeTipsModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeTipsModal();
    }
  });
}

function initLiveToast() {
  const closeBtn = document.getElementById('liveToastClose');
  if (!closeBtn) return;
  closeBtn.addEventListener('click', hideLiveToast);
}

function showLiveToast({ title, message }) {
  const toast = document.getElementById('liveToast');
  const titleEl = document.getElementById('liveToastTitle');
  const bodyEl = document.getElementById('liveToastBody');
  const timeEl = document.getElementById('liveToastTime');
  if (!toast || !titleEl || !bodyEl || !timeEl) return;

  titleEl.textContent = title || 'Update';
  bodyEl.textContent = message || '';
  timeEl.textContent = 'now';
  toast.hidden = false;
  toast.classList.add('is-visible');

  if (liveToastTimer) clearTimeout(liveToastTimer);
  liveToastTimer = setTimeout(() => {
    hideLiveToast();
  }, 5000);
}

function hideLiveToast() {
  const toast = document.getElementById('liveToast');
  if (!toast) return;
  toast.classList.remove('is-visible');
  toast.hidden = true;
}

function renderHariStatusLine(message, { loader = true } = {}) {
  const spinner = loader
    ? `<span class="idea-flow-loader idea-hari-status-loader" aria-hidden="true"></span>`
    : '';
  return `
    <span class="idea-hari-status">
      <img class="idea-hari-status-avatar" src="/photo-hari.png" alt="Hari">
      ${spinner}
      <span>${escapeHtml(message)}</span>
    </span>
  `;
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

    if (!ideasRes.ok || !buildRes.ok) {
      throw new Error('Failed to load dashboard data');
    }

    const ideas = await ideasRes.json();
    latestBuild = await buildRes.json();
    const container = document.getElementById('idea-list');
    if (!container) return;

    if (!Array.isArray(ideas) || !ideas.length) {
      container.innerHTML = '<p class="empty">No ideas yet. Write one above!</p>';
      return;
    }

    const latestBuildIssue = latestBuild?.issue_number;
    const buildIssueNumber = Number.isFinite(Number(latestBuildIssue))
      ? Number(latestBuildIssue)
      : null;

    // 現在開いているアイデアは再レンダー後も維持する
    const openIssue = container.querySelector('.idea-item.open')?.dataset?.issue;

    container.innerHTML = ideas.map(idea => renderIdeaItem(idea, latestBuild, buildIssueNumber)).join('');

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
    const container = document.getElementById('idea-list');
    if (container) {
      container.innerHTML = '<p class="empty">Could not load ideas. Please refresh.</p>';
    }
  }
}

function renderIdeaItem(idea, build, buildIssueNumber = null) {
  const phase = computeIdeaPhase(idea, build, buildIssueNumber);
  const statusLabel = {
    waiting: 'Waiting',
    responded: 'Responded',
    implementing: phase.current === 'complete' ? '' : 'Building',
    done: ''
  }[idea.status] || '';

  const updatedAt = new Date(idea.updated_at || idea.created_at);
  const lastUpdated = formatUpdatedAt(updatedAt);
  const dateText = escapeHtml(lastUpdated);

  const progressHtml = renderIdeaProgress(phase.steps);
  const ctaHtml = renderIdeaCta(idea.github_issue_number, phase, build);

  const isPlayable = phase.cta?.type === 'play';
  const dateHtml = isPlayable
    ? `<p class="idea-meta-date idea-meta-date--playable">${dateText}</p>`
    : `<p class="idea-meta-date">${dateText}</p>`;
  const summaryClass = isPlayable
    ? 'idea-summary idea-summary--playable'
    : 'idea-summary';
  const summaryOnclick = `onclick="toggleIdea(${idea.github_issue_number})"`;

  // 完成済みはタイトル行に「Play this Idea」を配置し、下部は「Design process」だけにする
  const playActionHtml = isPlayable
    ? `
      <a class="idea-cta idea-cta--play idea-cta--inline-play" href="${escapeHtml(phase.cta.url)}" download onclick="event.stopPropagation()">
        <img class="idea-inline-play-icon" src="/play-this-icon.svg" alt="" aria-hidden="true">
        ${escapeHtml(phase.cta.label)}
      </a>`
    : '';

  // 完成済みは「Design process」と日付を縦並びでトグル化し、行崩れを防ぐ
  const actionsHtml = isPlayable
    ? `<div class="idea-actions idea-actions--playable">
         ${playActionHtml}
         <button class="idea-cta idea-cta--link idea-cta--toggle" type="button" onclick="event.stopPropagation(); toggleIdea(${idea.github_issue_number});" aria-expanded="false" data-issue="${idea.github_issue_number}" aria-label="View Design Process">Design process</button>
         ${dateHtml}
       </div>`
    : ctaHtml;

  const statusHtml = statusLabel
    ? `<span class="idea-status">${escapeHtml(statusLabel)}</span>`
    : '';

  return `
    <div class="idea-item${isPlayable ? ' idea-item--playable' : ''}" data-issue="${idea.github_issue_number}" data-phase="${phase.current}">
      <div class="${summaryClass}" ${summaryOnclick}>
        <div class="idea-summary-main">
          ${statusHtml}
          <div class="idea-info">
            <h3>${renderIdeaTitleWithKokiAvatar(idea.title || '')}</h3>
            ${isPlayable ? '' : dateHtml}
          </div>
        </div>
        ${actionsHtml}
      </div>
      <div class="idea-details" aria-hidden="true">${progressHtml}</div>
    </div>
  `;
}

function renderIdeaTitleWithKokiAvatar(title) {
  return `
    <span class="idea-title-with-avatar">
      <img class="idea-title-avatar" src="/photo-koki.png" alt="Koki" loading="lazy">
      <span class="idea-title-text">
        <span class="idea-title-prefix">Koki's Idea</span><span class="idea-title-quotes">「${escapeHtml(title || '')}」</span>
      </span>
    </span>
  `;
}

// Returns phase state for progress bar + CTA.
// steps: ['done' | 'current' | 'pending'] for [design, discussion, build, play]
// current: which phase is currently active ('discussion' | 'build' | 'play' | 'complete')
// cta: { type: 'build' | 'play' | null, label, url? }
// statusPill: { label } or null
function computeIdeaPhase(idea, build, buildIssueNumber = null) {
  const steps = { design: 'done', discussion: 'pending', build: 'pending' };
  let current = 'discussion';
  let cta = null;
  let statusPill = null;

  const issueNumber = Number(idea.github_issue_number);
  const buildTargetIssueNumber = Number.isFinite(Number(buildIssueNumber))
    ? Number(buildIssueNumber)
    : (build?.issue_number != null ? Number(build.issue_number) : null);
  const isCurrentBuildTarget = Number.isFinite(buildTargetIssueNumber) && Number.isFinite(issueNumber)
    ? buildTargetIssueNumber === issueNumber
    : false;

  const buildIsNewer = build?.available && build?.date && build?.mcworld_url && isCurrentBuildTarget
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
      ['design', 'Design by Koki'],
      ['discussion', 'Discussion with Hari'],
      ['build', 'Build by Hari'],
    ];
  return `
    <div class="idea-progress" aria-label="Phase progress">
      ${entries.map(([key, label]) => {
        const state = steps[key];
        return `<span class="idea-progress-step idea-progress-step--${state} idea-progress-step--${key}">
          <span class="idea-progress-icon"></span>
          <span class="idea-progress-label ${key === 'discussion' ? 'idea-progress-label--discussion' : ''}">${label}</span>
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
    return `<button class="idea-cta idea-cta--build" onclick="event.stopPropagation(); approveIdea(${issueNumber}, this)">${phase.cta.label}</button>`;
  }
  if (phase.statusPill) {
    return `<div class="idea-cta idea-cta--status">${renderHariStatusLine(phase.statusPill.label)}</div>`;
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
async function approveIdea(issueNumber, btn) {
  if (btn) {
    if (btn.disabled) return; // 二重送信防止
    btn.disabled = true;
    btn.dataset.prevLabel = btn.textContent;
    btn.textContent = '送信中…';
  }
  let succeeded = false;
  try {
    const res = await fetch(`${API}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue_number: issueNumber, message: 'Go!' }),
    });
    if (!res.ok) {
      showLiveToast({
        title: '送信に失敗しました',
        message: '少し待ってからもう一度 Build を押してね'
      });
      return;
    }
    succeeded = true;
    showLiveToast({
      title: 'Build request sent',
      message: 'Hari is building your idea now.'
    });
    refreshAfterAction();
  } catch (e) {
    console.error('approve error:', e);
    showLiveToast({
      title: 'ネットに繋がらないみたい',
      message: 'iPad の Wi-Fi をチェックしてみて'
    });
  } finally {
    if (btn && !succeeded) {
      // 成功時は refreshAfterAction で再描画されるので戻さなくて良い
      btn.textContent = btn.dataset.prevLabel || btn.textContent;
      setTimeout(() => { btn.disabled = false; }, 1500);
    }
  }
}

async function toggleIdea(issueNumber) {
  const item = document.querySelector(`.idea-item[data-issue="${issueNumber}"]`);
  if (!item) return;

  const isOpen = item.classList.contains('open');
  if (isOpen) {
    item.classList.remove('open');
    item.querySelector('.idea-details')?.setAttribute('aria-hidden', 'true');
    item.querySelector('.idea-cta--toggle')?.setAttribute('aria-expanded', 'false');
    return;
  }

  // 一度に一つだけ開く（New Idea カードは常時展開なので除外）
  document.querySelectorAll('.idea-item.open').forEach(el => {
    if (el.id === 'new-idea-card') return;
    el.classList.remove('open');
    el.querySelector('.idea-details')?.setAttribute('aria-hidden', 'true');
  });

  item.classList.add('open');
  item.querySelector('.idea-cta--toggle')?.setAttribute('aria-expanded', 'true');
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
    if (!res.ok) {
      throw new Error('Failed to load idea details');
    }

    const data = await res.json();
    if (!data?.idea) {
      throw new Error('Invalid idea data');
    }

    // 最新ステータスに基づいた進捗を再計算してトグル内の先頭に表示
    const detailBuildIssueNumber = latestBuild?.issue_number != null
      ? Number(latestBuild.issue_number)
      : null;
    const phase = computeIdeaPhase(data.idea || {}, latestBuild, detailBuildIssueNumber);
    const progressHtml = renderIdeaProgress(phase.steps);

    const messages = [];
    for (const h of (data.hari || [])) messages.push({ type: 'hari', body: h.body, time: h.created_at });
    for (const k of (data.koki || [])) messages.push({ type: 'koki', body: k.body, time: k.created_at });
    messages.sort((a, b) => new Date(a.time) - new Date(b.time));

    // Idea グループ: タイトルと本文をプレーン表示
    const designGroup = `
      <section class="idea-group">
        <h4 class="idea-group-title">Idea</h4>
        <div class="idea-title-display">${renderIdeaTitleWithKokiAvatar(data.idea?.title || '')}</div>
        <div class="idea-body">${escapeHtml(data.idea?.body || '')}</div>
      </section>
    `;

    // Discussion with Hari グループ: Chat + Reply
    const chatContent = messages.length === 0
      ? `<p class="empty idea-empty-status">
          ${renderHariStatusLine('Hari is reading it. Please wait...')}
        </p>`
      : `<div class="idea-chat">${messages.map(m => renderChatRow(m)).join('')}</div>`;

    // Build（承認）は summary の primary CTA にあるので、ここは修正返信だけ。
    // 完成したアイデアには返信フォームを出さない。
    const canReply = data.hari && data.hari.length > 0
      && data.idea?.status !== 'implementing' && data.idea?.status !== 'done';
    const replyContent = canReply
      ? `
        <div class="idea-reply">
          <p class="field-kicker">Reply</p>
          <textarea id="reply-text-${issueNumber}" rows="3" placeholder="変更したい内容を教えてください。 / Please tell me what to change."></textarea>
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

  try {
    btn.disabled = true;
    statusEl.textContent = 'Sending...';
    statusEl.style.color = '#000000';

    const res = await fetch(`${API}/ideas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body })
    });

    if (res.ok) {
      statusEl.textContent = 'Sent! Hari will read it soon.';
      showLiveToast({
        title: 'Idea sent',
        message: 'Hari is reading your idea now.'
      });
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
  } finally {
    btn.disabled = false;
  }
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
            `<p class="empty idea-empty-status">
              ${renderHariStatusLine('Hari is starting now. I will let you know when it is ready.', true)}
            </p>`);
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
    day: 'numeric',
    year: 'numeric'
  });
  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return `${monthDay} ${time}`;
}

function formatUpdatedAt(date) {
  if (!date || Number.isNaN(new Date(date).valueOf())) {
    return 'Updated';
  }
  return `Updated ${toTitleCase(formatRelativeFromNow(date))} (${formatDateTimeWithTime(date)})`;
}

function toTitleCase(text) {
  return text
    .split(' ')
    .map(word => (word ? `${word[0].toUpperCase()}${word.slice(1)}` : word))
    .join(' ');
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
