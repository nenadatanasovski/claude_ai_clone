import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = features.filter(f => !f.passes);

failing.forEach((f, i) => {
  const featureIndex = features.indexOf(f);
  console.log(`\n=== FEATURE #${featureIndex}: ${f.description} ===`);
  console.log(`Category: ${f.category}`);
  console.log(`\nSteps (${f.steps.length} total):\n`);
  f.steps.forEach((step, idx) => {
    console.log(`  ${idx + 1}. ${step}`);
  });
  console.log('\n' + '='.repeat(80));
});
