import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));

// Update feature 136 (index 135)
features[135].passes = true;

fs.writeFileSync('feature_list.json', JSON.stringify(features, null, 2));

console.log('Feature 136 marked as passing!');
console.log('Total passing:', features.filter(f => f.passes).length);
console.log('Total failing:', features.filter(f => !f.passes).length);
