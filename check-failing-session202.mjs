import fs from 'fs';

const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = data.filter(f => !f.passes);

console.log('FAILING FEATURES (' + failing.length + ' total):\n');
failing.forEach((f, i) => {
  console.log((i+1) + '. ' + f.description);
  console.log('   Category: ' + f.category);
  console.log('   First step: ' + f.steps[0]);
  console.log('');
});
