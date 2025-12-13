import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));

console.log('Failing Features:');
console.log('=================\n');

features.forEach((f, i) => {
  if (!f.passes) {
    console.log(`Feature ${i + 1}: ${f.description}`);
  }
});

console.log(`\nTotal: ${features.filter(f => !f.passes).length} failing, ${features.filter(f => f.passes).length} passing`);
