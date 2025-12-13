import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = features.filter(f => !f.passes);

if (failing.length === 0) {
  console.log('All features passing!');
} else {
  const firstFailing = failing[0];
  const index = features.indexOf(firstFailing);
  console.log('First failing feature:');
  console.log('Index:', index);
  console.log('Category:', firstFailing.category);
  console.log('Description:', firstFailing.description);
  console.log('\nSteps:');
  firstFailing.steps.forEach(s => console.log('  -', s));
}
