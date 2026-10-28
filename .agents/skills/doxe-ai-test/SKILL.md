# DoXeAI Test Skill

## Overview
This skill runs the end‑to‑end test suite for the AI Assistant backend (`backend/test_assistant.js`). It executes two primary use‑cases:
- **UC‑12**: Find the peak traffic time.
- **UC‑13**: Generate a daily revenue report.

## Usage
```bash
agy run skill doxy-ai-test
```
The command will start the backend (if needed) and run the Node test script, printing the results.

## Implementation
The skill points to a small wrapper script that spawns the existing test file:
```javascript
// .agents/skills/doxe-ai-test/run_test.js
const { spawn } = require('child_process');
const path = require('path');

const testFile = path.resolve(__dirname, '../../backend/test_assistant.js');
const child = spawn('node', [testFile], { stdio: 'inherit' });

child.on('close', (code) => {
  process.exit(code);
});
```
Antigravity will execute `run_test.js` when the skill is invoked.

## Expected Output
```
=== KIỂM THỬ AI ASSISTANT API ===

1. Test UC‑12 (Khung giờ cao điểm):
Topic: <topic>
Summary: <summary>

2. Test UC‑13 (Báo cáo doanh thu):
Topic: <topic>
Summary: <summary>
```
If any API call fails, the script exits with a non‑zero code.

## Dependencies
- Node.js (>=14)
- Backend reachable at the URL configured in `backend/test_assistant.js`.

---

Created by the DoXeAI development team.
