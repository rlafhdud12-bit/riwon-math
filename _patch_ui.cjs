// UI 정리 패치: index.html 의 옛 home()·renderDashboard() 본문을 제거(ui.js 가 대신 정의) + CSS 추가 + ui.js 로드
const fs=require('fs'); let s=fs.readFileSync('index.html','utf8'); const before=s.length;
function cut(startMarker, endMarker, note){ const a=s.indexOf(startMarker), b=s.indexOf(endMarker, a+1); if(a<0||b<0) throw new Error('marker not found: '+startMarker); s=s.slice(0,a)+`/* ${note} → ui.js */\n`+s.slice(b); }
cut('function home(){', 'function setGrade(n)', 'home() 은 ui.js 에서 정의');
cut('function renderDashboard(){', 'function weekChart(){', 'renderDashboard() 은 ui.js 에서 정의');
// CSS: 홈/부모 화면용 클래스
const css=`
  /* 홈·부모 화면 (ui.js) */
  .hbar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0 10px}
  .htitle{font-size:24px;font-weight:900;letter-spacing:-.5px}
  .hright{display:flex;gap:6px;align-items:center}
  .hpill{background:#fff;border:2px solid #eee;border-radius:12px;padding:5px 10px;font-weight:800;font-size:13px;color:var(--ink)}
  .gradebar{display:flex;gap:6px;justify-content:center;margin:0 0 10px}
  .gchip{background:rgba(255,255,255,.7);color:#5f27cd;border-radius:12px;padding:6px 12px;font-weight:800;font-size:13px}
  .gchip.on{background:#5f27cd;color:#fff}
  .row3{display:flex;gap:8px;margin:2px 0 12px}
  .row3 button{flex:1;background:#fff;border:2px solid #eee;border-radius:16px;padding:12px 6px;font-weight:800;font-size:14px;color:var(--ink);box-shadow:0 3px 8px rgba(0,0,0,.05)}
  .row3 button.pri{background:var(--c);color:#fff;border-color:var(--c)}
  details.more{margin-top:14px}
  details.more>summary{cursor:pointer;font-weight:800;color:var(--soft);font-size:14px;padding:10px 0;list-style:none}
  details.more>summary::before{content:'▸ ';}
  details.more[open]>summary::before{content:'▾ ';}
  .dim{font-size:12.5px;color:var(--soft);font-weight:700}
  .card p.dim{margin:0 0 8px;font-size:13px;line-height:1.5}
  .hwrow{padding:8px 0;border-top:1px solid #f1e6d8}
  .hwrow .lab{display:flex;justify-content:space-between;font-weight:800;font-size:14px;gap:8px}
  .hwrow details>summary{font-size:13px;color:#2e6fd1;font-weight:800;cursor:pointer;margin-top:4px}
  .srcbox{font-size:13px;margin:6px 0 0;padding:6px 8px;background:#fff9f0;border-radius:10px}
  .linkbtn{background:none;border:none;color:#e8503a;font-weight:800;font-size:12.5px;padding:4px 0}
  .setrow{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 0;border-top:1px solid #f1e6d8}
  .setrow:first-of-type{border-top:none}
  .setrow .k{font-weight:800;font-size:14.5px}
  .setrow .k small{display:block;font-weight:700;color:var(--soft);font-size:12px}
`;
s=s.replace('  /* 단원 */', css+'\n  /* 단원 */');
s=s.replace('<script src="expr.js"></script>', '<script src="expr.js"></script>\n<script src="ui.js"></script>');
fs.writeFileSync('index.html', s);
console.log('patched', before, '→', s.length, '| ui.js tag:', s.includes('ui.js'), '| old home removed:', !s.includes('const gradeBar=[1,2,3,4,5,6]'));
