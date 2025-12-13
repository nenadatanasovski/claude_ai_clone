import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = features.filter(f => !f.passes);

console.log(`Total features: ${features.length}`);
console.log(`Passing: ${features.filter(f => f.passes).length}`);
console.log(`Failing: ${failing.length}`);
console.log('\nFirst 3 failing features:\n');

failing.slice(0, 3).forEach((f, i) => {
  console.log(`${i + 1}. ${f.description}`);
  console.log(`   Category: ${f.category}`);
  console.log(`   Steps: ${f.steps.length} steps`);
  console.log('');
});
