import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const feature = features[159]; // 0-indexed, so feature 160 is at index 159

if (feature) {
  console.log(`Feature #160: ${feature.description}`);
  console.log(`Category: ${feature.category}`);
  console.log(`Passes: ${feature.passes}`);
  console.log('\nSteps:');
  feature.steps.forEach((step, i) => {
    console.log(`${i + 1}. ${step}`);
  });
} else {
  console.log('Feature not found');
}
