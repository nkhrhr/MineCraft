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
    // CSS/JS は URL に ?v=... のキャッシュバスターが付いているのでそのまま
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) {
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

    // GET /api/latest-build — 最新ビルド
    if (url.pathname === '/api/latest-build' && request.method === 'GET') {
      const res = await fetch(
        `https://api.github.com/repos/${env.GITHUB_REPO}/releases?per_page=1`,
        { headers: githubReleaseHeaders }
      );
      const releases = await res.json();
      const rel = releases[0];
      if (!rel) {
        return new Response(JSON.stringify({ available: false }), { headers });
      }

      const mcworld = rel.assets?.find(a => a.name.endsWith('.mcworld'));
      const mcaddon = rel.assets?.find(a => a.name.endsWith('.mcaddon'));

      return new Response(JSON.stringify({
        available: true,
        version: rel.tag_name,
        date: rel.published_at,
        mcworld_url: mcworld?.browser_download_url,
        mcaddon_url: mcaddon?.browser_download_url
      }), { headers });
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
      const relRes = await fetch(
        `https://api.github.com/repos/${env.GITHUB_REPO}/releases?per_page=1`,
        { headers: githubReleaseHeaders }
      );
      const releases = await relRes.json();
      const rel = releases[0];
      const build = rel ? {
        version: rel.tag_name,
        date: rel.published_at,
        mcworld_url: rel.assets?.find(a => a.name.endsWith('.mcworld'))?.browser_download_url
      } : null;

      // ステップ判定
      // 1: まだアイデアがない
      // 2: hari が読んでる / 読み終わった（Go 待ち）
      // 3: Go 後、実装中
      // 4: 実装完了、ビルド中
      // 5: ビルドできた → 遊べる
      let step = 1;
      let loading = false;

      if (idea) {
        if (idea.status === 'waiting') {
          step = 2;
          loading = true;  // hari が読んでる
        } else if (idea.status === 'responded') {
          step = 2;
          loading = false; // Go 待ち
        } else if (idea.status === 'implementing') {
          // ビルドが Go 後に出ているか
          if (build && new Date(build.date) > new Date(idea.updated_at || idea.created_at)) {
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
