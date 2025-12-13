import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
features[146].passes = true; // Update Feature 147 (index 146)

fs.writeFileSync('feature_list.json', JSON.stringify(features, null, 2));
console.log('Feature 147 marked as passing!');
