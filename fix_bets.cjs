const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const backendGamesDir = path.join(__dirname, 'backend', 'src', 'modules', 'games');

// Update frontend Game components
fs.readdirSync(srcDir).forEach(file => {
  if (file.endsWith('Game.jsx')) {
    const filePath = path.join(srcDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace amount <= 0 with amount < 0 in validation logic
    content = content.replace(/amount <= 0/g, 'amount < 0');
    content = content.replace(/parseFloat\(betAmount\) <= 0/g, 'parseFloat(betAmount) < 0');
    content = content.replace(/Number\(betAmount\) <= 0/g, 'Number(betAmount) < 0');
    
    fs.writeFileSync(filePath, content);
  }
});

// Update backend services and routes
if (fs.existsSync(backendGamesDir)) {
  fs.readdirSync(backendGamesDir).forEach(game => {
    const gameDir = path.join(backendGamesDir, game);
    if (!fs.statSync(gameDir).isDirectory()) return;

    // Routes
    const routeFile = path.join(gameDir, `${game}.routes.js`);
    if (fs.existsSync(routeFile)) {
      let content = fs.readFileSync(routeFile, 'utf8');
      content = content.replace(/exclusiveMinimum:\s*0/g, 'minimum: 0');
      fs.writeFileSync(routeFile, content);
    }

    // Services
    const serviceFile = path.join(gameDir, `${game}.service.js`);
    if (fs.existsSync(serviceFile)) {
      let content = fs.readFileSync(serviceFile, 'utf8');
      content = content.replace(/amount <= 0/g, 'amount < 0');
      // Fix minimum bet checking to ignore if amount is exactly 0
      content = content.replace(/if\s*\(\s*amount < Number\(game\.minBet\)\s*\)/g, 'if (amount > 0 && amount < Number(game.minBet))');
      fs.writeFileSync(serviceFile, content);
    }
  });
}
console.log('Done bulk update');
