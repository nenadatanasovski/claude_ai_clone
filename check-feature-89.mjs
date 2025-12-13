import fs from 'fs';

const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const idx = 88; // Feature #89 (0-indexed)

console.log('Feature #' + (idx + 1) + ':', data[idx].description);
console.log('Steps:', data[idx].steps);
console.log('Current passes:', data[idx].passes);
