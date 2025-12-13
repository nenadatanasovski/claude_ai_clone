import fs from 'fs';
const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
console.log(JSON.stringify(data[156], null, 2));
