const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('Game.jsx'));

for (let file of files) {
  const filePath = path.join(srcDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Add balance to useWallet destructuring if it's not there
  if (!content.includes('const { fetchBalance, balance } = useWallet();')) {
    content = content.replace(
      /const \{ fetchBalance \} = useWallet\(\);/g,
      'const { fetchBalance, balance } = useWallet();'
    );
  }
  
  if (!content.includes('disabled={Number(balance) <= 0}')) {
    // Add disabled attribute to the input that handles betAmount
    // We match `<input ... value={betAmount}`
    content = content.replace(
      /(<input[^>]*)(value=\{betAmount\})/g,
      '$1disabled={Number(balance) <= 0} $2'
    );
  }

  fs.writeFileSync(filePath, content);
  console.log('Updated', file);
}
