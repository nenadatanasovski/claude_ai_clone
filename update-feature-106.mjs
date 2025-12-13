import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));

// Find feature 106 (index 105)
const feature = features[105];
console.log('Feature #106:', feature.description);
console.log('Current status:', feature.passes);

// Update to passing
feature.passes = true;

// Write back
fs.writeFileSync('feature_list.json', JSON.stringify(features, null, 2));
console.log('✅ Updated feature #106 to passing!');
