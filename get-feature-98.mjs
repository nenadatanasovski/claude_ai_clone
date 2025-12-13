import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const feature = features.find(f => !f.passes);

if (feature) {
  console.log('Next Feature to Implement:');
  console.log('==========================\n');
  console.log(`Feature ID: ${features.indexOf(feature) + 1}`);
  console.log(`Category: ${feature.category}`);
  console.log(`Description: ${feature.description}\n`);
  console.log('Test Steps:');
  feature.steps.forEach((step, i) => {
    console.log(`  ${i + 1}. ${step}`);
  });
  console.log(`\nPasses: ${feature.passes}`);
}
