import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const feature143 = features[142]; // 0-indexed

console.log('Feature 143:');
console.log(JSON.stringify(feature143, null, 2));
