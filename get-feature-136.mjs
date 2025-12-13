import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const feature136 = features[135]; // 0-indexed

console.log('Feature 136:');
console.log(JSON.stringify(feature136, null, 2));
