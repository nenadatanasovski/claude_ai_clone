const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./feature_list.json', 'utf8'));
const passing = data.filter(f => f.passes).length;
const total = data.length;
console.log('Progress:', passing, '/', total);
console.log('\nNext failing feature:');
const failing = data.find(f => !f.passes);
if (failing) {
  console.log('Description:', failing.description);
  console.log('\nSteps:');
  failing.steps.forEach((s, i) => console.log(`  ${i+1}. ${s}`));
}
