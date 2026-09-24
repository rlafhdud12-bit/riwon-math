/* =========================================================
   ✍️ 식 쓰며 풀기 (풀이 노트) — 2026-09-24
   암산 대신 식을 한 줄씩 적어 답을 낸다: 10×2=20 → 7×2=14 → 20+14=34
   - 📝 식 줄: 숫자·+ − × ÷ = 키패드, ↵ 새 줄. 채점 뒤 줄마다 ✓/✗ 와 "어느 줄에서 달라졌는지".
   - 🧮 세로셈: 덧셈·뺄셈(4자리까지)·곱셈(× 한 자리) 칸 + 올림/빌림 칸. 한 칸에 한 숫자라 14를 통째로 못 씀.
   - 아이가 쓴 식은 c.work → 오답 기록 DB.miss[].w · 풀이 기록 DB.workLog · 통계 DB.workStat → 리포트에서 클로드가 생각 과정을 추론.
   - 식 쓰기 모드(부모 설정, 서버 settings.workMode 또는 DB.workMode):
       free = 버튼만 · auto(기본) = 계산 문제면 노트가 열려 있고, 틀린 문제를 다시 풀 땐 식 필수 · must = 계산 문제는 식 필수
   엔진 훅: renderCard→workMount · press→workKey · submit→workBeforeSubmit/workCollect/workFeedback · addWrong→c.work
   엔진·expr 뒤, ui 앞에 로드.
   ========================================================= */
