import fs from 'fs';
const data = JSON.parse(fs.readFileSync('./feature_list.json', 'utf8'));

const failing = data.filter(f => !f.passes);
console.log(`Total features: ${data.length}`);
console.log(`Passing: ${data.filter(f => f.passes).length}`);
console.log(`Failing: ${failing.length}`);
console.log('\nNext 5 failing features:');
failing.slice(0, 5).forEach((f, i) => {
  const index = data.indexOf(f);
  console.log(`${i+1}. Feature #${index + 1}: ${f.description}`);
});
