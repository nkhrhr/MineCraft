// リリース前のゲートキーパー: dist/*.mcworld を開いて構造を検証する。
// Bedrock にインポートさせる前にここで落とす（World インポート失敗の再発防止）。
const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');

const DIST = path.resolve(__dirname, '..', 'dist');

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function listZip(zipPath) {
  // unzip -Z1 は各エントリを 1 行ずつ出す
  const out = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' });
  return out.split('\n').map(s => s.trim()).filter(Boolean);
}

function readZipEntryText(zipPath, entry) {
  return execFileSync('unzip', ['-p', zipPath, entry], { encoding: 'utf8' });
}

function readZipEntryBuffer(zipPath, entry) {
  return execFileSync('unzip', ['-p', zipPath, entry], { maxBuffer: 64 * 1024 * 1024 });
}

// ---- NBT パーサ（Bedrock: LE, uncompressed, 8-byte header つき）----
function parseLevelDat(buf) {
  let off = 0;
  const readU8 = () => buf.readUInt8(off++);
  const readU16 = () => { const v = buf.readUInt16LE(off); off += 2; return v; };
  const readI32 = () => { const v = buf.readInt32LE(off); off += 4; return v; };
  const readU32 = () => { const v = buf.readUInt32LE(off); off += 4; return v; };
  const readI64 = () => { const v = buf.readBigInt64LE(off); off += 8; return v; };
  const readF32 = () => { const v = buf.readFloatLE(off); off += 4; return v; };
  const readF64 = () => { const v = buf.readDoubleLE(off); off += 8; return v; };
  const readStr = () => { const n = readU16(); const s = buf.slice(off, off + n).toString('utf8'); off += n; return s; };

  function readPayload(t) {
    switch (t) {
      case 1: { const v = buf.readInt8(off); off += 1; return v; }
      case 2: { const v = buf.readInt16LE(off); off += 2; return v; }
      case 3: return readI32();
      case 4: return readI64();
      case 5: return readF32();
      case 6: return readF64();
      case 7: { const n = readI32(); off += n; return null; }
      case 8: return readStr();
      case 9: { const inner = readU8(); const n = readI32(); const a = []; for (let i = 0; i < n; i++) a.push(readPayload(inner)); return a; }
      case 10: {
        const obj = {};
        while (true) {
          const tt = readU8();
          if (tt === 0) break;
          const name = readStr();
          obj[name] = { type: tt, value: readPayload(tt) };
        }
        return obj;
      }
      case 11: { const n = readI32(); off += 4 * n; return null; }
      case 12: { const n = readI32(); off += 8 * n; return null; }
      default: throw new Error(`Unknown NBT tag id ${t} at offset ${off - 1}`);
    }
  }

  const headerVersion = readU32();
  const headerLength = readU32();
  const payloadStart = off;

  const rootType = readU8();
  if (rootType !== 10) throw new Error(`level.dat root is not Compound (got ${rootType})`);
  readStr(); // root name（通常空文字）
  const root = readPayload(10);

  const payloadBytes = off - payloadStart;
  if (payloadBytes !== headerLength) {
    throw new Error(`level.dat payload length mismatch: header=${headerLength} actual=${payloadBytes}`);
  }
  if (buf.length !== headerLength + 8) {
    throw new Error(`level.dat total size mismatch: file=${buf.length} expected=${headerLength + 8}`);
  }
  return { header: { version: headerVersion, length: headerLength }, root };
}

// ---- 検証本体 ----
const mcworlds = fs.readdirSync(DIST)
  .filter(f => f.endsWith('.mcworld'))
  .map(f => path.join(DIST, f));

if (mcworlds.length === 0) fail('dist/ に .mcworld がありません');

let hadError = false;

