// Bedrock Edition の最小構成 level.dat を生成する
// フォーマット: 8 バイトヘッダ（storage version LE + payload length LE）+ 非圧縮リトルエンディアン NBT
// 参考: https://wiki.bedrock.dev/world-generation/level-dat

const fs = require('fs');

const TAG_END = 0;
const TAG_BYTE = 1;
const TAG_INT = 3;
const TAG_LONG = 4;
const TAG_STRING = 8;
const TAG_COMPOUND = 10;

function u8(v) { const b = Buffer.alloc(1); b.writeUInt8(v, 0); return b; }
function i32le(v) { const b = Buffer.alloc(4); b.writeInt32LE(v, 0); return b; }
function u32le(v) { const b = Buffer.alloc(4); b.writeUInt32LE(v, 0); return b; }
function i64le(v) { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(v), 0); return b; }
function u16le(v) { const b = Buffer.alloc(2); b.writeUInt16LE(v, 0); return b; }

function nbtString(s) {
  const str = Buffer.from(s, 'utf8');
  return Buffer.concat([u16le(str.length), str]);
}

function tag(id, name, payload) {
  return Buffer.concat([u8(id), nbtString(name), payload]);
}

function writeLevelDat(outputPath, levelName = 'Arlt Story') {
  const nowSec = Math.floor(Date.now() / 1000);

  // 子タグの連結
  const children = Buffer.concat([
    tag(TAG_INT,    'StorageVersion',       i32le(10)),
    tag(TAG_INT,    'NetworkVersion',       i32le(685)),      // 1.21 近辺
    tag(TAG_INT,    'Platform',             i32le(2)),
    tag(TAG_INT,    'GameType',             i32le(1)),        // Creative
    tag(TAG_INT,    'Generator',            i32le(2)),        // Infinite
    tag(TAG_INT,    'Difficulty',           i32le(2)),        // Normal
    tag(TAG_LONG,   'RandomSeed',           i64le(0)),
    tag(TAG_LONG,   'Time',                 i64le(0)),
    tag(TAG_LONG,   'LastPlayed',           i64le(nowSec)),
    tag(TAG_LONG,   'currentTick',          i64le(0)),
    tag(TAG_STRING, 'LevelName',            nbtString(levelName)),
    tag(TAG_STRING, 'InventoryVersion',     nbtString('1.21.0')),
    tag(TAG_STRING, 'baseGameVersion',      nbtString('*')),
    tag(TAG_BYTE,   'commandsEnabled',      u8(1)),
    tag(TAG_BYTE,   'MultiplayerGame',      u8(1)),
    tag(TAG_BYTE,   'LANBroadcast',         u8(1)),
    tag(TAG_BYTE,   'MultiplayerGameIntent',u8(1)),
    tag(TAG_BYTE,   'LANBroadcastIntent',   u8(1)),
    tag(TAG_BYTE,   'HasBeenLoadedInCreative', u8(1)),
    tag(TAG_BYTE,   'ConfirmedPlatformLockedContent', u8(0)),
    tag(TAG_BYTE,   'educationFeaturesEnabled', u8(0)),
    tag(TAG_BYTE,   'experimentgameplay',   u8(0)),
    tag(TAG_BYTE,   'bonusChestEnabled',    u8(0)),
    tag(TAG_BYTE,   'bonusChestSpawned',    u8(0)),
    tag(TAG_BYTE,   'startWithMapEnabled',  u8(0)),
    tag(TAG_BYTE,   'forceGameType',        u8(0)),
    tag(TAG_BYTE,   'immutableWorld',       u8(0)),
    tag(TAG_BYTE,   'texturePacksRequired', u8(0)),
    tag(TAG_INT,    'SpawnX',               i32le(0)),
    tag(TAG_INT,    'SpawnY',               i32le(64)),
    tag(TAG_INT,    'SpawnZ',               i32le(0)),
    tag(TAG_INT,    'LimitedWorldOriginX',  i32le(0)),
    tag(TAG_INT,    'LimitedWorldOriginY',  i32le(64)),
    tag(TAG_INT,    'LimitedWorldOriginZ',  i32le(0)),
    tag(TAG_INT,    'LimitedWorldDepth',    i32le(16)),
    tag(TAG_INT,    'LimitedWorldWidth',    i32le(16)),
    tag(TAG_INT,    'rainTime',             i32le(0)),
    tag(TAG_INT,    'lightningTime',        i32le(0)),
    u8(TAG_END),
  ]);

  // ルート Compound
  const payload = Buffer.concat([u8(TAG_COMPOUND), nbtString(''), children]);

  const header = Buffer.concat([u32le(10), u32le(payload.length)]);
  fs.writeFileSync(outputPath, Buffer.concat([header, payload]));
}

module.exports = { writeLevelDat };

if (require.main === module) {
  writeLevelDat(process.argv[2] || 'level.dat', process.argv[3] || 'Arlt Story');
  console.log('✅ level.dat written');
}
