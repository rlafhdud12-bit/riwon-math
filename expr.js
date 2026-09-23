/* =========================================================
   ✍️ 식 세우기 · ✏️ 풀이 메모판 · 🧮 세로셈 · 📸 사진 숙제 — 2026-09-23
   목표: 답만 맞히는 게 아니라 "식을 스스로 세우고, 같은 문제를 다른 방법으로도 세우는" 힘.
   엔진(index.html)·daily.js 뒤에 로드. 전역: startExprStage, buildExprSet, startExprSet, padButton,
   buildColumnCalc, fetchHomework, hwPendingSets, startHomework, parentHomeworkHTML, createHomeworkFromPhotos
   ========================================================= */
(function(){
  /* ---------- 스타일 ---------- */
  const st=document.createElement('style'); st.textContent=`
  .ex-slot{min-height:56px;border:3px dashed var(--c);border-radius:16px;padding:10px 12px;font-size:26px;font-weight:900;display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;background:#fffdf7;margin:10px 0}
  .ex-slot .ph{font-size:14px;color:var(--soft);font-weight:700}
  .ex-slot .tk{padding:2px 8px;border-radius:10px;background:#fff;border:2px solid #f1e6d8}
  .ex-slot .tk.op{background:#fff0f6;border-color:#f8c8dc;color:#b8377f}
  .ex-bank{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:8px 0}
  .ex-tile{min-width:52px;padding:12px 10px;border-radius:14px;background:#fff;border:2px solid #eee;font-size:22px;font-weight:900;box-shadow:0 3px 8px rgba(0,0,0,.08);cursor:pointer;color:var(--ink)}
  .ex-tile.op{background:#fff0f6;border-color:#f8c8dc;color:#b8377f}
  .ex-tile:active{transform:scale(.94)}
  .ex-ctrl{display:flex;gap:8px;margin-top:6px}
  .ex-ctrl .ghost{flex:1;background:#fff;border:2px solid #eee;border-radius:14px;padding:12px;font-weight:800;font-size:15px}
  .ex-ok{flex:2;background:var(--c);color:#fff;border-radius:14px;padding:12px;font-weight:900;font-size:17px;box-shadow:0 4px 12px rgba(0,0,0,.14)}
  .ex-method{background:#eef6ff;border-left:4px solid #54a0ff;border-radius:12px;padding:10px 12px;margin:8px 0;font-weight:800}
  .pad-wrap{margin-top:8px}
  .pad-canvas{width:100%;height:220px;border:2px solid #f1e6d8;border-radius:14px;background:repeating-linear-gradient(0deg,#fff,#fff 27px,#f6ecdf 28px);touch-action:none;display:block}
  .pad-bar{display:flex;gap:8px;margin-top:6px}
  .pad-bar button{flex:1;background:#fff;border:2px solid #eee;border-radius:12px;padding:9px;font-weight:800;font-size:14px}
  .col-grid{display:grid;grid-template-columns:34px repeat(3,58px);gap:6px;justify-content:center;align-items:center;margin:10px 0}
  .col-grid .cell{height:52px;border-radius:12px;background:#fff;border:2px solid #eee;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900}
  .col-grid .cell.in{border-color:var(--c);cursor:pointer}
  .col-grid .cell.in.sel{background:#fff5e8;box-shadow:0 0 0 3px rgba(255,159,67,.35)}
  .col-grid .cell.carry{height:34px;font-size:16px;color:#e8503a;border-style:dashed}
  .col-grid .cell.ok{background:#e8f8f0;border-color:#19a974}
  .col-grid .cell.bad{background:#fdecea;border-color:#e8503a}
  .col-grid .lab{font-size:12px;color:var(--soft);font-weight:800;text-align:right}
  .col-grid .line{grid-column:1/-1;height:3px;background:var(--ink);border-radius:2px;margin:2px 0}
  `; document.head.appendChild(st);

  /* ---------- 안전한 계산기 (정수, + − × ÷, 괄호) ---------- */
  const norm=t=>t==='−'?'-':t==='×'?'*':t==='÷'?'/':String(t);
  window.evalTokens=function(tokens){
    const t=tokens.map(norm); let i=0;
    function num(){ if(t[i]==='('){ i++; const v=expr(); if(t[i]!==')') throw 0; i++; return v; } const v=t[i]; if(!/^\d+$/.test(v)) throw 0; i++; return Number(v); }
    function term(){ let v=num(); while(t[i]==='*'||t[i]==='/'){ const op=t[i++]; const r=num(); if(op==='*') v*=r; else { if(r===0||v%r!==0) throw 0; v/=r; } } return v; }
    function expr(){ let v=term(); while(t[i]==='+'||t[i]==='-'){ const op=t[i++]; const r=term(); v=op==='+'?v+r:v-r; } return v; }
    try{ const v=expr(); return i===t.length?v:null; }catch(e){ return null; }
  };
  const isOp=t=>['+','−','×','÷','(',')'].includes(t);
  const countOp=(tk,o)=>tk.filter(t=>t===o).length;
  const has=(tk,o)=>tk.includes(o);

  /* ---------- 식 문제 생성기 (단원별) ----------
     make() → {story, nums(주어진 수), extra(도우미 수), ops, answer, cat, unitId, hint, expl(정석 식 설명),
               methods:[{name, prompt, hint, check(tk,val), answer?, example}]} */
  const R=rnd;
  const mulStory=(a,b)=>pick([`사탕이 한 봉지에 ${a}개씩 들어 있어. ${b}봉지에는 모두 몇 개일까?`,`한 상자에 귤이 ${a}개씩, 상자가 ${b}개야. 귤은 모두 몇 개?`,`의자를 한 줄에 ${a}개씩 ${b}줄로 놓았어. 의자는 모두 몇 개?`,`${a}명씩 ${b}모둠이야. 모두 몇 명?`]);
  const EXPR={
    mul:[
      {cat:'식 세우기·곱셈', make(){ const a=R(2,9); let b=R(2,9); while(b===a) b=R(2,9); const [c,d]=[Math.floor(b/2),b-Math.floor(b/2)];
        return {story:mulStory(a,b), nums:[a,b], extra:[c,d], ops:['+','−','×','÷','(',')'], answer:a*b, hint:`"${a}개씩 ${b}묶음" = ${a} × ${b}`, expl:`같은 수를 여러 번 더하는 건 곱하기! <b>${a} × ${b} = ${a*b}</b>`,
          methods:[
            {name:'순서 바꾸기', prompt:'곱하는 순서를 바꿔서 세워 봐. (답은 같아야 해)', hint:`${b} × ${a} 도 ${a*b}!`, check:(tk,v)=>has(tk,'×')&&tk.join('')!==`${a}×${b}`, example:`${b} × ${a}`},
            {name:'반복덧셈', prompt:`곱하기 없이 <b>더하기만</b>으로 세워 봐.`, hint:`${a}를 ${b}번 더해!`, check:(tk,v)=>!has(tk,'×')&&countOp(tk,'+')>=1, example:Array(b).fill(a).join(' + ')},
            {name:'쪼개기', prompt:`${b}를 ${c}과 ${d}로 쪼개서, <b>곱하기 두 번 + 더하기</b>로 세워 봐.`, hint:`(${a}×${c}) + (${a}×${d})`, check:(tk,v)=>countOp(tk,'×')>=2&&has(tk,'+'), example:`(${a} × ${c}) + (${a} × ${d})`},
          ]}; }},
      {cat:'식 세우기·몇십 곱셈', make(){ const a=R(2,9)*10,b=R(2,9);
        return {story:pick([`구슬이 한 통에 ${a}개씩 ${b}통 있어. 모두 몇 개?`,`줄넘기를 하루에 ${a}번씩 ${b}일 했어. 모두 몇 번?`]), nums:[a,b], extra:[a/10,10], ops:['+','−','×','÷','(',')'], answer:a*b, hint:`${a} × ${b}`, expl:`<b>${a} × ${b} = ${a*b}</b>. ${a/10}×${b}=${a/10*b}에 0 하나!`,
          methods:[{name:'10배로 보기', prompt:`${a}를 <b>${a/10} × 10</b>으로 보고 세워 봐.`, hint:`${a/10} × 10 × ${b}`, check:(tk,v)=>countOp(tk,'×')>=2&&has(tk,'10'), example:`${a/10} × 10 × ${b}`}]}; }},
      {cat:'식 세우기·두자리 곱셈', make(){ const a=R(12,29),b=R(2,4); const t=Math.floor(a/10)*10,o=a%10;
        return {story:pick([`한 반에 ${a}명씩 ${b}반이야. 모두 몇 명?`,`색종이가 한 묶음에 ${a}장씩 ${b}묶음. 모두 몇 장?`]), nums:[a,b], extra:[t,o], ops:['+','−','×','÷','(',')'], answer:a*b, hint:`${a} × ${b}`, expl:`<b>${a} × ${b} = ${a*b}</b>. 쪼개면 (${t}×${b})+(${o}×${b})`,
          methods:[{name:'쪼개기', prompt:`${a}를 <b>${t}과 ${o}</b>로 쪼개서 세워 봐.`, hint:`(${t}×${b}) + (${o}×${b})`, check:(tk,v)=>countOp(tk,'×')>=2&&has(tk,'+')&&has(tk,String(t)), example:`(${t} × ${b}) + (${o} × ${b})`}]}; }},
    ],
    div:[
      {cat:'식 세우기·나눗셈', make(){ const b=R(2,9),c=R(2,9),a=b*c;
        return {story:pick([`쿠키 ${a}개를 ${b}명이 똑같이 나눠 먹어. 한 명이 몇 개?`,`연필 ${a}자루를 ${b}묶음으로 똑같이 묶으면 한 묶음에 몇 자루?`,`사탕 ${a}개를 한 봉지에 ${b}개씩 담으면 봉지가 몇 개?`]), nums:[a,b], extra:[c], ops:['+','−','×','÷','(',')'], answer:c, hint:`똑같이 나누기 = ÷. ${a} ÷ ${b}`, expl:`<b>${a} ÷ ${b} = ${c}</b>`,
          methods:[
            {name:'곱셈으로 확인', prompt:`나눗셈이 맞는지 <b>곱셈 식</b>으로 확인해 봐. (답이 ${a}가 되게)`, hint:`${b} × ${c} = ${a}`, answer:a, check:(tk,v)=>has(tk,'×')&&!has(tk,'÷'), example:`${b} × ${c}`},
            {name:'거꾸로', prompt:`이번엔 <b>${c}명이 나누면 한 명이 몇 개</b>인지 식으로 세워 봐. (답 ${b})`, hint:`${a} ÷ ${c}`, answer:b, check:(tk,v)=>has(tk,'÷')&&has(tk,String(c)), example:`${a} ÷ ${c}`},
          ]}; }},
    ],
    add:[
      {cat:'식 세우기·세자리 덧셈', make(){ const ah=R(1,4)*100,at=R(1,9)*10,ao=R(1,9),bh=R(1,4)*100,bt=R(1,9)*10,bo=R(1,9); const a=ah+at+ao,b=bh+bt+bo; // 자릿수 0 없이(쪼개기 방법 때문)
        return {story:pick([`도서관에 동화책이 ${a}권, 과학책이 ${b}권 있어. 책은 모두 몇 권?`,`어제 ${a}걸음, 오늘 ${b}걸음 걸었어. 이틀 동안 모두 몇 걸음?`]), nums:[a,b], extra:[ah,at,ao,bh,bt,bo], ops:['+','−','×','÷','(',')'], answer:a+b, hint:`${a} + ${b}`, expl:`<b>${a} + ${b} = ${a+b}</b>`,
          methods:[{name:'자릿수 쪼개기', prompt:`백·십·일로 쪼개서 <b>같은 자리끼리</b> 더하는 식을 세워 봐.`, hint:`(${ah}+${bh}) + (${at}+${bt}) + (${ao}+${bo})`, check:(tk,v)=>countOp(tk,'+')>=3&&!has(tk,String(a)), example:`(${ah}+${bh}) + (${at}+${bt}) + (${ao}+${bo})`},
                    {name:'순서 바꾸기', prompt:'더하는 순서를 바꿔 세워 봐.', hint:`${b} + ${a}`, check:(tk,v)=>tk.join('')===`${b}+${a}`, example:`${b} + ${a}`}]}; }},
      {cat:'식 세우기·세자리 뺄셈', make(){ const a=R(400,899),b=R(126,a-150); const c=a-b;
        return {story:pick([`구슬이 ${a}개 있었는데 ${b}개를 친구에게 줬어. 남은 구슬은?`,`${a}쪽짜리 책을 ${b}쪽까지 읽었어. 남은 쪽수는?`]), nums:[a,b], extra:[c], ops:['+','−','×','÷','(',')'], answer:c, hint:`남은 건 빼기. ${a} − ${b}`, expl:`<b>${a} − ${b} = ${c}</b>`,
          methods:[{name:'덧셈으로 확인', prompt:`뺄셈이 맞는지 <b>덧셈 식</b>으로 확인해 봐. (답이 ${a}가 되게)`, hint:`${c} + ${b} = ${a}`, answer:a, check:(tk,v)=>has(tk,'+')&&!has(tk,'−'), example:`${c} + ${b}`}]}; }},
    ],
    time:[
      {cat:'식 세우기·시간→분', make(){ const h=R(1,3),m=R(1,11)*5;
        return {story:`${h}시간 ${m}분 동안 놀았어. 모두 몇 분 동안 논 걸까?`, nums:[h,m], extra:[60], ops:['+','−','×','÷','(',')'], answer:h*60+m, hint:`1시간 = 60분. ${h}×60 + ${m}`, expl:`<b>${h} × 60 + ${m} = ${h*60+m}</b>분`,
          methods:[{name:'60씩 더하기', prompt:'곱하기 없이 <b>60을 더해서</b> 세워 봐.', hint:`60을 ${h}번 더하고 ${m}`, check:(tk,v)=>!has(tk,'×')&&countOp(tk,'60')>=h, example:Array(h).fill(60).join(' + ')+' + '+m}]}; }},
      {cat:'식 세우기·걸린 시간', make(){ const h1=R(1,9),m1=R(20,50),m2=R(5,40); const d=(60-m1)+m2;
        return {story:`${h1}시 ${m1}분에 시작해서 ${h1+1}시 ${m2}분에 끝났어. 걸린 시간은 몇 분?`, nums:[60,m1,m2], extra:[h1], ops:['+','−','×','÷','(',')'], answer:d, hint:`징검다리! (60 − ${m1}) + ${m2}`, expl:`<b>(60 − ${m1}) + ${m2} = ${d}</b>분. 다음 정각까지 먼저, 그다음 나머지!`,
          methods:[{name:'한 번에 빼기', prompt:`끝난 시각을 분으로 바꿔 <b>한 번에 빼는</b> 식으로도 세워 봐. (60+${m2}) − ${m1}`, hint:`(60 + ${m2}) − ${m1}`, check:(tk,v)=>has(tk,'−')&&has(tk,'+')&&tk.join('')!==`(60−${m1})+${m2}`, example:`(60 + ${m2}) − ${m1}`}]}; }},
      {cat:'식 세우기·분→초', make(){ const m=R(1,4),s=R(1,11)*5;
        return {story:`${m}분 ${s}초 동안 숨을 참았어. 모두 몇 초?`, nums:[m,s], extra:[60], ops:['+','−','×','÷','(',')'], answer:m*60+s, hint:`1분 = 60초. ${m}×60 + ${s}`, expl:`<b>${m} × 60 + ${s} = ${m*60+s}</b>초`,
          methods:[{name:'60씩 더하기', prompt:'곱하기 없이 세워 봐.', hint:`60을 ${m}번`, check:(tk,v)=>!has(tk,'×'), example:Array(m).fill(60).join(' + ')+' + '+s}]}; }},
    ],
    len:[
      {cat:'식 세우기·길이', make(){ const m=R(1,4),c=R(1,9)*10;
        return {story:`끈의 길이가 ${m}m ${c}cm야. 몇 cm일까?`, nums:[m,c], extra:[100], ops:['+','−','×','÷','(',')'], answer:m*100+c, hint:`1m = 100cm. ${m}×100 + ${c}`, expl:`<b>${m} × 100 + ${c} = ${m*100+c}</b>cm`,
          methods:[{name:'100씩 더하기', prompt:'곱하기 없이 세워 봐.', hint:`100을 ${m}번`, check:(tk,v)=>!has(tk,'×'), example:Array(m).fill(100).join(' + ')+' + '+c}]}; }},
    ],
    cap:[
      {cat:'식 세우기·들이', make(){ const l=R(1,3),ml=R(1,9)*100,add=R(1,6)*100;
        return {story:`물이 ${l}L ${ml}mL 있는데 ${add}mL를 더 부었어. 모두 몇 mL?`, nums:[l,ml,add], extra:[1000], ops:['+','−','×','÷','(',')'], answer:l*1000+ml+add, hint:`1L = 1000mL. ${l}×1000 + ${ml} + ${add}`, expl:`<b>${l}×1000 + ${ml} + ${add} = ${l*1000+ml+add}</b>mL`,
          methods:[{name:'먼저 합치기', prompt:`mL끼리 <b>먼저 더한 뒤</b> L를 바꾸는 식으로 세워 봐.`, hint:`${l}×1000 + (${ml}+${add})`, check:(tk,v)=>has(tk,'(')&&has(tk,'+'), example:`${l}×1000 + (${ml} + ${add})`}]}; }},
    ],
  };
  Object.keys(EXPR).forEach(u=>{ if(MODULES[u]) MODULES[u].exprGens=EXPR[u]; });

  window.buildExprSet=function(n, units){
    const pool=[]; (units||Object.keys(EXPR)).forEach(u=>{ if(EXPR[u]&&MODULES[u]) EXPR[u].forEach(g=>pool.push([u,g])); });
    const set=[]; for(let i=0;i<n;i++){ const [u,g]=pool[i%pool.length]; const p=g.make(); p.unitId=u; p.cat=g.cat; set.push(p); }
    return shuffle(set);
  };

  /* ---------- 식 세우기 플레이 ---------- */
  let EX=null; window.exState=()=>EX;
  window.startExprSet=function(set, opt){
    clearTimers(); PLAY=null;
    EX={set, i:0, step:0, tk:[], tries:0, firstTry:0, methodOk:0, methodTotal:0, done:[], opt:opt||{}, body:opt.body};
    exDraw();
  };
  window.startExprStage=function(unitId, body){
    const set=buildExprSet(6,[unitId]); if(!set.length){ body.innerHTML='<p style="color:var(--soft);text-align:center">이 단원은 식 세우기가 아직 없어요.</p>'; return; }
    startExprSet(set,{body, title:'✍️ 식 세우기', onDone:(ft,total)=>{ const got=addStickers(Math.floor(ft/2)); body.innerHTML=`<div class="result card"><div class="stars">✍️⭐</div><h2>식 세우기 완료!</h2><div class="msg">${total}문제 중 한 번에 세운 식 <b>${ft}개</b> · 다른 방법 성공 ${EX.methodOk}/${EX.methodTotal}</div>${rewardLine(got,Math.floor(ft/2))}<button class="bigbtn" onclick="setStage('expr')">✍️ 한 번 더</button><button class="bigbtn ghost" onclick="setStage('quiz')">퀴즈로</button></div>`; }});
  };
  function curP(){ return EX.set[EX.i]; }
  function curMethod(){ return EX.step>0?curP().methods[EX.step-1]:null; }
  function tileHTML(p){
    const nums=[...new Set(p.nums.concat(p.extra||[]))].map(String);
    return `<div class="ex-bank">${nums.map(n=>`<button class="ex-tile" onclick="exTap('${n}')">${n}</button>`).join('')}</div>
      <div class="ex-bank">${p.ops.map(o=>`<button class="ex-tile op" onclick="exTap('${o}')">${o}</button>`).join('')}</div>`;
  }
  function exDraw(){
    const p=curP(), m=curMethod(), n=EX.set.length;
    const target=m&&m.answer!==undefined?m.answer:p.answer;
    EX.body.innerHTML=`
      <div class="quiz-top"><span class="score-pill">✍️ ${EX.i+1}/${n}</span><span class="score-pill">${m?'🔄 다른 방법 '+EX.step+'/'+p.methods.length:'📝 식 세우기'}</span>${EX.opt.stop?`<button class="stopbtn" onclick="exStop()">그만</button>`:''}</div>
      <div class="progress"><div class="bar" style="width:${Math.round(EX.i/n*100)}%"></div></div>
      <div class="q-card">
        <div class="q-text">${p.story}</div>
        ${m?`<div class="ex-method">🔄 ${m.prompt}</div>`:`<div style="font-size:13.5px;color:var(--soft);margin-top:4px">숫자와 기호를 눌러 <b>식</b>을 만들어 봐. 답은 <b>${target}</b>이 나와야 해!</div>`}
        <div class="ex-slot" id="ex-slot"></div>
        <div class="feedback" id="ex-fb"></div>
        <div class="hintbox" id="ex-hint">💡 ${m?m.hint:p.hint}</div>
      </div>
      ${tileHTML(p)}
      <div class="ex-ctrl"><button class="ghost" onclick="exTap('del')">⌫</button><button class="ghost" onclick="exTap('clear')">전부 지우기</button><button class="ex-ok" onclick="exCheck()">확인</button></div>
      ${typeof padButton==='function'?padButton():''}`;
    exSlot();
  }
  function exSlot(){ const s=document.getElementById('ex-slot'); if(!s) return; s.innerHTML=EX.tk.length?EX.tk.map(t=>`<span class="tk ${isOp(t)?'op':''}">${t}</span>`).join(''):'<span class="ph">여기에 식이 만들어져요</span>'; }
  window.exTap=function(t){ if(!EX||EX.lock) return; if(t==='del') EX.tk.pop(); else if(t==='clear') EX.tk=[]; else if(EX.tk.length<24) EX.tk.push(t); exSlot(); };
  window.exStop=function(){ if(EX&&EX.opt.stop) EX.opt.stop(); };
  function validMain(p,tk,target){
    if(target===undefined) target=p.answer;
    if(!tk.some(isOp)||!tk.some(t=>!isOp(t))) return '숫자와 기호를 같이 써야 식이 돼!';
    if(tk.map(String).includes(String(target))&&!p.nums.map(String).includes(String(target))) return `답(${target})을 식 안에 넣으면 안 돼. 주어진 수로만!`;
    const v=evalTokens(tk); if(v===null) return '식이 이상해. 기호 순서나 괄호를 확인해 봐!';
    return v;
  }
  window.exCheck=function(){
    if(!EX||EX.lock) return; const p=curP(), m=curMethod(), tk=EX.tk.slice(), fb=document.getElementById('ex-fb'); if(!tk.length) return;
    const target=m&&m.answer!==undefined?m.answer:p.answer;
    let r=validMain(p,tk,target); let ok=false, msg='';
    if(typeof r==='string') msg=r;
    else if(r!==target) msg=`이 식은 ${r}이 나와. 답 ${target}이 되어야 해. 다시 생각해 봐!`;
    else if(m&&!m.check(tk,r,p)) msg=`계산은 맞는데, 이번엔 "${m.name}" 방법으로! ${m.hint}`;
    else if(m&&EX.done.includes(tk.join(' '))) msg='아까랑 같은 식이야. 다른 방법으로!';
    else ok=true;
    EX.tries++;
    if(ok){
      EX.lock=true; sfx('ok'); confetti(false); EX.done.push(tk.join(' '));
      if(!m){ if(EX.tries===1) EX.firstTry++; markStat(p.unitId,p.cat,EX.tries===1); }
      else { EX.methodTotal++; EX.methodOk++; }
      fb.className='feedback ok'; fb.innerHTML=`정답! <b>${tk.join(' ')} = ${target}</b>`+(m?'':`<div style="font-size:13.5px;margin-top:4px">${p.expl}</div>`);
      const nextBtn = (!m&&p.methods.length) ? `<button class="bigbtn" onclick="exNext('method')">🔄 다른 방법으로도 세워 볼까? ▶</button><button class="bigbtn ghost" onclick="exNext('problem')">다음 문제로</button>`
                    : (m&&EX.step<p.methods.length) ? `<button class="bigbtn" onclick="exNext('method')">🔄 또 다른 방법 ▶</button><button class="bigbtn ghost" onclick="exNext('problem')">다음 문제로</button>`
                    : `<button class="bigbtn" onclick="exNext('problem')">다음 문제로 ▶</button>`;
      document.querySelector('.ex-ctrl').outerHTML=`<div id="ex-next">${nextBtn}</div>`;
    } else {
      sfx('no'); fb.className='feedback no'; fb.textContent=msg; document.getElementById('ex-hint').classList.add('show');
      if(!m&&EX.tries===1){ markStat(p.unitId,p.cat,false); addWrong({unitId:p.unitId,cat:p.cat,q:p.story,a:p.answer,hint:p.hint,given:tk.join(' ')}); }
      if(m){ EX.methodTotal+= (EX.tries===1?1:0); }
      if(EX.tries>=3){ // 세 번 막히면 예시 보여주고 넘어갈 수 있게
        fb.innerHTML=msg+`<div style="margin-top:6px">예: <b>${m?m.example:p.hint}</b></div>`;
        const c=document.querySelector('.ex-ctrl'); if(c&&!document.getElementById('ex-skip')) c.insertAdjacentHTML('afterend',`<button class="bigbtn ghost" id="ex-skip" onclick="exNext('${m?'method':'problem'}')">예시 보고 다음으로 ▶</button>`);
      }
    }
  };
  window.exNext=function(kind){
    const p=curP();
    if(kind==='method'&&EX.step<p.methods.length){ EX.step++; }
    else { EX.i++; EX.step=0; EX.done=[]; if(EX.i>=EX.set.length){ EX.lock=true; const {firstTry,set}=EX; if(EX.opt.onDone) EX.opt.onDone(firstTry,set.length); return; } }
    EX.tk=[]; EX.tries=0; EX.lock=false; exDraw();
  };

  /* ---------- ✏️ 풀이 메모판 (손가락으로 세로셈·그림) ---------- */
  window.padButton=function(){ return `<div class="pad-wrap" id="pad-wrap"><button class="askbtn" style="border-color:#f39c12;color:#b7791f" onclick="padToggle()">✏️ 손으로 풀이 쓰기</button></div>`; };
  window.padToggle=function(){
    const w=document.getElementById('pad-wrap'); if(!w) return;
    if(document.getElementById('pad-cv')){ w.innerHTML=`<button class="askbtn" style="border-color:#f39c12;color:#b7791f" onclick="padToggle()">✏️ 손으로 풀이 쓰기</button>`; return; }
    w.innerHTML=`<canvas class="pad-canvas" id="pad-cv"></canvas><div class="pad-bar"><button onclick="padClear()">🧽 지우기</button><button onclick="padToggle()">접기</button></div>`;
    const cv=document.getElementById('pad-cv'); const r=cv.getBoundingClientRect(); cv.width=r.width*2; cv.height=r.height*2; const ctx=cv.getContext('2d'); ctx.scale(2,2); ctx.lineWidth=3; ctx.lineCap='round'; ctx.strokeStyle='#3d2b1f';
    let drawing=false, last=null; const pos=e=>{ const b=cv.getBoundingClientRect(); return {x:e.clientX-b.left,y:e.clientY-b.top}; };
    cv.addEventListener('pointerdown',e=>{ drawing=true; last=pos(e); cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove',e=>{ if(!drawing) return; const p=pos(e); ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke(); last=p; });
    const up=()=>{ drawing=false; }; cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
  };
  window.padClear=function(){ const cv=document.getElementById('pad-cv'); if(cv) cv.getContext('2d').clearRect(0,0,cv.width,cv.height); };

  /* ---------- 🧮 세로셈 격자 (덧셈·뺄셈, 받아올림·내림 칸) ---------- */
  window.buildColumnCalc=function(host){ window._cc={host}; ccNew(); };
  window.ccNew=function(){
    const S=window._cc; const sub=Math.random()<0.5; let a=R(215,879), b=R(126,a-100); if(!sub){ a=R(125,689); b=R(126,999-a); }
    S.sub=sub; S.a=a; S.b=b; S.ans=sub?a-b:a+b; S.res=['','','']; S.carry=['','','']; S.sel=0; S.checked=false; ccDraw();
  };
  function dig(n,i){ return String(n).padStart(3,'0')[i]; }
  window.ccDraw=function(){
    const S=window._cc; const op=S.sub?'−':'+'; const cell=(v,cls,click)=>`<div class="cell ${cls}" ${click?`onclick="${click}"`:''}>${v}</div>`;
    S.host.innerHTML=`<div class="card"><p class="cg-tip">🧮 세로셈: 일의 자리부터! ${S.sub?'모자라면 위 칸에 10을 빌려 와(받아내림)':'10이 넘으면 위 칸에 1을 올려(받아올림)'}. 칸을 누르고 숫자를 눌러.</p>
      <div class="col-grid">
        <div class="lab">${S.sub?'빌림':'올림'}</div>${[0,1,2].map(i=>cell(S.carry[i],'in carry'+(S.sel==='c'+i?' sel':''),`ccSel('c${i}')`)).join('')}
        <div class="lab"></div>${[0,1,2].map(i=>cell(dig(S.a,i)==='0'&&i===0?'':dig(S.a,i),'')).join('')}
        <div class="lab" style="font-size:22px">${op}</div>${[0,1,2].map(i=>cell(dig(S.b,i)==='0'&&i===0?'':dig(S.b,i),'')).join('')}
        <div class="line"></div>
        <div class="lab">답</div>${[0,1,2].map(i=>cell(S.res[i],'in'+(S.sel===i?' sel':'')+(S.checked?(S.res[i]===dig(S.ans,i)||(i===0&&S.res[i]===''&&dig(S.ans,0)==='0')?' ok':' bad'):''),`ccSel(${i})`)).join('')}
      </div>
      <div class="keypad" style="max-width:280px;margin:8px auto">${[1,2,3,4,5,6,7,8,9].map(d=>`<button class="key" onclick="ccKey('${d}')">${d}</button>`).join('')}<button class="key del" onclick="ccKey('del')">⌫</button><button class="key" onclick="ccKey('0')">0</button><button class="key ok" onclick="ccCheck()">확인</button></div>
      <div class="cg-eq" id="cc-eq">${S.checked?(S.res.join('').replace(/^0/,'')===String(S.ans)?`🎉 정답! ${S.a} ${op} ${S.b} = <span class="big">${S.ans}</span>`:`다시 봐! 정답은 ${S.ans}. 빨간 칸을 고쳐 봐`):''}</div>
      ${S.checked?`<button class="bigbtn" onclick="ccNew()">🔀 새 문제</button>`:''}</div>`;
  };
  window.ccSel=function(i){ window._cc.sel=i; ccDraw(); };
  window.ccKey=function(k){ const S=window._cc; const s=S.sel; if(s==null) return;
    if(typeof s==='string'){ const i=Number(s[1]); S.carry[i]=k==='del'?'':k; }
    else { S.res[s]=k==='del'?'':k; if(k!=='del'&&s>0) S.sel=s-1; }
    ccDraw(); };
  window.ccCheck=function(){ const S=window._cc; S.checked=true; const ok=S.res.join('').replace(/^0/,'')===String(S.ans); if(ok){ sfx('ok'); confetti(false); } else sfx('no'); ccDraw(); };
  if(MODULES.add){ MODULES.add.games=MODULES.add.games||[]; MODULES.add.games.unshift({name:'🧮 세로셈', build:buildColumnCalc}); }

  /* ---------- 📸 사진 숙제 (아이 폰: 받기·풀기 / 부모 폰: 만들기·결과) ---------- */
  let hwLast=0;
  window.fetchHomework=async function(force){
    if(!navigator.onLine||(!force&&Date.now()-hwLast<5*60000)) return false;
    try{ const r=await fetch((window.HW_API||TUTOR_API)+'/api/homework?id='+encodeURIComponent(learnerId())); if(!r.ok) return false; const j=await r.json(); if(!Array.isArray(j.sets)) return false;
      hwLast=Date.now(); DB.hw=DB.hw||{done:{}}; DB.hw.sets=j.sets.map(s=>({jobId:s.jobId,t:s.t,title:s.title,note:s.note,source:s.source,problems:s.problems})); saveDB(); return true; }catch(e){ return false; }
  };
  window.hwPendingSets=function(){ const H=DB.hw||{done:{},sets:[]}; return (H.sets||[]).filter(s=>!(H.done||{})[s.jobId]); };
  window.startHomework=function(jobId, opt){
    const s=(DB.hw&&DB.hw.sets||[]).find(x=>x.jobId===jobId); if(!s) return;
    const set=s.problems.map((p,i)=>{ const base={id:i, unitId:'hw', cat:p.tag||'숙제', q:p.q, hint:p.hint+(p.explain?`<br><span style="font-weight:700">${p.explain}</span>`:''), hw:jobId};
      if(p.type==='choice'){ const choices=shuffle(p.choices.slice()); return Object.assign(base,{choices, a:choices.indexOf(p.answer)}); } return Object.assign(base,{a:parseInt(p.answer,10)}); });
    const body=opt&&opt.body; if(!body) return;
    PLAY={mode:'master',unitId:'hw',body,daily:opt.daily||('hw:'+jobId),hw:jobId,queue:shuffle(set),total:set.length,solved:new Set(),score:0,retry:0,streak:0,corr:0,cur:null,buf:'',locked:false,wrongQs:[]};
    advance();
  };
  // 부모 폰: 사진 → 숙제 생성
  window.createHomeworkFromPhotos=function(input){
    const files=[...(input.files||[])].slice(0,3); if(!files.length) return;
    const note=(prompt('메모(선택): 어떤 점이 걱정되는지 한 줄 (예: 받아올림을 자꾸 빠뜨려요)','')||'').slice(0,300);
    input.value='';
    Promise.all(files.map(f=>new Promise(res=>{ const rd=new FileReader(); rd.onload=()=>{ const img=new Image(); img.onload=()=>{ const max=1200, sc=Math.min(1,max/Math.max(img.width,img.height)); const cv=document.createElement('canvas'); cv.width=Math.round(img.width*sc); cv.height=Math.round(img.height*sc); cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height); let q=.82,u=cv.toDataURL('image/jpeg',q); while(u.length>850000&&q>.4){ q-=.1; u=cv.toDataURL('image/jpeg',q); } res(u); }; img.src=rd.result; }; rd.readAsDataURL(f); })))
    .then(async images=>{
      const jobId=Array.from(crypto.getRandomValues(new Uint8Array(6))).map(b=>(b%36).toString(36)).join('')+Date.now().toString(36).slice(-4);
      DB.hwJobs=DB.hwJobs||[]; DB.hwJobs.unshift({jobId,t:Date.now(),status:'pending'}); DB.hwJobs=DB.hwJobs.slice(0,20); saveDB(); renderDashboard();
      // 백그라운드 함수는 CORS 응답을 못 주므로 no-cors(단순 요청)로 보내고, 상태는 /api/homework 로 확인한다
      try{ await fetch((window.HW_API||TUTOR_API)+'/.netlify/functions/homework-background',{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify({id:learnerId(),jobId,images,note})}); }
      catch(e){ const j=DB.hwJobs.find(x=>x.jobId===jobId); if(j){ j.status='error'; j.error='보내기 실패(인터넷 확인)'; } saveDB(); renderDashboard(); return; }
      pollHomework(jobId);
    });
  };
  window.pollHomework=async function(jobId){
    let unknown=0;
    for(let k=0;k<45;k++){ await new Promise(r=>setTimeout(r,6000));
      try{ const r=await fetch((window.HW_API||TUTOR_API)+'/api/homework?id='+encodeURIComponent(learnerId())+'&job='+jobId); const j=await r.json(); const job=j.job||{}; const rec=(DB.hwJobs||[]).find(x=>x.jobId===jobId);
        if(job.status==='unknown'&&++unknown>=6){ if(rec){ rec.status='error'; rec.error='서버에 닿지 못했어요. 다시 시도해 주세요'; saveDB(); renderDashboard(); } return; }
        if(job.status==='done'||job.status==='error'){ if(rec){ rec.status=job.status; rec.error=job.error; rec.title=job.title; rec.count=job.count; } await fetchHomework(true); saveDB(); if(document.querySelector('.topbar .t')?.textContent.includes('공부 기록')) renderDashboard(); if(job.status==='done') alert(`숙제가 만들어졌어요! "${job.title}" ${job.count}문제 — 아이 폰에 과제로 나타나요 📚`); return; }
      }catch(e){}
    }
  };
  window.removeHomework=async function(jobId){ if(!confirm('이 숙제 세트를 지울까요?')) return; try{ const r=await fetch(TUTOR_API+'/api/homework',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:learnerId(),action:'remove',jobId})}); const j=await r.json(); if(j.sets){ DB.hw=DB.hw||{done:{}}; DB.hw.sets=j.sets; } DB.hwJobs=(DB.hwJobs||[]).filter(x=>x.jobId!==jobId); saveDB(); }catch(e){} renderDashboard(); };
  window.parentHomeworkHTML=function(){
    const sets=(DB.hw&&DB.hw.sets)||[], done=(DB.hw&&DB.hw.done)||{}, jobs=DB.hwJobs||[];
    const pending=jobs.filter(j=>j.status==='pending').map(j=>`<div class="logrow"><span>⏳ 만드는 중… (1~2분)</span><span class="d">${fmtAgo(j.t)}</span></div>`).join('');
    const errs=jobs.filter(j=>j.status==='error').map(j=>`<div class="logrow"><span style="color:#e8503a">⚠️ ${j.error||'오류'}</span><span class="d">${fmtAgo(j.t)}</span></div>`).join('');
    const rows=sets.map(s=>{ const d=done[s.jobId]; return `<div class="cat-row" style="padding:8px 0;border-bottom:1px solid #f1e6d8">
      <div class="lab"><span>📚 ${s.title} <span style="color:var(--soft);font-size:12px">${s.problems.length}문제 · ${fmtAgo(s.t)}</span></span><span>${d?`✅ ${d.correct}/${d.total}`:'⬜ 아직'}</span></div>
      ${s.source&&s.source.length?`<details style="margin:4px 0"><summary style="font-size:13px;color:#2e6fd1;font-weight:800;cursor:pointer">🔍 사진에서 읽은 문제와 원인 ${s.source.length}개</summary>${s.source.map(x=>`<div style="font-size:13px;margin:6px 0 0;padding:6px 8px;background:#fff9f0;border-radius:10px"><b>${x.q}</b><br>아이 답: <span style="color:#e8503a">${x.kidAnswer||'?'}</span> · 정답: ${x.correct}<br><span style="color:#7a4a1e">💭 ${x.why}</span></div>`).join('')}</details>`:''}
      ${d&&d.wrongQs&&d.wrongQs.length?`<div style="font-size:12.5px;color:#e8503a;margin-top:4px">틀린 것: ${d.wrongQs.slice(0,4).join(' / ')}</div>`:''}
      <button class="wpill" style="margin-top:6px;border-color:#e8503a;color:#e8503a" onclick="removeHomework('${s.jobId}')">삭제</button></div>`; }).join('');
    return `<div class="card"><h3>📸 사진으로 숙제 만들기</h3>
      <p style="font-size:13.5px;color:var(--soft);margin:0 0 10px">문제집에서 <b>틀린 문제</b>가 보이게 찍어 올리면(최대 3장), 선생님이 왜 틀렸는지 읽고 <b>비슷한 문제 8~12개</b>를 만들어 아이 폰 과제에 넣어요. 사진은 저장하지 않아요.</p>
      <button class="bigbtn" style="background:#2e86de" onclick="document.getElementById('hwfile').click()">📸 사진 고르기 (앨범·카메라)</button>
      <input type="file" id="hwfile" accept="image/*" multiple style="display:none" onchange="createHomeworkFromPhotos(this)">
      ${pending}${errs}
      <div style="margin-top:10px">${rows||'<p style="color:var(--soft);font-size:13px">아직 만든 숙제가 없어요.</p>'}</div>
      <button class="bigbtn ghost" onclick="fetchHomework(true).then(()=>renderDashboard())">🔄 새로 고침</button>
    </div>`;
  };
})();
