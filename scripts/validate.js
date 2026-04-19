const fs = require('fs');
const path = require('path');

function findJSONFiles(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findJSONFiles(full));
    } else if (entry.name.endsWith('.json')) {
      results.push(full);
    }
  }
  return results;
}

let allValid = true;
const files = [...findJSONFiles('./src/BP'), ...findJSONFiles('./src/RP')];

for (const file of files) {
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`✅ ${file}`);
  } catch (e) {
    console.error(`❌ ${file} — ${e.message}`);
    allValid = false;
  }
}

console.log(`\n${files.length} files checked.`);
process.exit(allValid ? 0 : 1);
