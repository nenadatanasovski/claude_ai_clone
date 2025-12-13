import fs from 'fs';

const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const feature = data[159];

console.log('=== FEATURE 159 ANALYSIS ===\n');
console.log(`Description: ${feature.description}`);
console.log(`Category: ${feature.category}`);
console.log(`Currently passes: ${feature.passes}`);
console.log('\nSteps:');
feature.steps.forEach((step, i) => {
  console.log(`  ${i + 1}. ${step}`);
});
