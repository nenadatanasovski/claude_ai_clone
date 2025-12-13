import fs from 'fs';

const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = features.filter(f => !f.passes);

console.log('FAILING FEATURES ANALYSIS:\n');
console.log(`Total: ${failing.length} features\n`);

// Group by category
const byCategory = failing.reduce((acc, f) => {
  const cat = f.category || 'unknown';
  if (!acc[cat]) acc[cat] = [];
  acc[cat].push(f);
  return acc;
}, {});

Object.keys(byCategory).forEach(cat => {
  console.log(`\n${cat.toUpperCase()} (${byCategory[cat].length}):`);
  byCategory[cat].forEach((f, i) => {
    console.log(`  ${i+1}. ${f.description}`);
    console.log(`     Steps: ${f.steps.length} steps`);
  });
});
