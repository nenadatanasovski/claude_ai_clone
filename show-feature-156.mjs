import fs from 'fs';

const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const feature = data[156];

console.log(`Feature 156: ${feature.description}`);
console.log(`Category: ${feature.category}`);
console.log(`Passes: ${feature.passes}`);
console.log(`\nSteps:`);
feature.steps.forEach((step, i) => {
  console.log(`${i + 1}. ${step}`);
});
