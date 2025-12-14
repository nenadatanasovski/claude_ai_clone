import fs from 'fs';

const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const total = data.length;
const passing = data.filter(f => f.passes === true).length;
const failing = data.filter(f => f.passes === false).length;

console.log('Total:', total);
console.log('Passing:', passing);
console.log('Failing:', failing);
console.log('Percentage:', ((passing/total)*100).toFixed(2) + '%');

if (failing > 0) {
  console.log('\nFailing features:');
  data.filter(f => f.passes === false).forEach((f, i) => {
    console.log(`${i + 1}. ${f.description}`);
  });
}
