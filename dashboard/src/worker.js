export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API routes
    if (url.pathname.startsWith('/api/')) {
      return handleAPI(url, request, env);
    }

    // Static assets handled by [assets] in wrangler.toml
    const res = await env.ASSETS.fetch(request);

    // HTML は毎回サーバに取りに行かせる（PWA / Safari のキャッシュ詰まり対策）
    // UI 更新を確実に反映するため、静的資産(JS/CSS)もキャッシュ無効化
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html') || ct.includes('text/css') || ct.includes('application/javascript') || ct.includes('text/javascript')) {
      const headers = new Headers(res.headers);
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
    }
    return res;
  }
};

async function handleAPI(url, request, env) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Pragma': 'no-cache'
  };
  const githubReleaseHeaders = {
    'User-Agent': 'KokiAdventureNote',
    'Accept': 'application/vnd.github.v3+json',
    ...(env.GITHUB_TOKEN ? { 'Authorization': `Bearer ${env.GITHUB_TOKEN}` } : {})
  };

  try {
    // POST /api/ideas — 新しいアイデアを投稿
    if (url.pathname === '/api/ideas' && request.method === 'POST') {
      const { title, body } = await request.json();
      if (!title || !body) {
        return new Response(JSON.stringify({ error: 'タイトルと内容を書いてね' }), { status: 400, headers });
      }

      // GitHub Issue 作成
      const ghRes = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'User-Agent': 'KokiAdventureNote',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          title: `[アイデア] ${title}`,
          body: body,
          labels: ['story']
        })
      });
      const issue = await ghRes.json();

      if (!ghRes.ok) {
        return new Response(JSON.stringify({ error: 'Issue 作成に失敗しました' }), { status: 500, headers });
      }

      // D1 に保存
      await env.DB.prepare(
        'INSERT INTO ideas (github_issue_number, title, body, status) VALUES (?, ?, ?, ?)'
      ).bind(issue.number, title, body, 'waiting').run();

      // stats 更新
      await env.DB.prepare(
        'UPDATE stats SET total_ideas = total_ideas + 1, updated_at = datetime("now") WHERE id = 1'
      ).run();

      return new Response(JSON.stringify({ ok: true, issue_number: issue.number }), { headers });
    }

    // GET /api/ideas — アイデア一覧
    if (url.pathname === '/api/ideas' && request.method === 'GET') {
      const ideas = await env.DB.prepare(
        'SELECT * FROM ideas ORDER BY created_at DESC LIMIT 50'
      ).all();

      return new Response(JSON.stringify(ideas.results), { headers });
    }

    // GET /api/ideas/:id — アイデア詳細 + hari の返事
    const ideaMatch = url.pathname.match(/^\/api\/ideas\/(\d+)$/);
    if (ideaMatch && request.method === 'GET') {
      const issueNumber = ideaMatch[1];

      // D1 からアイデア取得
      const idea = await env.DB.prepare(
        'SELECT * FROM ideas WHERE github_issue_number = ?'
      ).bind(issueNumber).first();

      // GitHub からコメント取得（hari の返事）
      const commentsRes = await fetch(
        `https://api.github.com/repos/${env.GITHUB_REPO}/issues/${issueNumber}/comments`,
        {
          headers: {
            'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
            'User-Agent': 'KokiAdventureNote',
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      const comments = await commentsRes.json();

      // hari（github-actions）のコメントを抽出
      const hariComments = comments
        .filter(c => c.user.login === 'github-actions[bot]' || c.user.type === 'Bot')
        .map(c => ({ body: c.body, created_at: c.created_at }));

      // 晄希のコメントを抽出
      const kokiComments = comments
        .filter(c => c.user.type !== 'Bot')
        .map(c => ({ body: c.body, created_at: c.created_at }));

      // D1 の hari_response を更新
      if (hariComments.length > 0 && idea && !idea.hari_response) {
        await env.DB.prepare(
          'UPDATE ideas SET hari_response = ?, status = "responded" WHERE github_issue_number = ?'
        ).bind(hariComments[0].body, issueNumber).run();
      }

      return new Response(JSON.stringify({
        idea,
        hari: hariComments,
        koki: kokiComments
      }), { headers });
    }

    // POST /api/reply — 返信する（Go！ or 修正指示）
    if (url.pathname === '/api/reply' && request.method === 'POST') {
      const { issue_number, message } = await request.json();

      const ghRes = await fetch(
        `https://api.github.com/repos/${env.GITHUB_REPO}/issues/${issue_number}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
            'User-Agent': 'KokiAdventureNote',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({ body: message })
        }
      );

      if (ghRes.ok) {
        // Go なら status を implementing に
        const isGo = /^(go|Go|GO|いいよ|OK|ok|おねがい|やって)/i.test(message.trim());
        if (isGo) {
          await env.DB.prepare(
            'UPDATE ideas SET status = "implementing" WHERE github_issue_number = ?'
          ).bind(issue_number).run();
        }
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      return new Response(JSON.stringify({ error: '送信失敗' }), { status: 500, headers });
    }

    // GET /api/stats — 冒険者ステータス
    if (url.pathname === '/api/stats' && request.method === 'GET') {
      const stats = await env.DB.prepare('SELECT * FROM stats WHERE id = 1').first();

      // レベル計算: 3アイデアごとにレベルアップ
      const level = Math.floor((stats?.total_completed || 0) / 3) + 1;
      if (level !== stats?.level) {
        await env.DB.prepare('UPDATE stats SET level = ? WHERE id = 1').bind(level).run();
      }

      return new Response(JSON.stringify({
        total_ideas: stats?.total_ideas || 0,
        total_completed: stats?.total_completed || 0,
        level
      }), { headers });
    }

    // GET /api/latest-build — 最新ビルド（実行中アイデアの紐付けを試行）
    if (url.pathname === '/api/latest-build' && request.method === 'GET') {
      const build = await getLatestBuildWithIssue(env, githubReleaseHeaders);
      return new Response(JSON.stringify(build), { headers });
    }

    // GET /api/progress — いま晄希がどのステップにいるか（左サイドバー用）
    if (url.pathname === '/api/progress' && request.method === 'GET') {
      // 最新のアイデアを取得
      let idea = await env.DB.prepare(
        'SELECT * FROM ideas ORDER BY created_at DESC LIMIT 1'
      ).first();

      // 最新アイデアが waiting の間、GitHub のコメント状況を見て status を自動更新
      // （晄希がモーダルを開かなくてもステップが進むようにする）
      if (idea && idea.status === 'waiting') {
        const commentsRes = await fetch(
          `https://api.github.com/repos/${env.GITHUB_REPO}/issues/${idea.github_issue_number}/comments`,
          {
            headers: {
              'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
              'User-Agent': 'KokiAdventureNote',
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        if (commentsRes.ok) {
          const comments = await commentsRes.json();
          const hari = comments.find(c => c.user.login === 'github-actions[bot]' || c.user.type === 'Bot');
          if (hari) {
            await env.DB.prepare(
              'UPDATE ideas SET hari_response = ?, status = "responded" WHERE github_issue_number = ?'
            ).bind(hari.body, idea.github_issue_number).run();
            idea = { ...idea, status: 'responded', hari_response: hari.body };
          }
        }
      }

      // 最新のビルド
      const build = await getLatestBuildWithIssue(env, githubReleaseHeaders);

      // ステップ判定
      // 1: まだアイデアがない
      // 2: hari が読んでる / 読み終わった（Go 待ち）
      // 3: Go 後、実装中
      // 4: 実装完了、ビルド中
      // 5: ビルドできた → 遊べる
      let step = 1;
      let loading = false;

      if (idea) {
        const currentIssueNumber = idea.github_issue_number ? Number(idea.github_issue_number) : null;
        const buildIssueNumber = build?.issue_number ? Number(build.issue_number) : null;
        const buildDate = build?.date;
        const ideaBuildDate = idea.created_at || idea.updated_at;
        const isBuildForCurrentIdea = buildIssueNumber
          ? currentIssueNumber && buildIssueNumber === currentIssueNumber
          : false;

        if (idea.status === 'waiting') {
          step = 2;
          loading = true;  // hari が読んでる
        } else if (idea.status === 'responded') {
          step = 2;
          loading = false; // Go 待ち
        } else if (idea.status === 'implementing') {
          const isBuildNewer = isBuildForCurrentIdea && buildDate && ideaBuildDate
            ? new Date(buildDate).getTime() > new Date(ideaBuildDate).getTime()
            : false;
          // ビルドが Go 後に出ているか
          if (isBuildNewer) {
            step = 5;
          } else {
            step = 3;
            loading = true;
          }
        } else if (idea.status === 'done') {
          step = 5;
        }
      }

      return new Response(JSON.stringify({
        step,
        loading,
        idea: idea ? {
          number: idea.github_issue_number,
          title: idea.title,
          status: idea.status
        } : null,
        build
      }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}

function parseBuildPayload(release) {
  if (!release) {
    return { available: false };
  }

  const mcworld = release.assets?.find((asset) => asset.name.endsWith('.mcworld'));
  const mcaddon = release.assets?.find((asset) => asset.name.endsWith('.mcaddon'));
  return {
    available: true,
    version: release.tag_name,
    date: release.published_at,
    mcworld_url: mcworld?.browser_download_url,
    mcaddon_url: mcaddon?.browser_download_url
  };
}

async function getLatestBuildWithIssue(env, githubReleaseHeaders) {
  const releaseRes = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/releases?per_page=1`,
    { headers: githubReleaseHeaders }
  );
  if (!releaseRes.ok) {
    return { available: false };
  }

  const releases = await releaseRes.json();
  const rel = Array.isArray(releases) ? releases[0] : null;
  const build = parseBuildPayload(rel);
  if (!build.available) {
    return build;
  }

  const implementingIdea = await env.DB.prepare(
    'SELECT github_issue_number, created_at FROM ideas WHERE status = "implementing" ORDER BY created_at DESC LIMIT 1'
  ).first();
  if (!implementingIdea?.github_issue_number) {
    return build;
  }

  const issueNumber = Number(implementingIdea.github_issue_number);
  if (Number.isNaN(issueNumber)) {
    return build;
  }

  build.issue_number = issueNumber;

  const buildDate = build.date;
  const issueCreatedAt = implementingIdea.created_at;
  const hasBuildUrl = !!build.mcworld_url;
  const buildIsAfterIssue = buildDate && issueCreatedAt
    ? new Date(buildDate).getTime() > new Date(issueCreatedAt).getTime()
    : false;

  if (hasBuildUrl && buildIsAfterIssue) {
    const updateResult = await env.DB.prepare(
      'UPDATE ideas SET status = "done", completed_at = ? WHERE github_issue_number = ? AND status != "done"'
    ).bind(buildDate, issueNumber).run();

    // 完了状態への初回遷移のみカウントする
    if (updateResult.meta?.changes > 0) {
      await env.DB.prepare(
        'UPDATE stats SET total_completed = total_completed + 1, updated_at = datetime("now") WHERE id = 1'
      ).run();
    }
  }

  return build;
}
