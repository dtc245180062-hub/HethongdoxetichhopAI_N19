const fs = require('fs');
const path = require('path');

const filesToProcess = [
  'd:/DoXeAI/frontend/src/App.jsx',
  'd:/DoXeAI/frontend/src/components/Sidebar.jsx',
  'd:/DoXeAI/frontend/src/components/Login.jsx',
  'd:/DoXeAI/frontend/src/components/GateControl.jsx'
];

const reverseReplacements = [
  ['bg-slate-900/90', 'bg-white/90'],
  ['bg-slate-900/60', 'bg-white/60'],
  ['bg-slate-900', 'bg-white'],
  ['bg-slate-950/70', 'bg-slate-50/70'],
  ['bg-slate-950/40', 'bg-slate-50/40'],
  ['bg-slate-950', 'bg-slate-50'],
  ['bg-slate-800/80', 'bg-slate-100/80'],
  ['bg-slate-800/60', 'bg-slate-100/60'],
  ['bg-slate-800', 'bg-slate-100'],
  ['border-slate-800/80', 'border-slate-200/80'],
  ['border-slate-800/50', 'border-emerald-200'], // Wait, these border-x-800/50 were mapped from multiple colors. Let's just restore them correctly based on context, or use border-slate-200 for now. Actually, let's restore border-x-800/50 to border-x-200.
  ['border-emerald-800/50', 'border-emerald-200'],
  ['border-blue-800/50', 'border-blue-200'],
  ['border-amber-800/50', 'border-amber-200'],
  ['border-rose-800/50', 'border-rose-200'],
  ['border-slate-800', 'border-slate-200'],
  ['border-slate-700', 'border-slate-300'],
  ['text-slate-100', 'text-slate-900'],
  ['text-slate-200', 'text-slate-800'],
  ['text-slate-300', 'text-slate-700'],
  ['text-slate-400', 'text-slate-600'],
  ['bg-emerald-950/40', 'bg-emerald-50/40'],
  ['bg-blue-950/40', 'bg-blue-50/40'],
  ['bg-cyan-950/40', 'bg-cyan-50/40'],
  ['bg-rose-950/40', 'bg-rose-50/40'],
  ['hover:bg-slate-800', 'hover:bg-slate-100'],
  ['hover:bg-slate-700/80', 'hover:bg-slate-200/80'],
  ['hover:bg-slate-700', 'hover:bg-slate-200'],
  ['hover:text-slate-100', 'hover:text-slate-900'],
  ['hover:bg-amber-950/40', 'hover:bg-amber-50/40'],
  ['bg-amber-950/40', 'bg-amber-50'],
  ['bg-rose-950/40', 'bg-rose-50'],
];

for (const filePath of filesToProcess) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [find, replace] of reverseReplacements) {
      content = content.split(find).join(replace);
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Reverted theme in', filePath);
  }
}
