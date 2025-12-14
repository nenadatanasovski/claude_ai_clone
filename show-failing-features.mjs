import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = features.filter(f => !f.passes);

console.log(`\n=== FAILING FEATURES (${failing.length}) ===\n`);

failing.forEach((f, idx) => {
  console.log(`Feature ${idx + 1}: ${f.description}`);
  console.log(`  Testing steps: ${f.steps.length}`);
  console.log(`  Steps:`);
  f.steps.slice(0, 5).forEach((step, i) => {
    console.log(`    ${step}`);
  });
  if (f.steps.length > 5) {
    console.log(`    ... and ${f.steps.length - 5} more steps`);
  }
  console.log('');
});
