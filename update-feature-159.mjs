import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));

// Feature 159 is at index 158 (0-based)
const feature159 = features[158];

console.log('Feature 159 current status:');
console.log('Description:', feature159.description);
console.log('Passes:', feature159.passes);

// Update to passing
feature159.passes = true;
features[158] = feature159;

// Write back
fs.writeFileSync('feature_list.json', JSON.stringify(features, null, 2));

console.log('\nFeature 159 updated to: passes = true');
