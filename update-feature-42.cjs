const fs = require('fs');
const data = JSON.parse(fs.readFileSync('feature_list.json'));

// Feature #42 is at index 41
const feature42 = data[41];

console.log('Feature #42 before update:');
console.log(`  Description: ${feature42.description}`);
console.log(`  Passes: ${feature42.passes}`);

// Update to passing
data[41].passes = true;

// Write back
fs.writeFileSync('feature_list.json', JSON.stringify(data, null, 2));

console.log('\nFeature #42 updated to passes: true');
console.log('\nUpdated feature:');
console.log(`  Description: ${data[41].description}`);
console.log(`  Passes: ${data[41].passes}`);
