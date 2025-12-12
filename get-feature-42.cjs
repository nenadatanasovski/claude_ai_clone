const fs = require('fs');
const data = JSON.parse(fs.readFileSync('feature_list.json'));

const feature = data[41]; // Index 41 = Feature #42
console.log('Feature #42: Edit user message');
console.log('Category:', feature.category);
console.log('\nTest Steps:');
feature.steps.forEach((step, i) => {
  console.log(`  ${step}`);
});
