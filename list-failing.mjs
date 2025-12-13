import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = features.filter(f => !f.passes);

console.log(`FAILING FEATURES (${failing.length}/175):\n`);
failing.forEach((f, i) => {
  const featureIndex = features.indexOf(f);
  console.log(`${i+1}. Feature #${featureIndex}: ${f.description}`);
  console.log(`   Steps: ${f.steps.length} steps`);
  console.log('');
});
