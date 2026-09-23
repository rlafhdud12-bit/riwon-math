// 식 세우기 스모크: 계산기 정확성 + 모든 생성기 200회(정석 힌트 식이 답이 되는지, 각 방법 example이 자기 check를 통과하고 답이 맞는지)
const fs=require('fs');
globalThis.document={createElement:()=>({}),head:{appendChild(){}}}; globalThis.window=globalThis;
globalThis.UNITS=[]; globalThis.MODULES={mul:{gens:[]},div:{gens:[]},add:{gens:[],games:[]},time:{gens:[]},len:{gens:[]},cap:{gens:[]}};
globalThis.rnd=(a,b)=>Math.floor(Math.random()*(b-a+1))+a; globalThis.pick=a=>a[Math.floor(Math.random()*a.length)];
globalThis.shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
globalThis.PLAY=null; globalThis.clearTimers=()=>{}; globalThis.$=()=>null;
eval(fs.readFileSync('expr.js','utf8'));
const errs=[];
// 계산기
const E=(s)=>evalTokens(s.split(' '));
[['7 × 8',56],['( 7 × 4 ) + ( 7 × 4 )',56],['60 − 20 + 5',45],['2 × 60 + 15',135],['24 ÷ 6',4],['7 ÷ 2',null],['7 +',null],['( 3 + 2',null],['3 2',null]].forEach(([s,v])=>{ if(E(s)!==v) errs.push(`계산기 ${s} → ${E(s)} (기대 ${v})`); });
const tok=s=>s.replace(/\s+/g,' ').trim().split(' ').flatMap(t=>t.match(/\d+|[()+−×÷]/g)||[]);
let n=0;
Object.keys(MODULES).forEach(u=>{ (MODULES[u].exprGens||[]).forEach((g,gi)=>{ for(let k=0;k<200;k++){ n++; const p=g.make();
  if(!p.story||!p.nums||!p.answer&&p.answer!==0) errs.push(`${u}[${gi}] 필드 누락`);
  // 정석: hint 안의 식이 답이 되는지(힌트에 식이 들어있는 경우)
  const hm=p.hint.match(/[\d() ]*[+−×÷][\d()+−×÷ ]+/); if(hm){ const v=evalTokens(tok(hm[0])); if(v!==null&&v!==p.answer) errs.push(`${u}[${gi}] 힌트식 ${hm[0]} = ${v} ≠ ${p.answer}`); }
  (p.methods||[]).forEach((m,mi)=>{ const tk=tok(m.example); const v=evalTokens(tk); const target=m.answer!==undefined?m.answer:p.answer;
    if(v!==target) errs.push(`${u}[${gi}].m${mi} example ${m.example} = ${v} ≠ ${target}`);
    if(!m.check(tk,v,p)) errs.push(`${u}[${gi}].m${mi} example이 자기 check 실패: ${m.example}`); });
}}); });
console.log(`생성 ${n}회 · 오류 ${errs.length}`); [...new Set(errs)].slice(0,15).forEach(e=>console.log('  -',e)); process.exit(errs.length?1:0);
