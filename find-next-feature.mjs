import fs from 'fs';

const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = data.findIndex(f => f.passes === false);

console.log('First failing feature index:', failing);
if (failing !== -1) {
  console.log('Feature #' + (failing + 1) + ':', data[failing].description);
  console.log('\nSteps:');
  data[failing].steps.forEach(step => console.log('  ' + step));
  console.log('\nTotal passing:', data.filter(f => f.passes).length, '/', data.length);
}
