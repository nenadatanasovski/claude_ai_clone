import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const feature144 = features[143]; // 0-indexed

console.log('Feature 144:');
console.log(JSON.stringify(feature144, null, 2));
