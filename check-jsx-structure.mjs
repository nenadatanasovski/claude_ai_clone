import fs from 'fs';

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

// Check around line 8799
console.log('Lines 8793-8803:');
for (let i = 8792; i < 8803; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}

// Count divs in return statement
let inReturn = false;
let divCount = 0;
let returnLine = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('function App()')) {
    console.log('\nApp function starts at line', i + 1);
  }

  if (i > 3800 && line.trim().startsWith('return (')) {
    inReturn = true;
    returnLine = i + 1;
    console.log('\nMain return statement at line', returnLine);
  }

  if (inReturn) {
    const openDivs = (line.match(/<div/g) || []).length;
    const closeDivs = (line.match(/<\/div>/g) || []).length;
    divCount += openDivs - closeDivs;

    if (line.trim() === ')' && divCount === 0) {
      console.log('Return closes at line', i + 1);
      console.log('Total div balance:', divCount);
      break;
    }
  }
}
