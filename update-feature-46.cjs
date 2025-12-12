const fs = require('fs');
const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));

// Update Feature #46 (index 45) to passing
data[45].passes = true;

// Write back to file
fs.writeFileSync('feature_list.json', JSON.stringify(data, null, 2));
console.log('Updated Feature #46 to passes: true');
