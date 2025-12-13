import fs from 'fs';

const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = data
  .map((f, i) => ({ index: i + 1, desc: f.description, passes: f.passes }))
  .filter(f => !f.passes);

console.log('Failing tests:');
failing.forEach(f => {
  console.log(`${f.index}. ${f.desc}`);
});
console.log(`\nTotal: ${failing.length} failing tests`);
