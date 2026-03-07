/**
 * Start dev servers for E2E testing
 * Cross-platform alternative to shell commands with &
 */
const { spawn } = require('child_process');
const path = require('path');

const isWindows = process.platform === 'win32';

console.log('Starting E2E test servers...');

// Start API server
const apiServer = spawn('pnpm', ['--filter', '@ev/api', 'dev'], {
  stdio: 'inherit',
  shell: isWindows,
  cwd: path.resolve(__dirname, '..'),
});

console.log('API server starting on http://127.0.0.1:8787');

// Wait a bit for API to start, then start web server
setTimeout(() => {
  console.log('Starting web dev server on http://localhost:3000');

  const webServer = spawn('pnpm', ['dev'], {
    stdio: 'inherit',
    shell: isWindows,
    cwd: path.resolve(__dirname, '../apps/web'),
  });

  // Handle cleanup
  const cleanup = () => {
    console.log('\nShutting down servers...');
    apiServer.kill();
    webServer.kill();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
}, 10000);

// Handle cleanup for API server only
process.on('SIGINT', () => {
  apiServer.kill();
  process.exit(0);
});
