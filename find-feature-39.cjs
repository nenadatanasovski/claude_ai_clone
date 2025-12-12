const fs = require('fs');
const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const feature = features[38]; // Feature #39 is at index 38
console.log(JSON.stringify(feature, null, 2));
