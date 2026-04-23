const fs = require('fs');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const bp = JSON.parse(fs.readFileSync('./src/BP/manifest.json', 'utf8'));
const rp = JSON.parse(fs.readFileSync('./src/RP/manifest.json', 'utf8'));

let ok = true;

function check(label, uuid) {
  if (!UUID_RE.test(uuid)) {
    console.error(`❌ ${label}: "${uuid}" is not a valid UUID`);
    ok = false;
  } else {
    console.log(`✅ ${label}: ${uuid}`);
  }
}

check('BP header', bp.header.uuid);
check('BP module', bp.modules[0].uuid);
check('RP header', rp.header.uuid);
check('RP module', rp.modules[0].uuid);

// BP の dependency が RP header UUID を指しているか
if (bp.dependencies && bp.dependencies.length > 0) {
  const dep = bp.dependencies[0];
  if (dep.uuid === rp.header.uuid) {
    console.log(`✅ BP dependency → RP header UUID 一致`);
  } else {
    console.error(`❌ BP dependency UUID (${dep.uuid}) ≠ RP header UUID (${rp.header.uuid})`);
    ok = false;
  }
  // バージョンも揃っていないと、Bedrock はワールド起動時に RP を解決できない
  const depVer = (dep.version || []).join('.');
  const rpVer = (rp.header.version || []).join('.');
  if (depVer === rpVer) {
    console.log(`✅ BP dependency version (${depVer}) = RP header version`);
  } else {
    console.error(`❌ BP dependency version (${depVer}) ≠ RP header version (${rpVer})`);
    ok = false;
  }
}

// BP / RP 自身の header と modules の version も揃っていること
function checkInternalVersions(label, m) {
  const headerVer = (m.header.version || []).join('.');
  for (const mod of (m.modules || [])) {
    const modVer = (mod.version || []).join('.');
    if (headerVer !== modVer) {
      console.error(`❌ ${label}: header version (${headerVer}) ≠ modules version (${modVer})`);
      ok = false;
    }
  }
}
checkInternalVersions('BP', bp);
checkInternalVersions('RP', rp);

// 全 UUID の重複チェック
const allUuids = [bp.header.uuid, bp.modules[0].uuid, rp.header.uuid, rp.modules[0].uuid];
const unique = new Set(allUuids.map(u => u.toLowerCase()));
if (unique.size !== allUuids.length) {
  console.error('❌ UUID に重複があります');
  ok = false;
} else {
  console.log('✅ UUID 重複なし');
}

process.exit(ok ? 0 : 1);
