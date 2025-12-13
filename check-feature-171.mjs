import fs from 'fs';
const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const f = data.features.find(f => f.description && f.description.includes('settings customization'));
console.log(JSON.stringify(f, null, 2));
