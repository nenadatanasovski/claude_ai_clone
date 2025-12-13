import fs from 'fs';

const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const passing = data.filter(f => f.passes === true).slice(0, 10);
console.log(JSON.stringify(passing, null, 2));
