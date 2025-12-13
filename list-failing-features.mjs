import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = features.filter(f => !f.passes);

console.log('Remaining failing features:', failing.length);
console.log('');
failing.forEach((f, i) => {
  const featureNum = features.indexOf(f) + 1;
  console.log(`${i + 1}. [Feature ${featureNum}] ${f.description}`);
});
