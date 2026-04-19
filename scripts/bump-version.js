const fs = require('fs');
const path = require('path');

const type = process.argv[2] || 'patch'; // major | minor | patch

const versionFile = path.resolve(__dirname, '../version.json');
const bpManifest = path.resolve(__dirname, '../src/BP/manifest.json');
const rpManifest = path.resolve(__dirname, '../src/RP/manifest.json');

const vj = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
const parts = vj.version.split('.').map(Number);

if (type === 'major') { parts[0]++; parts[1] = 0; parts[2] = 0; }
else if (type === 'minor') { parts[0]; parts[1]++; parts[2] = 0; }
else { parts[2]++; }

const newVersion = parts.join('.');
vj.version = newVersion;
fs.writeFileSync(versionFile, JSON.stringify(vj, null, 2) + '\n');

// manifest.json のバージョンも同期
for (const mPath of [bpManifest, rpManifest]) {
  const m = JSON.parse(fs.readFileSync(mPath, 'utf8'));
  m.header.version = parts;
  m.modules[0].version = parts;
  fs.writeFileSync(mPath, JSON.stringify(m, null, 2) + '\n');
}

console.log(`✅ ${newVersion}`);
