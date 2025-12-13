import fs from 'fs';

const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = data.map((f, i) => ({ index: i, ...f })).filter(f => !f.passes);

console.log('FAILING FEATURES:', failing.length);
failing.forEach(f => {
  console.log(`\n[${f.index}] ${f.description}`);
  console.log(`Steps: ${f.steps.length}`);
});
