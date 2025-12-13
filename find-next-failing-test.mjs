import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = features.find(f => !f.passes);

if (failing) {
  const index = features.indexOf(failing) + 1;
  console.log(`Feature #${index}: ${failing.description}`);
  console.log(`Category: ${failing.category}`);
  console.log('\nSteps:');
  failing.steps.forEach((s, i) => console.log(`  ${s}`));
} else {
  console.log('All features are passing!');
}
