const fs = require('fs');
const data = JSON.parse(fs.readFileSync('feature_list.json'));

console.log('Looking for first failing feature after #41...\n');

data.forEach((f, i) => {
  if (i >= 40 && i <= 50) {
    console.log(`#${i + 1}: ${f.description} - passes: ${f.passes}`);
  }
});
