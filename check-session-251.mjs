import fs from 'fs';

const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
console.log('Total features:', data.length);
console.log('Passing:', data.filter(f => f.passes).length);
console.log('Failing:', data.filter(f => !f.passes).length);

const failing = data.filter(f => !f.passes);
if (failing.length > 0) {
  console.log('\nFailing features:');
  failing.forEach((f, i) => {
    console.log(`${i + 1}. ${f.description}`);
  });
}
