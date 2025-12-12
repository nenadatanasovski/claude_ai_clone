const fs = require('fs');
const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = data.filter(f => !f.passes);
if (failing.length > 0) {
  console.log('Feature #' + (data.indexOf(failing[0]) + 1) + ': ' + failing[0].description);
  console.log('\nSteps:');
  failing[0].steps.forEach(step => console.log('  ' + step));
  console.log('\nCategory:', failing[0].category);
} else {
  console.log('No failing features found!');
}
