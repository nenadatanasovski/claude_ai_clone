const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./feature_list.json', 'utf8'));
const idx = data.findIndex(f => !f.passes);
if (idx !== -1) {
  console.log('Feature #' + (idx + 1) + ':', data[idx].description);
  console.log('Category:', data[idx].category);
  console.log('\nSteps:');
  data[idx].steps.forEach((step, i) => {
    console.log('  ' + step);
  });
} else {
  console.log('All features passing!');
}
