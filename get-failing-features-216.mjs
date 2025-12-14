import fs from 'fs';

const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));

console.log('FAILING FEATURES DETAILS:\n');
data.forEach((f, i) => {
  if (!f.passes) {
    console.log(`\n========== Feature ${i+1} ==========`);
    console.log(`Description: ${f.description}`);
    console.log(`Category: ${f.category}`);
    console.log(`Steps:`);
    f.steps.forEach((step, j) => {
      console.log(`  ${step}`);
    });
  }
});
