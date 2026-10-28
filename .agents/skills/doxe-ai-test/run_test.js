// .agents/skills/doxe-ai-test/run_test.js
const { spawn } = require('child_process');
const path = require('path');

// Resolve path to the existing test script
const testFile = path.resolve(__dirname, '../../backend/test_assistant.js');

const child = spawn('node', [testFile], { stdio: 'inherit' });

child.on('close', (code) => {
  process.exit(code);
});
