import fs from 'fs';

const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const feature = data.features.find(f => f.id === 158);
console.log(JSON.stringify(feature, null, 2));
