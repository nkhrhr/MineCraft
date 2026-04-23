// src/ 配下の JSON をパースチェック + 主要ファイルは Blockception スキーマで
// AJV 検証する。Claude が生成した壊れた JSON をここで落とす。
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ROOT = path.resolve(__dirname, '..');
const SCHEMAS_DIR = path.join(ROOT, 'schemas');

// Blockception スキーマは \_ などの古い正規表現を含むため unicodeRegExp: false にする
const ajv = new Ajv({
  allErrors: true,
  strict: false,
  strictSchema: false,
  allowUnionTypes: true,
  validateFormats: true,
  unicodeRegExp: false,
});
addFormats(ajv);
// Blockception 拡張フォーマット（AJV 本家には無い）を空実装で登録して警告を消す
for (const fmt of ['molang', 'color-hex', 'colox-hex']) {
  ajv.addFormat(fmt, { validate: () => true });
}

function loadSchema(name) {
  const p = path.join(SCHEMAS_DIR, name);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`⚠️  schemas/${name} が読めません: ${e.message}`);
    return null;
  }
}

// ---- Blockception スキーマのローカルパッチ ----
// vendored ファイル本体は触らず、ロード時に必要な補完だけを加える。
// Blockception snapshot を更新しても衝突しない。
// 新しいパッチを足したい時は applyEntitySchemaPatches に追記する。
function applyEntitySchemaPatches(schema) {
  const defs = schema && schema.definitions;
  if (!defs) return;

  for (const def of Object.values(defs)) {
    if (!def || typeof def !== 'object') continue;

    // (1) components バッグ（pushable_by_entity を持つ definition）に
    //     legacy の minecraft:pushable を追加。
    //     Bedrock は今も受け入れるが Blockception schema は新しい split 形
    //     （pushable_by_block / pushable_by_entity）しか載せていない。
    if (def.properties &&
        def.properties['minecraft:pushable_by_entity'] &&
        !def.properties['minecraft:pushable']) {
      def.properties['minecraft:pushable'] = {
        type: 'object',
        additionalProperties: false,
        description: 'Legacy pushable (Blockception schema にまだ無いが Bedrock 実機で有効)',
        properties: {
          is_pushable: { type: 'boolean' },
          is_pushable_by_piston: { type: 'boolean' },
        },
      };
    }

    // (2) minecraft:behavior.circle_around_anchor の height_range を追加。
    //     phantom.json などの Vanilla サンプルで使われる正当なパラメータ
    //     だが Blockception schema に反映されていない。range 系は
    //     definitions.H（2 要素数値配列）と同じ形状で OK。
    if (def.title === 'Circle Around Anchor' &&
        def.properties &&
        !def.properties.height_range) {
      def.properties.height_range = {
        $ref: '#/definitions/H',
        description: 'Vertical range. Blockception 未追従のためローカル追加。',
      };
    }
  }
}

const schemaDefs = [
  { key: 'manifest', file: 'manifest.schema.json' },
  { key: 'entity',   file: 'entity.schema.json' },
  { key: 'dialogue', file: 'dialogue.schema.json' },
  { key: 'items',    file: 'items.schema.json' },
];

const validators = {};
for (const { key, file } of schemaDefs) {
  const schema = loadSchema(file);
  if (!schema) continue;
  if (key === 'entity') applyEntitySchemaPatches(schema);
  try {
    validators[key] = ajv.compile(schema);
  } catch (e) {
    console.error(`⚠️  ${file} のコンパイルに失敗: ${e.message}`);
  }
}

// ファイルパスから使うスキーマを決める（loot_tables/entities など紛らわしいパスを避けるため厳密マッチ）
function schemaForPath(relPath) {
  const p = relPath.replace(/\\/g, '/');
  if (/^src\/(BP|RP)\/manifest\.json$/.test(p)) return validators.manifest;
  if (/^src\/BP\/entities\/[^/]+\.json$/.test(p)) return validators.entity;
  if (/^src\/BP\/dialogue\/[^/]+\.json$/.test(p)) return validators.dialogue;
  if (/^src\/BP\/items\/[^/]+\.json$/.test(p)) return validators.items;
  return null;
}

// STRICT=1 でスキーマエラーも hard fail にする。デフォルトは警告のみ（スキーマ追従遅れの false positive を吸収）
const STRICT = process.env.STRICT === '1';

function findJSONFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findJSONFiles(full));
    else if (entry.name.endsWith('.json')) out.push(full);
  }
  return out;
}

function formatAjvErrors(errors, limit = 5) {
  return errors.slice(0, limit).map(e => {
    const where = e.instancePath || '(root)';
    const msg = e.message || 'invalid';
    const extra = e.params ? ' ' + JSON.stringify(e.params) : '';
    return `    at ${where} — ${msg}${extra}`;
  }).join('\n') + (errors.length > limit ? `\n    …(+${errors.length - limit} more)` : '');
}

const files = [
  ...findJSONFiles(path.join(ROOT, 'src/BP')),
  ...findJSONFiles(path.join(ROOT, 'src/RP')),
];

let parseFails = 0;
let schemaFails = 0;
let schemaChecked = 0;

for (const file of files) {
  const rel = path.relative(ROOT, file);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`❌ JSON parse: ${rel} — ${e.message}`);
    parseFails++;
    continue;
  }

  const validator = schemaForPath(rel);
  if (!validator) {
    console.log(`✅ ${rel} (parse only)`);
    continue;
  }

  schemaChecked++;
  const valid = validator(data);
  if (valid) {
    console.log(`✅ ${rel} (schema OK)`);
  } else {
    const mark = STRICT ? '❌' : '⚠️ ';
    const kind = STRICT ? 'schema' : 'schema (warning)';
    console.error(`${mark} ${kind}: ${rel}`);
    console.error(formatAjvErrors(validator.errors));
    schemaFails++;
  }
}

console.log(
  `\n${files.length} files checked — ${schemaChecked} against schema — ` +
  `parse errors: ${parseFails}, schema ${STRICT ? 'errors' : 'warnings'}: ${schemaFails}`
);

if (!STRICT && schemaFails > 0) {
  console.log('  （スキーマ警告は Blockception schema の追従遅れで出ている可能性があります。');
  console.log('   フル厳格モードで確認したい時は STRICT=1 npm run validate）');
}

const failed = parseFails > 0 || (STRICT && schemaFails > 0);
process.exit(failed ? 1 : 0);
