import fs from 'fs';
const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failingFeature = features.find(f => !f.passes);
if (failingFeature) {
  const index = features.indexOf(failingFeature);
  console.log(`Feature #${index + 1} (index ${index}): ${failingFeature.description}`);
  console.log('\nSteps:');
  failingFeature.steps.forEach((step, i) => console.log(`  ${step}`));
  console.log('\nCategory:', failingFeature.category);
} else {
  console.log('All features passing!');
}
