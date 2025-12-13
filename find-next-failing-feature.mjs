import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = features.filter(f => !f.passes);

console.log(`Total failing features: ${failing.length}`);
console.log('\nFirst 5 failing features:');
failing.slice(0, 5).forEach((f, i) => {
  const index = features.indexOf(f) + 1;
  console.log(`${i+1}. Feature #${index}: ${f.description}`);
  console.log(`   Category: ${f.category}, Steps: ${f.steps.length}`);
});

console.log('\n--- NEXT FEATURE TO IMPLEMENT ---');
const next = failing[0];
const nextIndex = features.indexOf(next) + 1;
console.log(`Feature #${nextIndex}: ${next.description}`);
console.log(`Category: ${next.category}`);
console.log('\nTest Steps:');
next.steps.forEach((step, i) => {
  console.log(`${i+1}. ${step}`);
});
