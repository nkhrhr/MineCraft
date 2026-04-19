// GitHub Actions から呼ばれる: Issue の内容を Claude が構造化して返す
const https = require('https');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ISSUE_NUMBER = process.env.ISSUE_NUMBER;
const ISSUE_TITLE = process.env.ISSUE_TITLE;
const ISSUE_BODY = process.env.ISSUE_BODY;
const REPO = process.env.GITHUB_REPOSITORY; // "nkhrhr/MineCraft"

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

async function main() {
  // Claude API で Issue を構造化
  const prompt = `あなたは Minecraft Bedrock Edition のアドオン開発アシスタントです。
10歳の晄希（こうき）くんが書いた物語のアイデアを読んで、実装仕様として構造化してください。

## 晄希くんのアイデア

タイトル: ${ISSUE_TITLE}

${ISSUE_BODY}

## やること

1. 晄希くんのアイデアを丁寧に読み取る（10歳の文章なので曖昧な部分がある）
2. 以下のフォーマットで「こう理解しました」を書く
3. 足りない部分は補完するが、勝手にアイデアを変えない
4. 晄希くんが読んで「合ってる！」か「違う」か判断できるように、具体的に書く

## 出力フォーマット（日本語で、小学生が読める言葉で）

こう理解したよ！

### やること
- （具体的なゲーム内の変化を箇条書き）

### 新しいキャラクター
- （名前と説明。なければ「なし」）

### 新しいアイテム
- （名前と効果。なければ「なし」）

### ゲームの中でどうなる？
（プレイヤー目線で、ゲーム内でどういう体験になるかを2-3文で）

---
合ってたら **「Go」** ってコメントしてね！
違うところがあったら教えてね、直すよ！`;

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
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }]
  }));

  if (claudeRes.status !== 200) {
    console.error('Claude API error:', JSON.stringify(claudeRes.data));
    process.exit(1);
  }

  const interpretation = claudeRes.data.content[0].text;

  // GitHub Issue にコメント
  const commentBody = JSON.stringify({ body: interpretation });
  const ghRes = await httpRequest({
    hostname: 'api.github.com',
    path: `/repos/${REPO}/issues/${ISSUE_NUMBER}/comments`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'User-Agent': 'ArltStory-Bot',
      'Accept': 'application/vnd.github.v3+json'
    }
  }, commentBody);

  if (ghRes.status === 201) {
    console.log(`✅ Issue #${ISSUE_NUMBER} にコメント投稿完了`);
  } else {
    console.error('GitHub API error:', JSON.stringify(ghRes.data));
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
