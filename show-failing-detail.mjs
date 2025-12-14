import fs from 'fs';

const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
data.forEach((f, i) => {
  if (!f.passes) {
    console.log(`\n========== Feature ${i + 1} ==========`);
    console.log(`Description: ${f.description}`);
    console.log(`Category: ${f.category}`);
    console.log('\nSteps:');
    f.steps.forEach((step, idx) => {
      console.log(`  ${idx + 1}. ${step}`);
    });
  }
});
