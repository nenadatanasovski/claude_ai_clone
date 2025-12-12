const fs = require('fs');
const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const feature = data.features.find(f => f.feature_id === 39);
console.log(JSON.stringify(feature, null, 2));
