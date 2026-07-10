const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('Game.jsx'));

for (let file of files) {
  const filePath = path.join(srcDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove the one we mistakenly added before (which resulted in duplicate disabled props)
  content = content.replace(/disabled=\{Number\(balance\) <= 0\} /g, '');

  // Now properly add it to the existing disabled prop of the bet amount input
  let lines = content.split('\n');
  let inInput = false;
  let isBetInput = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Simple heuristic: if we are near value={betAmount} and see a disabled prop, update it
    let windowSlice = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 3)).join(' ');
    if (windowSlice.includes('value={betAmount}') && line.includes('disabled={')) {
       if (!line.includes('Number(balance) <= 0')) {
          lines[i] = line.replace(/disabled=\{/, 'disabled={Number(balance) <= 0 || ');
       }
    }
  }

  content = lines.join('\n');
  fs.writeFileSync(filePath, content);
  console.log('Fixed', file);
}
