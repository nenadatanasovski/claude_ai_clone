import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = features.filter(f => !f.passes);

console.log(`FAILING FEATURES (${failing.length}/175):\n`);
failing.forEach((f, i) => {
  console.log(`${i+1}. Feature #${f.id}: ${f.description}`);
});
