// 시각과 시간 단원 스모크: 생성기 300회 × 보기 4개·중복 0·정답 유효 + diag()가 어떤 입력에도 안 터짐 + 튜터 대본 생성
const fs=require('fs');
globalThis.UNITS=[{id:'len'}]; globalThis.MODULES={}; globalThis.DISCOVER={}; globalThis.INSIGHT={}; globalThis.TALK={}; globalThis.TUTOR={}; globalThis.DIAG={};
globalThis.window=globalThis; globalThis.$=()=>({textContent:'',innerHTML:''});
globalThis.rnd=(a,b)=>Math.floor(Math.random()*(b-a+1))+a; globalThis.pick=a=>a[Math.floor(Math.random()*a.length)];
globalThis.shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
globalThis.poolGen=(cat,pool)=>({cat,make(){const it=pick(pool);const wrong=shuffle(it.w).slice(0,3);const choices=shuffle([it.c].concat(wrong));return{q:it.q,choices,a:choices.indexOf(it.c),hint:it.h,visual:it.v||null};}});
eval(fs.readFileSync('grades/g3-time.js','utf8'));
const m=MODULES.time, errs=[]; let n=0, diagHits=0, tutored=0;
['gens','thinkGens','deepGens'].forEach(kind=>m[kind].forEach((g,gi)=>{ for(let k=0;k<300;k++){ n++; const o=g.make();
  if(!o.q) errs.push(`${kind}[${gi}] q없음`); if(!o.hint) errs.push(`${kind}[${gi}] hint없음`);
  if(o.choices){ if(o.choices.length!==4) errs.push(`${kind}[${gi}] 보기 ${o.choices.length}: ${o.q}`); if(new Set(o.choices).size!==4) errs.push(`${kind}[${gi}] 중복 ${JSON.stringify(o.choices)}`); if(o.a<0||o.a>3) errs.push(`${kind}[${gi}] a=${o.a}`); }
  else if(typeof o.a!=='number'||!isFinite(o.a)||o.a<0) errs.push(`${kind}[${gi}] 숫자답 이상 ${o.q} -> ${o.a}`);
  // diag: 모든 보기/근처 숫자로 호출해도 예외 없어야
  if(typeof o.diag==='function'){ try{ const cands=o.choices?o.choices:[o.a,o.a+1,o.a-1,0,'abc',o.a*2]; cands.forEach(c=>{ const r=o.diag(c); if(r&&c!==(o.choices?o.choices[o.a]:o.a)) diagHits++; }); }catch(e){ errs.push(`${kind}[${gi}] diag 예외 ${e.message}`); } }
  if(o.t&&TUTOR[o.t.k]){ try{ const b=TUTOR[o.t.k](o.t,o); if(!Array.isArray(b)||b.length<2||b[b.length-1].type!=='done') errs.push(`${kind}[${gi}] 튜터 대본 이상`); tutored++; }catch(e){ errs.push(`${kind}[${gi}] 튜터 예외 ${e.message}`); } }
}}));
for(const d of DISCOVER.time){ if(new Set(d.choices).size!==d.choices.length||d.a<0||d.a>=d.choices.length) errs.push('DISCOVER 이상'); }
const html=m.concept(); if(html.length<500) errs.push('concept 짧음');
console.log(`생성 ${n}회 · 진단 발동 ${diagHits}회 · 튜터 대본 ${tutored}회 · UNITS에 등록: ${UNITS.map(u=>u.id).join(',')}`);
console.log('오류:',errs.length); [...new Set(errs)].slice(0,20).forEach(e=>console.log('  -',e)); process.exit(errs.length?1:0);