(function(){
  const st=document.createElement('style'); st.textContent=`
  .wk-open{margin:12px auto 2px;background:#fff;border:2px dashed #f39c12;color:#b7791f;border-radius:14px;padding:8px 14px;font-weight:900;font-size:14.5px}
  .wk{margin:12px 0 4px;text-align:left;border:2px solid #f1e6d8;border-radius:16px;background:#fffdf8;overflow:hidden}
  .wk.focus{border-color:#f39c12;box-shadow:0 0 0 3px #fde7c4}
  .wk-tabs{display:flex;gap:6px;align-items:center;padding:7px 8px;background:#fff6e8;border-bottom:2px solid #f1e6d8}
  .wk-tabs button{background:#fff;border:2px solid #eee;border-radius:11px;padding:5px 10px;font-weight:900;font-size:13.5px;color:var(--soft)}
  .wk-tabs button.on{border-color:#f39c12;color:#b7791f}
  .wk-tabs .x{margin-left:auto;border:none;background:none;color:var(--soft);font-size:13px}
  .wk-tabs .req{margin-left:auto;font-size:12px;font-weight:800;color:#b7791f}
  .wk-lines{padding:4px 10px 8px;min-height:84px;background:repeating-linear-gradient(#fffdf8 0 37px,#f3e3cc 37px 38px)}
  .wk-line{display:flex;align-items:center;gap:8px;height:38px;font-size:22px;font-weight:900;letter-spacing:.5px;color:var(--ink)}
  .wk-line .n{font-size:11px;color:#c9b79c;width:14px;text-align:right;font-weight:800}
  .wk-line .tx{white-space:nowrap;overflow-x:auto}
  .wk-line .tx .o{color:var(--c-dark);margin:0 3px}
  .wk-line .ph{color:#c9bca8;font-size:14.5px;font-weight:700}
  .wk-line.cur .tx::after{content:'';display:inline-block;width:3px;height:24px;background:#f39c12;margin-left:3px;vertical-align:-4px;animation:wkblink 1s steps(2) infinite}
  .wk:not(.focus) .wk-line.cur .tx::after{visibility:hidden}
  @keyframes wkblink{50%{opacity:0}}
  .wk-line .mk{margin-left:auto;font-size:14px;font-weight:900;white-space:nowrap}
  .wk-line .mk.ok{color:#19a974} .wk-line .mk.no{color:#e8503a}
  .wk-line.bad{background:#fdecea;border-radius:8px}
  .wk-tip{font-size:12.5px;color:var(--soft);padding:0 10px 8px;font-weight:700}
  .wk-msg{margin-top:8px;background:#fff6e8;border:2px solid #fde2b8;border-radius:12px;padding:8px 10px;font-size:14px;color:#7a4a1e;text-align:left;font-weight:700}
  .wk-col{display:grid;gap:5px;justify-content:center;padding:10px 6px}
  .wk-col .c{width:40px;height:44px;border:2px solid #eee;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:23px;font-weight:900;background:#fff;position:relative}
  .wk-col .c.blank{border-color:transparent;background:none}
  .wk-col .c.in{border-color:#f5c98a;cursor:pointer}
  .wk-col .c.h{height:32px;font-size:15px;color:#e8503a;border-style:dashed}
  .wk-col .c.sel{border-color:#f39c12;box-shadow:0 0 0 3px #fde7c4}
  .wk-col .c.ok{background:#e8f8f0;border-color:#19a974}
  .wk-col .c.no{background:#fdecea;border-color:#e8503a}
  .wk-col .c i{position:absolute;right:2px;bottom:0;font-size:10.5px;color:#19a974;font-style:normal}
  .wk-col .lab{font-size:11px;color:var(--soft);font-weight:800;display:flex;align-items:center;justify-content:flex-end}
  .wk-col .op{font-size:22px;color:var(--c-dark);font-weight:900;display:flex;align-items:center;justify-content:flex-end}
  .wk-col .ln{height:3px;background:var(--ink);border-radius:2px}
  .keypad.wk5{grid-template-columns:repeat(5,1fr);gap:7px}
  .keypad.wk5 .key{padding:12px 0;font-size:21px}
  .keypad.wk5 .key.op{color:var(--c-dark);background:#fff6e8}
  .keypad.wk5 .key.op:disabled{opacity:.3}
  .keypad.wk5 .key.nl{font-size:15px}
  .keypad.wk5 .s2{grid-column:span 2}
  .ans-box.focus{box-shadow:0 0 0 4px #fde7c4}
  .ans-box.ghost{color:#b9ad9c;font-style:italic}
  .ans-cap{font-size:11.5px;color:var(--soft);font-weight:700;min-height:14px}
  `; document.head.appendChild(st);

  const SYM=/[+−×÷=]/;
  const plainQ=c=>String((c&&c.q)||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
  const tok=s=>s.match(/\d+|[+−×÷]/g)||[];
  const fmt=s=>s.replace(/([+−×÷=])/g,'<span class="o">$1</span>');
  // 숫자 뒤 조사: 끝자리 읽기에 받침이 있으면(영·일·삼·육·칠·팔 / 십·백·천) 을·은·이
  const J=(n,a,b)=>String(n)+('013678'.includes(String(n).slice(-1))?a:b);
  const place=k=>['일','십','백','천','만'][k]+'의 자리';
  // 기본 = 필수(2026-09-24 대표 결정). 서버 설정이 우선 — 부모 폰에서만 바꾼다
  window.workModeNow=()=>(DB.remind&&DB.remind.workMode)||'must';
  // 계산이 필요한 문제 = 두 자리 이상 수가 나오는 문제(구구단 한 자리 곱은 암기라 제외)
  const eligible=c=>/\d{2,}/.test(plainQ(c));
  window.workEligible=eligible;

  /* ---------- 세로셈이 되는 문제인지 ---------- */
  function colSpec(c){
    const t=c.t||{}; let a,b,op;
    if(['mul','mul2','mulTens'].includes(t.k)&&t.a!=null&&t.b!=null){ a=+t.a; b=+t.b; op='×'; }
    else { const m=plainQ(c).match(/^(\d+) ?([+\-−×]) ?(\d+) ?= ?\?$/); if(!m) return null; a=+m[1]; b=+m[3]; op=m[2]==='-'?'−':m[2]; }
    if(op==='×'){ if(b>=10&&a<10) [a,b]=[b,a]; if(!(a>=10&&b<10)) return null; }
    else { if(Math.max(a,b)<10) return null; if(op==='−'&&a<b) return null; }
    if(String(a).length>4||String(b).length>4) return null;
    return {op,a,b};
  }
  function newCol(sp){
    const la=String(sp.a).length, lb=String(sp.b).length;
    const w=sp.op==='+'?Math.max(la,lb)+1:sp.op==='−'?la:la+1;
    return {op:sp.op,a:sp.a,b:sp.b,w,h:Array(w).fill(''),r:Array(w).fill(''),sel:{row:'r',i:w-1}};
  }
  const dg=(n,i,w)=>{ const s=String(n).padStart(w,' ')[i]; return s===' '?null:+s; };
  // 정답 세로셈: 결과 자릿수, 올림(윗칸 i = 오른쪽에서 올라온 수) / 빌림(빌리고 난 뒤 윗수)
  function colExpect(S){
    const w=S.w, res=S.op==='+'?S.a+S.b:S.op==='−'?S.a-S.b:S.a*S.b, R=String(res).padStart(w,' ').split('').map(x=>x===' '?'':x);
    const h=Array(w).fill(''), cin=Array(w).fill(0);
    if(S.op==='−'){ let bin=0; for(let i=w-1;i>=0;i--){ const x=dg(S.a,i,w)||0, y=dg(S.b,i,w)||0; let top=x-bin, bout=0; if(top<y){ top+=10; bout=1; } cin[i]=bin; if(top!==x) h[i]=String(top); bin=bout; } }
    else { let c=0; for(let i=w-1;i>=0;i--){ const x=dg(S.a,i,w)||0, y=S.op==='+'?(dg(S.b,i,w)||0):0; const v=S.op==='+'?x+y+c:x*S.b+c; cin[i]=c; c=Math.floor(v/10); if(i>0&&c) h[i-1]=String(c); } }
    return {res,R,h,cin};
  }
  const colResult=()=>{ const S=W&&W.col; if(!S) return null; const s=S.r.join('').replace(/^0+(?=\d)/,''); return /^\d+$/.test(s)?s:null; };
  function colDiagnose(S){
    const E=colExpect(S), w=S.w;
    for(let i=w-1;i>=0;i--){
      const got=S.r[i], exp=E.R[i]; if(got===exp||(got===''&&exp==='')||(got==='0'&&exp===''&&i<w-1)) continue;
      const k=w-1-i, x=dg(S.a,i,w)||0, y=dg(S.b,i,w)||0, c=E.cin[i];
      if(S.op==='×'){ const raw=x*S.b;
        if(c&&got===String(raw%10)) return {dx:'carryAdd', m:`${place(k)}: ${x}×${S.b}=${raw}에 오른쪽에서 올린 ${J(c,'을','를')} 더하지 않았어 → ${raw}+${c}=${raw+c}`};
        if(E.h[i-1]&&!S.h[i-1]&&i>0) return {dx:'noCarry', m:`${place(k)}: ${x}×${S.b}${c?'+'+c:''}=${raw+c}. 한 칸엔 ${(raw+c)%10}만 쓰고 ${J(Math.floor((raw+c)/10),'은','는')} 윗자리 올림 칸에 올려야 해`};
        return {dx:'digit', m:`${place(k)} 계산이 달라졌어: ${x}×${S.b}${c?'+'+c:''}=${raw+c}`}; }
      if(S.op==='+'){ const raw=x+y;
        if(c&&got===String(raw%10)) return {dx:'carryAdd', m:`${place(k)}: ${x}+${y}에 올린 ${J(c,'을','를')} 더하지 않았어 → ${raw+c}`};
        if(raw+c>=10&&i>0&&!S.h[i-1]) return {dx:'noCarry', m:`${place(k)}: ${x}+${y}${c?'+'+c:''}=${raw+c}. ${(raw+c)%10}만 쓰고 1은 윗자리로 올려야 해`};
        return {dx:'digit', m:`${place(k)} 계산이 달라졌어: ${x}+${y}${c?'+'+c:''}=${raw+c}`}; }
      const top=x-c;
      if(top<y&&got===String(y-top)) return {dx:'reverseSub', m:`${place(k)}: ${top}에서 ${J(y,'을','를')} 뺄 수 없어서 거꾸로 ${y}−${J(top,'을','를')} 했어. 윗자리에서 10을 빌려 와서 ${top+10}−${y}=${top+10-y}`};
      if(c&&got===String(x-y)) return {dx:'borrowNoDec', m:`${place(k)}: 옆자리에 10을 빌려 줬으니 ${J(x,'은','는')} ${J(x-1,'이','가')} 돼야 해 → ${x-1}−${y}`};
      return {dx:'digit', m:`${place(k)} 계산이 달라졌어`};
    }
    return null;
  }

  /* ---------- 식 줄 검사 ---------- */
  function checkLine(s){
    const parts=s.split('='); if(parts.length<2) return {ok:null};
    const vals=parts.map(p=>{ const t=tok(p); return t.length?evalTokens(t):null; });
    for(let i=0;i<vals.length-1;i++){ if(vals[i]==null||vals[i+1]==null) continue; if(vals[i]!==vals[i+1]) return {ok:false, left:parts[i].trim(), want:vals[i], got:vals[i+1]}; }
    return {ok:vals.some(v=>v!=null)?true:null};
  }
  const lastResult=()=>{ if(!W) return null; const L=W.lines.map(s=>s.trim()).filter(Boolean); if(!L.length) return null; const p=L[L.length-1].split('='); const v=p[p.length-1].trim(); return /^\d+$/.test(v)?v:null; };
  const lineResults=lines=>lines.map(s=>{ const p=s.split('='); const v=p[p.length-1].trim(); return /^\d+$/.test(v)?v:null; }).filter(Boolean);
  function lineDiagnose(lines,chk,c,ok){
    const bad=chk.findIndex(x=>x.ok===false);
    if(bad>=0){ const x=chk[bad]; const prev=chk.slice(0,bad).filter(y=>y.ok).length;
      return {dx:'calc', m:`${prev?`${bad}번째 줄까지는 맞았어. `:''}${bad+1}번째 줄 "${lines[bad]}"에서 달라졌어 → ${x.left} = <b>${x.want}</b>`}; }
    if(ok) return {dx:'ok', m:''};
    const given=String(c.given), last=lastResult(), rs=lineResults(lines);
    // 자릿값: 17×2 를 7×2, 1×2 로 쪼갰는데 1이 사실 10(십의 자리)인 걸 놓침
    const sp=W&&W.spec; let placeMsg='', placeErr=false;
    if(sp&&sp.op==='×'&&sp.a>=10&&sp.a<100){ const td=Math.floor(sp.a/10), tv=td*10, on=sp.a%10;
      const re=new RegExp(`(^|[^0-9])(${td}×${sp.b}|${sp.b}×${td})(?![0-9])`);
      placeErr=lines.some(s=>re.test(s))&&!lines.some(s=>s.includes(`${tv}×`)||s.includes(`×${tv}`));
      placeMsg=`${sp.a}의 ${J(td,'은','는')} <b>십의 자리</b> 숫자라서 사실 ${tv}이야 → ${tv}×${sp.b}=${tv*sp.b}, ${on}×${sp.b}=${on*sp.b}, 두 개를 더하면 ${tv*sp.b}+${on*sp.b}=<b>${sp.a*sp.b}</b>`; }
    if(!c.choices&&rs.length>=2&&(given===rs.join('')||given===rs.slice().reverse().join('')))
      return {dx:'concat', m:`줄마다 나온 답(${rs.join(', ')})을 옆에 붙여 ${J(given,'이라고','라고')} 썼어. ${placeMsg||'각 줄의 답은 자릿값을 생각해서 <b>더해야</b> 해'}`};
    if(placeErr) return {dx:'place', m:`계산은 맞았는데 자릿값을 놓쳤어. ${placeMsg}`};
    if(last!=null&&String(c.a)===last&&!c.choices&&given!==last) return {dx:'copy', m:`식은 맞았는데 답 칸에 옮길 때 달라졌어 (${last} → ${given})`};
    if(chk.some(x=>x.ok)) return {dx:'plan', m:'계산은 다 맞았어! 그런데 식을 세운 방법이 문제와 달라. 무엇을 구하는지 다시 읽고 식을 세워 보자'};
    return {dx:'none', m:''};
  }

  /* ---------- 상태·그리기 ---------- */
  let W=null;
  const hasWork=()=>!!W&&(W.lines.some(s=>s.trim())||(!!W.col&&(W.col.r.some(Boolean)||W.col.h.some(Boolean))));
  window.workMount=function(P){
    const c=P.cur, el=document.getElementById('work'); if(!el){ W=null; return; }
    const mode=workModeNow(), elig=eligible(c), spec=colSpec(c);
    W={c, eligible:elig, required:elig&&(mode==='must'||(mode==='auto'&&!!(c.retry||c.fromWrong))), open:elig&&mode!=='free',
       tab:'line', target:'note', lines:[''], cur:0, spec, col:spec?newCol(spec):null, done:false, t0:Date.now(), marks:null, cmarks:null};
    const ans=document.getElementById('ans'); if(ans){ ans.style.cursor='pointer'; ans.onclick=()=>workFocus('ans'); }
    draw();
  };
  function draw(){
    if(!W) return; const el=document.getElementById('work'); if(!el) return;
    if(!W.open){ el.innerHTML=`<button class="wk-open" onclick="workOpen()">✍️ 식 쓰며 풀기</button>`; padSwap(); ansView(); return; }
    const tabs=`<div class="wk-tabs"><button class="${W.tab==='line'?'on':''}" onclick="workTab('line')">📝 식</button>${W.spec?`<button class="${W.tab==='col'?'on':''}" onclick="workTab('col')">🧮 세로셈</button>`:''}${W.required&&!W.done?'<span class="req">✍️ 식을 써야 답을 낼 수 있어</span>':W.done?'':'<button class="x" onclick="workClose()">접기 ✕</button>'}</div>`;
    let body='';
    if(W.tab==='line'){
      const L=W.lines; const empty=L.length===1&&!L[0];
      body=`<div class="wk-lines" onclick="workFocus('note')">${L.map((s,i)=>{ const m=W.marks&&W.marks[i];
        const mk=m&&m.ok===true?'<span class="mk ok">✓</span>':m&&m.ok===false?`<span class="mk no">✗ ${m.left} = ${m.want}</span>`:'';
        return `<div class="wk-line ${i===W.cur&&!W.done?'cur':''} ${m&&m.ok===false?'bad':''}" onclick="event.stopPropagation();workLine(${i})"><span class="n">${i+1}</span><span class="tx">${empty&&i===0&&!W.done?'<span class="ph">문제의 수로 식을 써 봐 · 한 줄에 계산 하나!</span>':fmt(s)}</span>${mk}</div>`; }).join('')}</div>
        ${W.done?'':`<div class="wk-tip">${W.c.choices?'식으로 계산한 뒤 답을 골라.':'↵ 새 줄 · 마지막 줄의 = 뒤 숫자가 답이 돼. 답 칸을 누르면 바로 쓸 수도 있어.'}</div>`}`;
    } else {
      const S=W.col, E=W.done?colExpect(S):null, w=S.w;
      const cell=(row,i)=>{ const v=row==='h'?S.h[i]:S.r[i]; const sel=!W.done&&W.target==='note'&&S.sel&&S.sel.row===row&&S.sel.i===i;
        let cls='c in'+(row==='h'?' h':'')+(sel?' sel':''); let extra='';
        if(E){ const exp=row==='h'?E.h[i]:E.R[i]; if(v!==''||exp!==''){ const good=v===exp||(row==='r'&&v==='0'&&exp===''&&i<w-1); if(row==='r'||v!==''||!good) cls+=good?' ok':' no'; if(!good&&exp!=='') extra=`<i>${exp}</i>`; } }
        return `<div class="${cls}" onclick="workCell('${row}',${i})">${v}${extra}</div>`; };
      const num=n=>Array.from({length:w},(_,i)=>{ const d=dg(n,i,w); return `<div class="c ${d==null?'blank':''}">${d==null?'':d}</div>`; }).join('');
      const bnum=S.op==='×'?Array.from({length:w},(_,i)=>`<div class="c ${i<w-1?'blank':''}">${i<w-1?'':S.b}</div>`).join(''):num(S.b);
      body=`<div class="wk-col" style="grid-template-columns:30px repeat(${w},40px)" onclick="workFocus('note')">
        <div class="lab">${S.op==='−'?'빌린 뒤':'올림'}</div>${Array.from({length:w},(_,i)=>cell('h',i)).join('')}
        <div></div>${num(S.a)}
        <div class="op">${S.op}</div>${bnum}
        <div class="ln" style="grid-column:1/-1"></div>
        <div class="lab">답</div>${Array.from({length:w},(_,i)=>cell('r',i)).join('')}</div>
        ${W.done?'':`<div class="wk-tip">${S.op==='−'?'일의 자리부터! 모자라면 윗자리에서 10을 빌려 와 (빌린 뒤 수를 위 칸에).':'일의 자리부터! 10이 넘으면 한 칸엔 일의 자리만, 나머지는 윗자리 올림 칸에.'} 칸을 누르고 숫자를 눌러.</div>`}`;
    }
    el.innerHTML=`<div class="wk ${W.target==='note'&&!W.done?'focus':''}">${tabs}${body}</div>`;
    padSwap(); ansView();
  }
  function padSwap(){
    const pc=document.getElementById('play-controls'); if(!pc||!W||W.done) return;
    let kp=pc.querySelector('.keypad'); const isC=!!W.c.choices;
    if(!W.open){ if(kp&&kp.classList.contains('wk5')){ if(isC) kp.remove(); else { kp.className='keypad'; kp.innerHTML=basicKeys(); } } return; }
    if(!kp){ kp=document.createElement('div'); pc.insertBefore(kp,pc.firstChild); }
    kp.className='keypad wk5'; const ansT=W.target==='ans', col=W.tab==='col', offOp=ansT||col;
    const k=(v,l,cls='')=>`<button class="key ${cls}" onclick="press('${v}')">${l}</button>`;
    const o=v=>`<button class="key op" ${offOp?'disabled':''} onclick="press('${v}')">${v}</button>`;
    kp.innerHTML=k(7,7)+k(8,8)+k(9,9)+o('+')+k('del','⌫','del')
      +k(4,4)+k(5,5)+k(6,6)+o('−')+`<button class="key nl" ${offOp?'disabled':''} onclick="press('nl')">↵ 줄</button>`
      +k(1,1)+k(2,2)+k(3,3)+o('×')+o('=')
      +`<button class="key s2" onclick="press('0')">0</button>`+o('÷')
      +(isC?`<button class="key s2 del" onclick="press('clr')">🧽 다 지우기</button>`:`<button class="key ok s2" onclick="press('ok')">확인</button>`);
  }
  const basicKeys=()=>[1,2,3,4,5,6,7,8,9].map(d=>`<button class="key" onclick="press('${d}')">${d}</button>`).join('')+`<button class="key del" onclick="press('del')">⌫</button><button class="key" onclick="press('0')">0</button><button class="key ok" onclick="press('ok')">확인</button>`;
  function ansView(){
    const a=document.getElementById('ans'); if(!a||!W||W.done) return; const P=PLAY; if(!P) return;
    a.classList.toggle('focus',W.open&&W.target==='ans');
    const r=W.open?(W.tab==='col'?colResult():lastResult()):null;
    if(P.buf===''&&r!=null){ a.textContent=r; a.classList.add('ghost'); a.classList.remove('empty'); }
    else { a.classList.remove('ghost'); a.textContent=P.buf===''?'?':P.buf; a.classList.toggle('empty',P.buf===''); }
    let cap=document.getElementById('ans-cap'); if(!cap){ cap=document.createElement('div'); cap.id='ans-cap'; cap.className='ans-cap'; a.after(cap); }
    cap.textContent=P.buf===''&&r!=null?'확인을 누르면 식의 답으로 내요':'';
  }
  window.workOpen=function(){ if(!W) return; W.open=true; W.target='note'; draw(); };
  window.workClose=function(){ if(!W||W.required) return; W.open=false; W.target='note'; draw(); };
  window.workTab=function(t){ if(!W||W.done) return; W.tab=t; W.target='note'; draw(); };
  window.workFocus=function(t){ if(!W||W.done||!W.open) return; if(t==='ans'&&W.c.choices) return; W.target=t; draw(); };
  window.workLine=function(i){ if(!W||W.done) return; W.cur=i; W.target='note'; draw(); };
  window.workCell=function(row,i){ if(!W||W.done||!W.col) return; W.col.sel={row,i}; W.target='note'; draw(); };

  /* ---------- 입력 (엔진 press 가 먼저 부름) ---------- */
  window.workKey=function(k){
    if(!W||!W.open||W.done||k==='ok') return false;
    if(W.target==='ans'){ if(/^\d$|^del$/.test(k)){ setTimeout(ansView,0); return false; } return true; } // 답 칸: 숫자·⌫는 엔진이 처리, 기호는 무시
    const P=PLAY; if(P&&P.pausing&&typeof paceEdit==='function') paceEdit(P,false); // 🐢 멈춘 뒤 식을 쓰면 다시 생각하는 것
    if(W.tab==='col') colKey(k); else lineKey(k);
    draw(); return true;
  };
  function lineKey(k){
    const L=W.lines; const s=L[W.cur];
    if(k==='del'){ if(s) L[W.cur]=s.slice(0,-1); else if(W.cur>0){ L.splice(W.cur,1); W.cur--; } }
    else if(k==='nl'){ if(s.trim()&&L.length<8){ L.splice(W.cur+1,0,''); W.cur++; } }
    else if(k==='clr'){ W.lines=['']; W.cur=0; }
    else if(s.length<26){
      const sym=SYM.test(k), last=s.slice(-1);
      if(sym&&!s) return;                                   // 줄 맨 앞 기호 막기
      if(sym&&SYM.test(last)){ if(last!=='='&&k!=='=') L[W.cur]=s.slice(0,-1)+k; return; } // 기호 연속 → 바꾸기
      L[W.cur]=s+k;
    }
  }
  function colKey(k){
    const S=W.col; if(k==='clr'){ W.col=newCol(W.spec); return; } if(!/^\d$|^del$/.test(k)||!S.sel) return;
    const {row,i}=S.sel; if(i<0||i>=S.w) return;
    if(row==='h'){ let v=S.h[i]; if(k==='del') v=v.slice(0,-1); else if(v.length<2) v+=k; S.h[i]=v; }
    else if(k==='del') S.r[i]='';
    else { S.r[i]=k; if(i>0) S.sel={row:'r',i:i-1}; }
  }

  /* ---------- 제출 전·후 (엔진 submit 이 부름) ---------- */
  /* ---------- 🛡 대충 쓰기 막기 (식 필수일 때) ----------
     초등학생이 찾을 만한 우회로: 답만 쓰기("34") · 아무 식("1+1=2") · 식은 쓰고 답은 암산으로 따로 · "17×2=?" 처럼 = 뒤를 비우기
     · 틀린 뒤 보여 준 정답을 외워 한 줄로 쓰기 → 아래 규칙으로 막는다(틀린 식은 막지 않는다 — 틀려도 생각이 보이면 된다) */
  // 식에 써도 되는 "문제와 관련된 수" = 문제의 수 그대로 + 자릿값으로 쪼갠 수(17 → 10, 7) + 단위 환산 수(60·10·100·1000)
  // (17의 '1'처럼 맨 앞 숫자 하나만은 안 됨 → "1+1=2" 같은 아무 식이 통과하지 않게)
  const FACTORS=[10,100,1000,60];
  function seeds(c){ const s=new Set(FACTORS.map(String)); (plainQ(c).match(/\d+/g)||[]).forEach(n=>{ const d=String(+n); s.add(d); for(let i=0;i<d.length;i++){ const p=+d[i]*Math.pow(10,d.length-1-i); if(p) s.add(String(p)); } }); return s; }
  // 제대로 된 식 한 줄 = 첫 = 앞에 기호가 있고, = 뒤에 숫자가 있음 (예: 10×2=20)
  const validLine=s=>{ const p=s.split('='); return p.length>=2&&/[+−×÷]/.test(p[0])&&/\d/.test(p[0])&&/^\d+$/.test(p[p.length-1].trim()); };
  const leftNums=s=>(s.split('=')[0].match(/\d+/g)||[]).map(n=>String(+n));
  function workCheck(P){
    const c=W.c, S=seeds(c), lines=W.lines.map(s=>s.trim()).filter(Boolean);
    const good=lines.filter(validLine), related=good.filter(s=>leftNums(s).some(n=>S.has(n)));
    const E=W.col?colExpect(W.col):null, colFull=!!W.col&&E&&E.R.every((d,i)=>d===''||W.col.r[i]!=='');
    if(!related.length&&!colFull){
      if(lines.length&&!good.length) return '✍️ 식은 "수 기호 수 = 답"처럼 써 줘. 예) 문제의 수로 □ + □ = □';
      if(good.length) return '✍️ 문제에 나온 수로 식을 세워 줘! 문제와 상관없는 식은 안 돼';
      return W.col&&W.tab==='col'?'🧮 세로셈 답 칸을 끝까지 채워 줘':'✍️ 먼저 식을 한 줄 써 줘! 어떻게 계산할지 적으면 실수가 줄어';
    }
    // 틀렸던 유형을 다시 풀 땐 한 단계씩(두 줄 이상 또는 세로셈)
    if((c.retry||c.fromWrong)&&related.length<2&&!colFull) return '✍️ 틀렸던 문제는 한 번에 말고 <b>한 단계씩</b> 두 줄 이상 써 줘 (또는 🧮 세로셈)';
    // 답은 식에서 나와야 한다
    const results=new Set([...good.map(s=>{ const p=s.split('='); return String(+p[p.length-1].trim()); }), ...(colFull&&colResult()?[String(+colResult())]:[])]);
    if(!c.choices){ const a=P.buf===''?null:String(+P.buf);
      // 식의 결과를 이어 붙인 답(7×2=14, 1×2=2 → 214)은 아이의 실제 생각이라 받는다 — 그래야 오개념이 기록된다. 암산 답은 안 받음
      const rs=[...results], glued=rs.some(x=>rs.some(y=>x!==y&&(x+y===a))) ;
      if(a!=null&&!results.has(a)&&!glued) return `✍️ 답 ${J(a,'이','가')} 식에 없어! 식의 마지막 줄이 답이 되게 써 줘`; }
    else { const txt=String(c.choices[+P.buf]??''); const nums=txt.match(/\d+/g); const all=new Set([...results, ...good.flatMap(leftNums)]);
      if(nums&&!nums.some(n=>all.has(String(+n)))) return '✍️ 고른 답이 식과 이어지지 않아. 식으로 계산한 수로 골라 줘'; }
    return '';
  }
  window.workBeforeSubmit=function(P){
    if(!W||W.c!==P.cur||W.done) return true;
    const typed=P.buf!=='';
    if(!typed&&!W.c.choices&&W.open){ const r=W.tab==='col'?colResult():lastResult(); if(r!=null) P.buf=String(r); }
    if(W.required){ const why=workCheck(P);
      if(why){ if(!typed||W.c.choices) P.buf=''; W.open=true; W.target='note'; draw();
        const s=DB.workStat=DB.workStat||{}; s.rej=(s.rej||0)+1; saveDB(); // 막힌 횟수(부모 화면·리포트)
        const fb=document.getElementById('fb'); if(fb){ fb.className='feedback'; fb.innerHTML=why; } return false; } }
    return true;
  };
  window.workCollect=function(P,c,ok){
    if(!W||W.c!==c) return undefined; W.done=true;
    const lines=W.lines.map(s=>s.trim()).filter(Boolean);
    const colUsed=!!W.col&&(W.col.r.some(Boolean)||W.col.h.some(Boolean));
    if(W.eligible){ const s=DB.workStat=DB.workStat||{}; const key=(lines.length||colUsed)?'w':'nw'; const x=s[key]=s[key]||{n:0,ok:0}; x.n++; if(ok) x.ok++; }
    if(!lines.length&&!colUsed){ W.open=false; draw(); return undefined; }
    const w={sec:Math.round((Date.now()-W.t0)/1000)}; let d={dx:ok?'ok':'none', m:''};
    if(lines.length){ w.l=lines; const chk=W.lines.map(s=>s.trim()?checkLine(s):{ok:null}); W.marks=chk; d=lineDiagnose(W.lines.filter(s=>s.trim()),chk.filter((_,i)=>W.lines[i].trim()),c,ok); }
    if(colUsed){ const S=W.col; w.col={op:S.op,a:S.a,b:S.b,h:S.h.join(','),r:S.r.join('')};
      const cd=!ok||W.tab==='col'?colDiagnose(S):null; if(cd&&(W.tab==='col'||!lines.length||d.dx==='ok'||d.dx==='none')) d=cd; }
    if(ok&&d.dx!=='calc') d={dx:'ok',m:''};
    w.dx=d.dx; if(d.m) w.m=d.m.replace(/<[^>]+>/g,'');
    W.msg=d.m; W.tab=colUsed&&(!lines.length||W.tab==='col')?'col':'line'; W.open=true;
    DB.workLog=DB.workLog||[]; DB.workLog.unshift({t:Date.now(), u:c.unitId||P.unitId, cat:c.cat, q:plainQ(c).slice(0,70), a:c.choices?c.choices[c.a]:c.a, g:c.given, ok, w});
    if(DB.workLog.length>80) DB.workLog.length=80;
    const a=document.getElementById('ans'); if(a) a.classList.remove('focus','ghost'); const cap=document.getElementById('ans-cap'); if(cap) cap.textContent='';
    draw(); return w;
  };
  window.workFeedback=function(c,fb,ok){
    if(!fb||!c.work) return;
    if(ok) fb.innerHTML+=`<div class="wk-msg">✍️ 식으로 풀었어! ${c.work.dx==='calc'?'(한 줄 계산이 틀렸는데 답은 맞았네 — '+W.msg+')':'👍'}</div>`;
    else if(W&&W.msg) fb.innerHTML+=`<div class="wk-msg">✍️ 풀이를 보니: ${W.msg}</div>`;
  };

  /* ---------- 기록 화면·부모 화면 ---------- */
  window.workSummaryHTML=function(){
    const s=DB.workStat||{}, w=s.w||{n:0,ok:0}, n=s.nw||{n:0,ok:0}; if(w.n+n.n<8) return '';
    const pc=x=>x.n?Math.round(x.ok/x.n*100)+'%':'-';
    return `<div class="card"><h3>✍️ 식 쓰고 풀기 vs 암산</h3><div class="dash-grid">
      <div class="dash-stat"><div class="v">${pc(w)}</div><div class="k">식 쓰고 푼 문제 (${w.n})</div></div>
      <div class="dash-stat"><div class="v">${pc(n)}</div><div class="k">암산으로 푼 문제 (${n.n})</div></div></div>
      <p class="dim" style="margin-top:6px">계산이 필요한 문제만 셌어요.${s.rej?` · 식 없이(또는 대충) 내려다 막힌 횟수 <b>${s.rej}</b>`:''}</p></div>`;
  };
  const DXN={calc:'식 안 계산 실수',place:'자릿값 놓침(십을 1로)',copy:'답 옮겨 쓰기 실수',plan:'식 세우기 오류',concat:'자릿값 무시(붙여 쓰기)',carryAdd:'올린 수 안 더함',noCarry:'올림 안 함',reverseSub:'거꾸로 빼기',borrowNoDec:'빌려 준 자리 안 줄임',digit:'자리 계산 실수',none:'식으로는 원인 불명'};
  window.workInsightHTML=function(limit){
    const ms=(DB.miss||[]).filter(m=>m.w).slice(0,limit||4); if(!ms.length) return '';
    const cnt={}; (DB.miss||[]).slice(0,60).forEach(m=>{ if(m.w&&m.w.dx) cnt[m.w.dx]=(cnt[m.w.dx]||0)+1; });
    const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>`<span class="seg" style="display:inline-block;margin:2px">${DXN[k]||k} ✗${v}</span>`).join('');
    const rows=ms.map(m=>{ const L=(m.w.l||[]).map(s=>{ const r=checkLine(s); return `<div style="font-weight:900;font-size:15px">${fmt(s)} ${r.ok===false?`<span style="color:#e8503a;font-size:12.5px">✗ ${r.left}=${r.want}</span>`:r.ok?'<span style="color:#19a974">✓</span>':''}</div>`; }).join('');
      const C=m.w.col?`<div style="font-size:13px;color:var(--soft)">🧮 세로셈 ${m.w.col.a}${m.w.col.op}${m.w.col.b} · 아이 답칸 ${m.w.col.r.replace(/^,+/,'')||'-'} · 올림칸 ${m.w.col.h.replace(/,/g,' ')||'-'}</div>`:'';
      return `<div style="border-top:1px dashed #eee;padding:8px 0"><div style="font-size:13.5px">${m.q.slice(0,40)} → <b>${m.a}</b> <span style="color:#e8503a">(아이 ${m.g})</span></div>${L}${C}${m.w.m?`<div class="dim" style="font-size:12.5px;margin-top:3px">→ ${m.w.m}</div>`:''}</div>`; }).join('');
    return `<div class="card"><h3>✍️ 풀이로 본 생각</h3>${top?`<div style="margin-bottom:4px">${top}</div>`:''}${rows}</div>`;
  };
  // 부모·아이 폰 공통 설정(서버 settings.workMode 로 두 폰이 같이 씀)
  window.workModeSettingHTML=function(){
    const m=workModeNow(), N={free:'자유',auto:'권장',must:'필수'};
    // 아이 폰에선 보기만(아이가 PIN을 알아내도 식 쓰기를 끌 수 없게) — 바꾸기는 부모 폰에서
    if(!DB.viewer) return `<div class="setrow"><div class="k">✍️ 식 쓰기: <b>${N[m]}</b><small>부모 폰(함께 보기)에서만 바꿀 수 있어요</small></div></div>`;
    const b=(v,l)=>`<button class="wpill" style="${m===v?'border-color:var(--c);color:var(--c-dark)':'opacity:.55'}" onclick="saveWorkMode('${v}')">${l}</button>`;
    return `<div class="setrow"><div class="k">✍️ 식 쓰기<small>필수: 계산 문제는 문제의 수로 세운 식을 써야 답을 냄(답은 식에서 나와야 함, 틀렸던 문제는 두 단계 이상) · 권장: 노트만 열어 둠 · 아이 폰은 앱을 열 때 반영</small></div><div style="display:flex;gap:6px">${b('free','자유')}${b('auto','권장')}${b('must','필수')}</div></div>`;
  };
  window.saveWorkMode=async function(m){
    if(!DB.viewer) return; DB.workMode=m; DB.remind=Object.assign({},DB.remind||{remindAt:'17:00',enabled:false},{workMode:m}); saveDB();
    try{ await fetch((window.HW_API||TUTOR_API)+'/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'settings',id:DB.viewer?DB.lid:learnerId(),workMode:m})}); }catch(e){}
    const t=document.querySelector('.topbar .t')?.textContent||''; if(t.includes('부모 설정')) renderSettings(true); else home();
  };
})();
