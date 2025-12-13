import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = features.filter(f => !f.passes);

console.log(`\nFAILING FEATURES ANALYSIS (${failing.length} total)\n${'='.repeat(60)}\n`);

failing.forEach((f, i) => {
  console.log(`\nFEATURE ${i + 1}: ${f.description}`);
  console.log(`Category: ${f.category}`);
  console.log(`\nTesting Steps:`);
  f.steps.forEach((s, j) => {
    console.log(`  ${s}`);
  });
  console.log('\n' + '-'.repeat(60));
});
