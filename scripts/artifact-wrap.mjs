// The artifact host supplies its own <html>/<head>/<body> skeleton, so strip ours.
import fs from 'node:fs';
const p = 'dist-artifact/index.html';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(/<!doctype html>/i, '').replace(/<\/?html[^>]*>/gi, '').replace(/<\/?head>/gi, '').replace(/<\/?body>/gi, '');
s = s.replace(/<meta charset="utf-8"\s*\/?>/i, '').replace(/<meta name="viewport"[^>]*>/i, '').replace(/<link rel="icon"[^>]*>/i, '');
// title first so the host finds it in the first 8KB
const title = s.match(/<title>.*?<\/title>/)[0];
s = title + '\n<style>:root{color-scheme:dark}html,body{height:100%;background:#1a1026}</style>\n' + s.replace(title, '');
fs.writeFileSync('dist-artifact/mint-condition.html', s.trim() + '\n');
console.log('wrote dist-artifact/mint-condition.html', (s.length / 1024).toFixed(0) + 'KB');
