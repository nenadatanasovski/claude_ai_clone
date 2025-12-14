import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));

features.forEach((f, i) => {
  if (!f.passes) {
    console.log(`\nFeature ${i + 1}: ${f.description}`);
    console.log('Steps:');
    f.steps.forEach((step, j) => {
      console.log(`  ${j + 1}. ${step}`);
    });
  }
});
