import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = features.find(f => !f.passes);

if (failing) {
  const index = features.indexOf(failing);
  console.log('Feature #' + (index + 1) + ': ' + failing.description);
  console.log('\nSteps:');
  failing.steps.forEach(step => console.log('  ' + step));
  console.log('\nCategory:', failing.category);
} else {
  console.log('No failing features found! All tests passing!');
}
