// GitHub Actions から呼ばれる: 承認済みアイデアを実装する
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ISSUE_NUMBER = process.env.ISSUE_NUMBER;
const REPO = process.env.GITHUB_REPOSITORY;

function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function readFileOrEmpty(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
}

function findFiles(dir, ext) {
  let results = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) results = results.concat(findFiles(full, ext));
      else if (!ext || entry.name.endsWith(ext)) results.push(full);
    }
  } catch {}
  return results;
}

async function main() {
  // Issue の全コメントを取得（Claude の構造化 + 晄希の修正指示を含む）
  const issueRes = await httpRequest({
    hostname: 'api.github.com',
    path: `/repos/${REPO}/issues/${ISSUE_NUMBER}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'User-Agent': 'ArltStory-Bot',
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  const commentsRes = await httpRequest({
    hostname: 'api.github.com',
    path: `/repos/${REPO}/issues/${ISSUE_NUMBER}/comments?per_page=100`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'User-Agent': 'ArltStory-Bot',
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  const issue = issueRes.data;
  const comments = commentsRes.data;

  // 会話履歴を組み立て
  const conversation = [
    `## 晄希のアイデア（Issue #${ISSUE_NUMBER}）\n\nタイトル: ${issue.title}\n\n${issue.body}`,
    ...comments.map(c => `## ${c.user.login} のコメント:\n${c.body}`)
  ].join('\n\n---\n\n');

  // 現在のアドオン状態を収集
  const currentFiles = {};
  for (const f of findFiles('./src', null)) {
    const rel = path.relative('.', f);
    currentFiles[rel] = readFileOrEmpty(f);
  }

  const currentState = Object.entries(currentFiles)
    .map(([p, content]) => `### ${p}\n\`\`\`\n${content}\n\`\`\``)
    .join('\n\n');

  // Claude に実装させる
  const prompt = `あなたは Minecraft Bedrock Edition アドオン開発者です。
晄希（こうき）くんのアイデアが承認されたので、アドオンに実装してください。

${conversation}

## 現在のアドオンファイル

${currentState}

## ルール

- Bedrock Edition の正しい JSON フォーマットを使う
- manifest.json の UUID は変更しない
- NPC ダイアログの commands は "/command" 形式（先頭スラッシュ必須）
- ダイアログ内の対象プレイヤーは @initiator
- 日本語テキストは ja_JP.lang にも追記
- format_version: manifest は 2、entity は "1.20.0"、dialogue は "1.17.0"

## 出力フォーマット

変更するファイルごとに以下の形式で出力してください。
新規ファイルも既存ファイルの上書きも同じ形式です。

===FILE: src/BP/dialogue/example.json===
(ファイルの完全な内容)
===END===

===FILE: src/BP/texts/ja_JP.lang===
(ファイルの完全な内容)
===END===

最後に、コミットメッセージを1行で：
===COMMIT: feat(chapter): 説明===`;

  const claudeRes = await httpRequest({
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    }
  }, JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }]
  }));

  if (claudeRes.status !== 200) {
    console.error('Claude API error:', JSON.stringify(claudeRes.data));
    process.exit(1);
  }

  const response = claudeRes.data.content[0].text;

  // ファイルを抽出して書き込み
  const fileRegex = /===FILE:\s*(.+?)===\n([\s\S]*?)===END===/g;
  let match;
  const changedFiles = [];

  while ((match = fileRegex.exec(response)) !== null) {
    const filePath = match[1].trim();
    const content = match[2].trim() + '\n';
    const fullPath = path.resolve('.', filePath);

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
    changedFiles.push(filePath);
    console.log(`📝 ${filePath}`);
  }

  if (changedFiles.length === 0) {
    console.error('❌ Claude の出力からファイルを抽出できませんでした');
    process.exit(1);
  }

  // コミットメッセージ抽出
  const commitMatch = response.match(/===COMMIT:\s*(.+)===/);
  const commitMsg = commitMatch
    ? `${commitMatch[1].trim()} (Closes #${ISSUE_NUMBER})`
    : `feat: Issue #${ISSUE_NUMBER} のアイデアを実装 (Closes #${ISSUE_NUMBER})`;

  // JSON バリデーション
  try {
    execSync('node scripts/validate.js', { stdio: 'inherit' });
  } catch {
    console.error('❌ JSON バリデーション失敗');
    process.exit(1);
  }

  // master に直接コミット → push （PR なし。Build Release が即発火）
  // 理由: GitHub Actions のデフォルト権限では PR 作成ができない（403）ため、
  //       そもそも PR を作らず master に直 push する方が早く・確実・シンプル。
  execSync(`git add ${changedFiles.join(' ')}`);
  execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);

  let pushed = false;
  try {
    execSync(`git push origin HEAD:master`);
    pushed = true;
    console.log(`✅ master に直接コミット & push`);

    // GITHUB_TOKEN で push した commit は push イベントを他ワークフローに伝播しない
    // （GitHub の無限ループ防止仕様）ため、Build Release を明示的に起動する
    const dispatchRes = await httpRequest({
      hostname: 'api.github.com',
      path: `/repos/${REPO}/actions/workflows/nightly-build.yml/dispatches`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'ArltStory-Bot',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, JSON.stringify({ ref: 'master' }));
    if (dispatchRes.status === 204) {
      console.log(`✅ Build Release を起動しました`);
    } else {
      console.error(`⚠️ Build Release 起動失敗 (${dispatchRes.status}):`, JSON.stringify(dispatchRes.data));
    }
  } catch (e) {
    // 失敗時のフォールバック: 作業ブランチに push しておいて人に見える状態にする
    const branch = `story/issue-${ISSUE_NUMBER}`;
    console.error(`⚠️ master への直 push 失敗、${branch} に退避します`);
    execSync(`git checkout -b ${branch}`);
    execSync(`git push origin ${branch}`);
  }

  // Issue にコメント
  const commentBody = pushed
    ? `できたよ！master にコミットしたから、あと数分でビルドが出るよ📦\n\n変更したファイル:\n${changedFiles.map(f => '- \`' + f + '\`').join('\n')}`
    : `実装できたけど master に push できなかったよ💦 お父さんに \`story/issue-${ISSUE_NUMBER}\` ブランチを見てもらってね。\n\n変更したファイル:\n${changedFiles.map(f => '- \`' + f + '\`').join('\n')}`;

  await httpRequest({
    hostname: 'api.github.com',
    path: `/repos/${REPO}/issues/${ISSUE_NUMBER}/comments`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'User-Agent': 'ArltStory-Bot',
      'Accept': 'application/vnd.github.v3+json'
    }
  }, JSON.stringify({ body: commentBody }));

  // push 成功時は Issue をクローズ（Closes #N だけだと master マージトリガーが
  // 使えない＝ 直 push では close されないため、明示的にクローズ）
  if (pushed) {
    await httpRequest({
      hostname: 'api.github.com',
      path: `/repos/${REPO}/issues/${ISSUE_NUMBER}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'ArltStory-Bot',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, JSON.stringify({ state: 'closed' }));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
