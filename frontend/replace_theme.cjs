const fs = require('fs');
const path = 'd:/DoXeAI/frontend/src/components/GateControl.jsx';

let content = fs.readFileSync(path, 'utf8');

// The order matters (longer strings first)
const replacements = [
  ['bg-white/90', 'bg-slate-900/90'],
  ['bg-white/60', 'bg-slate-900/60'],
  ['bg-white', 'bg-slate-900'],
  ['bg-slate-50/70', 'bg-slate-950/70'],
  ['bg-slate-50/40', 'bg-slate-950/40'],
  ['bg-slate-50', 'bg-slate-950'],
  ['bg-slate-100/60', 'bg-slate-800/60'],
  ['bg-slate-100', 'bg-slate-800'],
  ['bg-slate-200', 'bg-slate-800'],
  ['border-slate-200', 'border-slate-800'],
  ['border-slate-300', 'border-slate-700'],
  ['text-slate-900', 'text-slate-100'],
  ['text-slate-800', 'text-slate-200'],
  ['text-slate-700', 'text-slate-300'],
  ['text-slate-600', 'text-slate-400'],
  ['bg-emerald-50/40', 'bg-emerald-950/40'],
  ['bg-blue-50/40', 'bg-blue-950/40'],
  ['bg-cyan-50/40', 'bg-cyan-950/40'],
  ['bg-rose-50/40', 'bg-rose-950/40'],
  ['hover:bg-slate-100', 'hover:bg-slate-800'],
  ['hover:bg-slate-200', 'hover:bg-slate-700'],
  ['hover:bg-amber-50/40', 'hover:bg-amber-950/40'],
  ['bg-amber-50', 'bg-amber-950/40'],
  ['bg-rose-50', 'bg-rose-950/40'],
  ['border-emerald-200', 'border-emerald-800/50'],
  ['border-blue-200', 'border-blue-800/50'],
  ['border-amber-200', 'border-amber-800/50'],
  ['border-rose-200', 'border-rose-800/50']
];

for (const [find, replace] of replacements) {
  content = content.split(find).join(replace);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Theme replacement complete.');
