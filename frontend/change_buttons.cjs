const fs = require('fs');
const path = 'd:/DoXeAI/frontend/src/components/GateControl.jsx';

let content = fs.readFileSync(path, 'utf8');

// Replace emerald buttons
content = content.replace(/bg-emerald-600 hover:bg-emerald-500 text-slate-900(.*?)shadow-emerald-600\/30/g, 'bg-slate-900 hover:bg-slate-800 text-white$1shadow-slate-900/30');

// Replace cyan buttons
content = content.replace(/bg-cyan-600 hover:bg-cyan-500 text-white(.*?)shadow-cyan-600\/30/g, 'bg-slate-900 hover:bg-slate-800 text-white$1shadow-slate-900/30');

// Fix text-slate-900 for the emerald buttons to text-white if they didn't have it exactly like that
content = content.replace(/bg-emerald-600 hover:bg-emerald-500(.*?)shadow-emerald-600\/30/g, 'bg-slate-900 hover:bg-slate-800$1shadow-slate-900/30');

fs.writeFileSync(path, content, 'utf8');
console.log('Button theme replacement complete.');
