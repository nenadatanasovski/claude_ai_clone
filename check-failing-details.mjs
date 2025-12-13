import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = features.filter(f => !f.passes);

console.log(`\nFAILING FEATURES (${failing.length}/175):\n`);
failing.forEach((f, i) => {
  const index = features.indexOf(f);
  console.log(`\n${i+1}. Feature #${index+1}: ${f.description}`);
  console.log(`   Category: ${f.category}`);
  console.log(`   Steps: ${f.steps.length} steps`);
  if (f.steps.length > 0) {
    console.log(`   First step: ${f.steps[0]}`);
    console.log(`   Last step: ${f.steps[f.steps.length - 1]}`);
  }
});
