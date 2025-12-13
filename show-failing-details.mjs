import fs from 'fs';

const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = data.filter(f => !f.passes);

console.log('=== FAILING FEATURES DETAILS ===\n');
failing.forEach((f, i) => {
  const index = data.indexOf(f);
  console.log(`${i+1}. Feature #${index}: ${f.description}`);
  console.log(`   Category: ${f.category}`);
  console.log(`   Steps:`);
  f.steps.forEach((step, si) => {
    console.log(`     ${si + 1}. ${step}`);
  });
  console.log('');
});
