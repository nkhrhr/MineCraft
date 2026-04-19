const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const DIST = './dist';

function createMcpack(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => {
      console.log(`✅ ${outputPath} (${archive.pointer()} bytes)`);
      resolve();
    });
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function main() {
  if (!fs.existsSync(DIST)) fs.mkdirSync(DIST);

  const version = JSON.parse(fs.readFileSync('./src/BP/manifest.json', 'utf8'))
    .header.version.join('.');

  await createMcpack('./src/BP', `${DIST}/ArltStory_BP_v${version}.mcpack`);
  await createMcpack('./src/RP', `${DIST}/ArltStory_RP_v${version}.mcpack`);

  // .mcaddon = BP + RP を1つの zip にまとめたもの
  const addonPath = `${DIST}/ArltStory_v${version}.mcaddon`;
  const addonOutput = fs.createWriteStream(addonPath);
  const addonArchive = archiver('zip', { zlib: { level: 9 } });
  await new Promise((resolve, reject) => {
    addonOutput.on('close', () => {
      console.log(`✅ ${addonPath} (${addonArchive.pointer()} bytes)`);
      resolve();
    });
    addonArchive.on('error', reject);
    addonArchive.pipe(addonOutput);
    addonArchive.directory('./src/BP', 'ArltStory_BP');
    addonArchive.directory('./src/RP', 'ArltStory_RP');
    addonArchive.finalize();
  });

  console.log('\n🎉 Build complete!');
}

main().catch(e => { console.error(e); process.exit(1); });
