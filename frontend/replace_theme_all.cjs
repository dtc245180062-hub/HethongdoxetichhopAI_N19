const fs = require('fs');
const path = require('path');

const filesToProcess = [
  'd:/DoXeAI/frontend/src/App.jsx',
  'd:/DoXeAI/frontend/src/components/Sidebar.jsx',
  'd:/DoXeAI/frontend/src/components/Login.jsx'
];

const replacements = [
  ['bg-white/90', 'bg-slate-900/90'],
  ['bg-white/60', 'bg-slate-900/60'],
  ['bg-white', 'bg-slate-900'],
  ['bg-slate-50/70', 'bg-slate-950/70'],
  ['bg-slate-50/40', 'bg-slate-950/40'],
  ['bg-slate-50', 'bg-slate-950'],
  ['bg-slate-100/80', 'bg-slate-800/80'],
  ['bg-slate-100/60', 'bg-slate-800/60'],
  ['bg-slate-100', 'bg-slate-800'],
  ['bg-slate-200/80', 'bg-slate-800/80'],
  ['bg-slate-200', 'bg-slate-800'],
  ['border-slate-200/80', 'border-slate-800/80'],
  ['border-slate-200', 'border-slate-800'],
  ['border-slate-300', 'border-slate-700'],
  ['text-slate-900', 'text-slate-100'],
  ['text-slate-800', 'text-slate-200'],
  ['text-slate-700', 'text-slate-300'],
  ['text-slate-600', 'text-slate-400'],
  ['hover:bg-slate-100', 'hover:bg-slate-800'],
  ['hover:bg-slate-200/80', 'hover:bg-slate-700/80'],
  ['hover:bg-slate-200', 'hover:bg-slate-700'],
  ['hover:text-slate-900', 'hover:text-slate-100']
];

for (const filePath of filesToProcess) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [find, replace] of replacements) {
      content = content.split(find).join(replace);
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', filePath);
  }
}
