const fs = require('fs');
const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = features.filter(f => !f.passes);
console.log('Next 10 failing features:\n');
failing.slice(0, 10).forEach((f, idx) => {
  const featureNum = features.indexOf(f) + 1;
  console.log(`${featureNum}. ${f.description}`);
});
console.log(`\nTotal: ${failing.length} failing features remaining`);
