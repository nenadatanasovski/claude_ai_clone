import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = features.filter(f => !f.passes);

console.log('FAILING FEATURES:\n');
failing.forEach((f, i) => {
  console.log(`\n=== FEATURE ${i+1} ===`);
  console.log('Description:', f.description);
  console.log('Category:', f.category);
  console.log('\nSteps:');
  f.steps.forEach((step, j) => {
    console.log(`  ${step}`);
  });
});
