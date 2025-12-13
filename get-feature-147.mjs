import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const feature147 = features[146]; // 0-indexed

console.log('Feature 147:');
console.log(JSON.stringify(feature147, null, 2));
