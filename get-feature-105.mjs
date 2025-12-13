import fs from 'fs';
const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const feature = features[104]; // Feature #105 (0-indexed)
console.log('Feature #105:', feature.description);
console.log('Category:', feature.category);
console.log('Passes:', feature.passes);
console.log('\nSteps:');
feature.steps.forEach((step, i) => {
  console.log(`${i + 1}. ${step}`);
});
