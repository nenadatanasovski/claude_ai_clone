import fs from 'fs';

const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = data.filter(f => !f.passes);

console.log('FAILING FEATURES:');
failing.forEach((f, i) => {
  const index = data.indexOf(f);
  console.log(`${i+1}. [Index ${index}] ${f.description}`);
});

console.log(`\nTotal: ${failing.length} failing, ${data.filter(f => f.passes).length} passing`);
