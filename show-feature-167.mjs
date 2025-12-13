import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
console.log(JSON.stringify(features[167], null, 2));
