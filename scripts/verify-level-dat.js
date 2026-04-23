// level.dat を読み戻して中身と整合性を検証する開発ツール
const fs = require('fs');
const path = require('path');

const TAG_NAMES = {
  0: 'End', 1: 'Byte', 2: 'Short', 3: 'Int', 4: 'Long',
  5: 'Float', 6: 'Double', 7: 'ByteArray', 8: 'String',
  9: 'List', 10: 'Compound', 11: 'IntArray', 12: 'LongArray',
};

function parse(buf) {
  let off = 0;

  function readU8()  { return buf.readUInt8(off++); }
  function readI8()  { const v = buf.readInt8(off); off += 1; return v; }
  function readI16() { const v = buf.readInt16LE(off); off += 2; return v; }
  function readU16() { const v = buf.readUInt16LE(off); off += 2; return v; }
  function readI32() { const v = buf.readInt32LE(off); off += 4; return v; }
  function readU32() { const v = buf.readUInt32LE(off); off += 4; return v; }
  function readI64() { const v = buf.readBigInt64LE(off); off += 8; return v; }
  function readF32() { const v = buf.readFloatLE(off); off += 4; return v; }
  function readF64() { const v = buf.readDoubleLE(off); off += 8; return v; }
  function readStr() {
    const len = readU16();
    const s = buf.slice(off, off + len).toString('utf8');
    off += len;
    return s;
  }

  function readPayload(type) {
    switch (type) {
      case 1: return readI8();
      case 2: return readI16();
      case 3: return readI32();
      case 4: return readI64();
      case 5: return readF32();
      case 6: return readF64();
      case 7: { const n = readI32(); const a = buf.slice(off, off + n); off += n; return a; }
      case 8: return readStr();
      case 9: {
        const inner = readU8();
        const n = readI32();
        const a = [];
        for (let i = 0; i < n; i++) a.push(readPayload(inner));
        return a;
      }
      case 10: {
        const obj = {};
        while (true) {
          const t = readU8();
          if (t === 0) break;
          const name = readStr();
          obj[name] = { type: t, value: readPayload(t) };
        }
        return obj;
      }
      case 11: { const n = readI32(); const a = []; for (let i = 0; i < n; i++) a.push(readI32()); return a; }
      case 12: { const n = readI32(); const a = []; for (let i = 0; i < n; i++) a.push(readI64()); return a; }
      default: throw new Error(`Unknown tag type: ${type} at offset ${off - 1}`);
    }
  }

  // ヘッダー: 8 バイト
  const headerVersion = readU32();
  const headerLength = readU32();
  const payloadStart = off;

  // ルートは名前付き Compound
  const rootType = readU8();
  if (rootType !== 10) throw new Error(`Root is not TAG_Compound: got ${rootType}`);
  const rootName = readStr();
  const root = readPayload(10);

  return {
    header: { version: headerVersion, length: headerLength },
    actualPayloadBytes: off - payloadStart,
    totalFileBytes: buf.length,
    rootName,
    root,
  };
}

const target = process.argv[2];
if (!target) {
  console.error('usage: node verify-level-dat.js <path>');
  process.exit(1);
}

const buf = fs.readFileSync(target);
const parsed = parse(buf);

console.log('=== Header ===');
console.log(`version: ${parsed.header.version}`);
console.log(`declared length: ${parsed.header.length}`);
console.log(`actual payload bytes: ${parsed.actualPayloadBytes}`);
console.log(`total file bytes: ${parsed.totalFileBytes}`);
console.log(`header/payload/total consistent: ${parsed.header.length === parsed.actualPayloadBytes && parsed.totalFileBytes === parsed.header.length + 8}`);
console.log(`root compound name: ${JSON.stringify(parsed.rootName)}`);

console.log('\n=== Tags ===');
const entries = Object.entries(parsed.root);
for (const [k, v] of entries) {
  const typeName = TAG_NAMES[v.type];
  let display = v.value;
  if (typeof display === 'bigint') display = display.toString();
  if (Buffer.isBuffer(display)) display = `<Buffer len=${display.length}>`;
  console.log(`  [${typeName}] ${k} = ${display}`);
}

// 必須 / 推奨タグのチェック
const REQUIRED = ['StorageVersion', 'LevelName', 'GameType', 'Generator', 'RandomSeed'];
const STRONGLY_RECOMMENDED = ['Difficulty', 'SpawnX', 'SpawnY', 'SpawnZ', 'LastPlayed', 'Time', 'baseGameVersion'];

console.log('\n=== Required tag check ===');
for (const key of REQUIRED) {
  const present = Object.prototype.hasOwnProperty.call(parsed.root, key);
  console.log(`${present ? '✅' : '❌'} ${key}`);
}
console.log('\n=== Recommended tag check ===');
for (const key of STRONGLY_RECOMMENDED) {
  const present = Object.prototype.hasOwnProperty.call(parsed.root, key);
  console.log(`${present ? '✅' : '⚠️ '} ${key}`);
}
