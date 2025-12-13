import fs from 'fs';
const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const passing = features.filter(f => f.passes).length;
const total = features.length;
const percentage = ((passing / total) * 100).toFixed(2);
console.log(`Progress: ${passing}/${total} features (${percentage}%)`);
console.log(`Remaining: ${total - passing} features`);
