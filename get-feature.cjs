const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./feature_list.json', 'utf8'));
console.log(JSON.stringify(data[77], null, 2));
console.log('\nTotal passing:', data.filter(f => f.passes).length, '/', data.length);
