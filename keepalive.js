const { spawn } = require('child_process');
const path = require('path');

const serverCmd = 'npx';
const serverArgs = ['next', 'dev', '-p', '3000'];

function startServer() {
  console.log('Starting Next.js dev server...');
  const child = spawn(serverCmd, serverArgs, {
    cwd: path.join(__dirname),
    stdio: 'inherit',
    env: { ...process.env },
  });

  child.on('exit', (code) => {
    console.log(`Server exited with code ${code}, restarting in 2s...`);
    setTimeout(startServer, 2000);
  });

  child.on('error', (err) => {
    console.error('Server error:', err);
    setTimeout(startServer, 2000);
  });
}

startServer();