for (const mcworld of mcworlds) {
  console.log(`\n🔎 ${path.basename(mcworld)}`);
  let entries;
  try {
    entries = listZip(mcworld);
  } catch (e) {
    console.error(`❌ zip が開けませんでした: ${e.message}`);
    hadError = true;
    continue;
  }

  const need = [
    'level.dat',
    'levelname.txt',
    'world_behavior_packs.json',
    'world_resource_packs.json',
  ];
  for (const n of need) {
    if (!entries.includes(n)) {
      console.error(`❌ ${n} が .mcworld の root に存在しません`);
      hadError = true;
    } else {
      console.log(`✅ ${n}`);
    }
  }

  // level.dat を NBT として解釈できるか
  if (entries.includes('level.dat')) {
    try {
      const levelDatBuf = readZipEntryBuffer(mcworld, 'level.dat');
      const parsed = parseLevelDat(levelDatBuf);
      const required = ['StorageVersion', 'LevelName', 'GameType', 'Generator', 'RandomSeed'];
      for (const k of required) {
        if (!(k in parsed.root)) {
          console.error(`❌ level.dat に必須タグ ${k} がありません`);
          hadError = true;
        }
      }
      console.log(`✅ level.dat NBT parse OK (tags: ${Object.keys(parsed.root).length}, version=${parsed.header.version})`);
    } catch (e) {
      console.error(`❌ level.dat パース失敗: ${e.message}`);
      hadError = true;
    }
  }

  // world_behavior_packs.json が指す UUID の manifest が実際に中に存在するか
  function verifyPackRef(worldJsonName, packDirPrefix) {
    if (!entries.includes(worldJsonName)) return;
    const refs = JSON.parse(readZipEntryText(mcworld, worldJsonName));
    for (const ref of refs) {
      // packDirPrefix/XXX/manifest.json を全部探して UUID 一致を確認
      const manifestEntries = entries.filter(
        e => e.startsWith(packDirPrefix) && e.endsWith('/manifest.json')
      );
      let matched = false;
      let versionMatch = false;
      for (const me of manifestEntries) {
        const m = JSON.parse(readZipEntryText(mcworld, me));
        if (m.header && m.header.uuid === ref.pack_id) {
          matched = true;
          versionMatch =
            Array.isArray(m.header.version) &&
            Array.isArray(ref.version) &&
            m.header.version.join('.') === ref.version.join('.');
          if (!versionMatch) {
            console.error(
              `❌ ${worldJsonName} が参照する version (${ref.version.join('.')}) と ${me} の version (${m.header.version.join('.')}) が不一致`
            );
            hadError = true;
          }
          break;
        }
      }
      if (!matched) {
        console.error(`❌ ${worldJsonName} の pack_id=${ref.pack_id} に対応する manifest が中に見つかりません`);
        hadError = true;
      } else if (versionMatch) {
        console.log(`✅ ${worldJsonName} → ${ref.pack_id} v${ref.version.join('.')} 整合`);
      }
    }
  }

  verifyPackRef('world_behavior_packs.json', 'behavior_packs/');
  verifyPackRef('world_resource_packs.json', 'resource_packs/');

  // BP dependency が RP header と UUID/version 一致
  const bpManifestPath = entries.find(e => e.startsWith('behavior_packs/') && e.endsWith('/manifest.json'));
  const rpManifestPath = entries.find(e => e.startsWith('resource_packs/') && e.endsWith('/manifest.json'));
  if (bpManifestPath && rpManifestPath) {
    const bp = JSON.parse(readZipEntryText(mcworld, bpManifestPath));
    const rp = JSON.parse(readZipEntryText(mcworld, rpManifestPath));
    const dep = (bp.dependencies || []).find(d => d.uuid === rp.header.uuid);
    if (!dep) {
      console.error(`❌ BP の dependency に RP header uuid (${rp.header.uuid}) が無い`);
      hadError = true;
    } else {
      const depVer = (dep.version || []).join('.');
      const rpVer = (rp.header.version || []).join('.');
      if (depVer !== rpVer) {
        console.error(`❌ BP dep version (${depVer}) ≠ RP header version (${rpVer})`);
        hadError = true;
      } else {
        console.log(`✅ BP dep → RP version ${rpVer} 一致`);
      }
    }
  }
}

if (hadError) {
  console.error('\n❌ .mcworld 検証に失敗しました。Release しないでください。');
  process.exit(1);
}
console.log('\n🎉 .mcworld 検証 OK');
