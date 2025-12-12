import fs from 'fs';
const data = JSON.parse(fs.readFileSync('./feature_list.json', 'utf8'));

// Get feature 75 (index 74)
const feature75 = data[74];
console.log('Feature #75:');
console.log(JSON.stringify(feature75, null, 2));
