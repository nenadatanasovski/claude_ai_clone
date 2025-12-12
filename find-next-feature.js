const fs = require('fs');
const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const firstFailing = data.findIndex(f => !f.passes);
console.log('First failing feature index:', firstFailing);
console.log('Feature:', JSON.stringify(data[firstFailing], null, 2));
