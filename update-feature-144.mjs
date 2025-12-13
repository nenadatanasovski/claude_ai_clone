import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
features[143].passes = true; // Feature 144 (0-indexed)

fs.writeFileSync('feature_list.json', JSON.stringify(features, null, 2));
console.log('✓ Feature 144 marked as passing');
