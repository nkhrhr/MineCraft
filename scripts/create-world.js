const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { writeLevelDat } = require('./level-dat');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

function zip(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function main() {
  const bp = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/BP/manifest.json'), 'utf8'));
  const rp = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/RP/manifest.json'), 'utf8'));
  const version = bp.header.version.join('.');

  const worldDir = path.join(DIST, '_world_tmp');
  fs.rmSync(worldDir, { recursive: true, force: true });

  // ワールド構造
  fs.mkdirSync(path.join(worldDir, 'behavior_packs'), { recursive: true });
  fs.mkdirSync(path.join(worldDir, 'resource_packs'), { recursive: true });

  const levelName = '物語の世界';
  fs.writeFileSync(path.join(worldDir, 'levelname.txt'), levelName);

  // Bedrock はワールド識別に level.dat を必須とするため最小構成で生成
  writeLevelDat(path.join(worldDir, 'level.dat'), levelName);
  // ゲーム内バックアップ用（起動時に読み込みエラーがあれば level.dat_old にフォールバック）
  fs.copyFileSync(path.join(worldDir, 'level.dat'), path.join(worldDir, 'level.dat_old'));

  fs.writeFileSync(path.join(worldDir, 'world_behavior_packs.json'), JSON.stringify([
    { pack_id: bp.header.uuid, version: bp.header.version }
  ], null, 2));

  fs.writeFileSync(path.join(worldDir, 'world_resource_packs.json'), JSON.stringify([
    { pack_id: rp.header.uuid, version: rp.header.version }
  ], null, 2));

  copyDir(path.join(ROOT, 'src/BP'), path.join(worldDir, 'behavior_packs/ArltStory_BP'));
  copyDir(path.join(ROOT, 'src/RP'), path.join(worldDir, 'resource_packs/ArltStory_RP'));

  if (!fs.existsSync(DIST)) fs.mkdirSync(DIST);
  const outPath = path.join(DIST, `ArltStory_v${version}.mcworld`);
  await zip(worldDir, outPath);

  fs.rmSync(worldDir, { recursive: true, force: true });
  console.log(`✅ ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
