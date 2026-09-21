/* =========================================================
   초등노트 — 3학년 「시각과 시간」 집중 단원 (2026-09-21)
   교육과정: 2학년 [2수03-07~09] 몇 시 몇 분 읽기·1시간=60분·1일/1주일/1개월/1년
            3학년 [4수03-13~14] 1분=60초·초 단위 시각 읽기·초 단위 시간의 덧셈과 뺄셈
   시계를 어려워하는 아이를 위해 2학년 기초부터 3학년 덧셈뺄셈까지 한 단원에 담는다.
   오답마다 diag()로 "왜 그렇게 답했는지" 추측해 바로 알려준다(오답 원인 진단).
   엔진(index.html) 뒤에 로드. UNITS/MODULES/DISCOVER/INSIGHT/TALK/TUTOR/DIAG 에 등록.
   ========================================================= */
(function(){
  /* ---------- 단원 등록 (3학년, '길이와 시간' 바로 뒤) ---------- */
  const unit={id:'time', subj:'math', grade:3, emoji:'🕰️', name:'시각과 시간', sub:'시계 읽기 · 시간 계산', c:'#e056a0', cd:'#b8377f', gname:'시계게임'};
  const at=UNITS.findIndex(u=>u.id==='len'); UNITS.splice(at>=0?at+1:UNITS.length,0,unit);

  /* ---------- 도구 ---------- */
  const T=(h,m)=> m===0?`${h}시`:`${h}시 ${m}분`;
  const TS=(h,m,s)=> `${h}시 ${m}분 ${s}초`;
  const HM=(mins)=>{ const h=Math.floor(mins/60), m=mins%60; return h===0?`${m}분`:(m===0?`${h}시간`:`${h}시간 ${m}분`); };
  const MS=(secs)=>{ const m=Math.floor(secs/60), s=secs%60; return m===0?`${s}초`:(s===0?`${m}분`:`${m}분 ${s}초`); };
  // 정답 + 오답보기 후보 → 중복 없는 4개. 후보가 모자라면 extra()로 채움
  function pick4(correct, cands, extra){
    const set=[correct]; for(const c of cands){ if(set.length>=4)break; if(c!==undefined&&c!==null&&!set.includes(c)) set.push(c); }
    let guard=0; while(set.length<4&&guard++<50){ const e=extra(); if(!set.includes(e)) set.push(e); }
    const choices=shuffle(set); return {choices, a:choices.indexOf(correct)};
  }
  // 아날로그 시계 SVG (h: 1~12, m: 0~59, s: 초 선택)
  window.clockSVG=function(h,m,s,size){
    size=size||160; const cx=80,cy=80;
    let g='';
    for(let i=0;i<60;i++){ const a=i*6*Math.PI/180, big=i%5===0, r1=big?62:66, r2=70;
      g+=`<line x1="${(cx+r1*Math.sin(a)).toFixed(1)}" y1="${(cy-r1*Math.cos(a)).toFixed(1)}" x2="${(cx+r2*Math.sin(a)).toFixed(1)}" y2="${(cy-r2*Math.cos(a)).toFixed(1)}" stroke="${big?'#5a3d2b':'#c9b8a8'}" stroke-width="${big?2.5:1}"/>`; }
    for(let n=1;n<=12;n++){ const a=n*30*Math.PI/180; g+=`<text x="${(cx+52*Math.sin(a)).toFixed(1)}" y="${(cy-52*Math.cos(a)+5).toFixed(1)}" text-anchor="middle" font-size="14" font-weight="800" fill="#3d2b1f">${n}</text>`; }
    const ha=((h%12)*30+m*0.5)*Math.PI/180, ma=(m*6+(s||0)*0.1)*Math.PI/180;
    g+=`<line x1="${cx}" y1="${cy}" x2="${(cx+34*Math.sin(ha)).toFixed(1)}" y2="${(cy-34*Math.cos(ha)).toFixed(1)}" stroke="#e056a0" stroke-width="6" stroke-linecap="round"/>`;
    g+=`<line x1="${cx}" y1="${cy}" x2="${(cx+52*Math.sin(ma)).toFixed(1)}" y2="${(cy-52*Math.cos(ma)).toFixed(1)}" stroke="#2e86de" stroke-width="4" stroke-linecap="round"/>`;
    if(s!==undefined&&s!==null){ const sa=s*6*Math.PI/180; g+=`<line x1="${cx}" y1="${cy}" x2="${(cx+58*Math.sin(sa)).toFixed(1)}" y2="${(cy-58*Math.cos(sa)).toFixed(1)}" stroke="#e8503a" stroke-width="1.5"/>`; }
    g+=`<circle cx="${cx}" cy="${cy}" r="4" fill="#3d2b1f"/>`;
    return `<svg viewBox="0 0 160 160" width="${size}" height="${size}" style="display:block;margin:0 auto"><circle cx="80" cy="80" r="74" fill="#fffdf7" stroke="#5a3d2b" stroke-width="4"/>${g}</svg>`;
  };
  const legend=`<div style="font-size:12.5px;color:var(--soft);text-align:center;margin-top:4px"><span style="color:#e056a0">■</span> 짧은바늘=시 &nbsp; <span style="color:#2e86de">■</span> 긴바늘=분 &nbsp; <span style="color:#e8503a">■</span> 가는바늘=초</div>`;

  /* ---------- 오답 원인 진단 (아이가 쓴 답 → 왜 그랬을지 추측) ---------- */
  Object.assign(DIAG,{
    clockRead(t,g){ // 보기 문자열 비교
      if(g===T(t.m%12||12, t.h*5%60)) return '긴바늘과 짧은바늘을 서로 바꿔 읽은 것 같아. 짧은 게 "시", 긴 게 "분"!';
      if(g===T(t.h, Math.round(t.m/5))) return '긴바늘이 가리키는 숫자를 그대로 "분"으로 읽었구나. 그 숫자에 5를 곱해야 분이 돼!';
      if(g===T((t.h%12)+1, t.m)) return '짧은바늘이 숫자를 아직 지나지 않았어. 짧은바늘은 "지나온 숫자"를 읽어!';
      if(g===T(t.h-1<=0?12:t.h-1, t.m)) return '짧은바늘이 벌써 그 숫자를 지났어. 지나온 숫자 중 가장 큰 것이 "시"!';
      return null;
    },
    before(t,g){ const v=Number(g); if(v===t.m) return '"몇 분 전"은 60에서 빼야 해. 60 − 분 = 몇 분 전!'; if(v===60+t.m) return '60을 더한 게 아니라 60에서 빼는 거야.'; return null; },
    toMin(t,g){ const v=Number(g); if(v===t.h*100+t.m) return '1시간을 100분으로 계산했구나! 1시간은 60분이야.'; if(v===t.m) return '"시간"을 빠뜨렸어. 시간을 분으로 바꿔 더해야 해.'; if(v===t.h+t.m) return '시간과 분을 그냥 더했네. 1시간은 60분이니까 60씩 더해!'; return null; },
    toSec(t,g){ const v=Number(g); if(v===t.m*100+t.s) return '1분을 100초로 계산했구나! 1분은 60초야.'; if(v===t.s) return '"분"을 빠뜨렸어. 분을 초로 바꿔 더해야 해.'; if(v===t.m+t.s) return '분과 초를 그냥 더했네. 1분=60초니까 60씩!'; return null; },
    timeAdd(t,g){ const tot=t.h*60+t.m+t.add; const h=Math.floor(tot/60), m=tot%60;
      if(g===`${t.h}시간 ${t.m+t.add}분`||g===`${t.h}시간 ${t.m+t.add}분`) return '분이 60을 넘었어! 60분은 1시간으로 받아올려야 해.';
      if(g===HM(tot-60)) return '받아올림을 했는데 시간을 1 더하는 걸 빠뜨렸어.';
      if(g===HM(tot+60)) return '시간을 1 더 올렸어. 60분이 넘을 때만 1시간 올려!';
      return null; },
    timeSub(t,g){ const tot=t.h*60+t.m-t.sub;
      if(g===`${t.h-1}시간 ${t.m+60+ (t.m-t.sub<0?0:0) -t.sub+ (t.m-t.sub<0?0:0)}분`) return null;
      if(g===HM(tot+60)) return '받아내림을 했으면 시간에서 1을 빼야 해.';
      if(g===`${t.h}시간 ${Math.abs(t.m-t.sub)}분`) return '작은 수에서 큰 수를 빼려고 했구나. 분이 모자라면 1시간을 60분으로 바꿔 내려!';
      return null; },
    elapsed(t,g){ const s=t.h1*60+t.m1, e=t.h2*60+t.m2, d=e-s;
      if(g===HM(Math.abs(t.h2-t.h1)*60+Math.abs(t.m2-t.m1))) return '시는 시끼리, 분은 분끼리 그냥 뺐구나. 분이 모자랄 땐 1시간을 60분으로 바꿔서 빼야 해.';
      if(g===HM(d+60)||g===HM(d-60)) return '시간 계산이 1시간 어긋났어. 시계 그림으로 몇 바퀴 돌았는지 세어 봐.';
      return null; },
    ampm(t,g){ if(g&&g!==t.ans) return '낮 12시 전은 오전, 12시부터 밤 12시 전까지는 오후!'; return null; },
    h24(t,g){ const v=Number(g); if(v===t.h) return '오후 시각을 24시간으로 쓰려면 12를 더해야 해.'; if(v===t.h+24) return '24가 아니라 12를 더하는 거야.'; return null; },
  });

  /* ---------- 튜터(도와주세요) 대본 ---------- */
  Object.assign(TUTOR,{
    clockRead(t){ return [
      {type:'say',text:`시계에는 바늘이 두 개! <b>짧은바늘은 "시"</b>, <b>긴바늘은 "분"</b>이야.`,visual:clockSVG(t.h,t.m),more:`짧은바늘(분홍)이 어느 숫자를 <b>지났는지</b> 보면 "시", 긴바늘(파랑)은 숫자에 5를 곱하면 "분"이야.`},
      {type:'ask',text:`짧은바늘이 <b>지나온</b> 숫자 중 가장 큰 숫자는? (= 몇 시)`,a:t.h,reteach:`짧은바늘이 ${t.h}와 ${t.h%12+1} 사이에 있지? 지나온 쪽인 ${t.h}시!`},
      {type:'ask',text:`긴바늘이 가리키는 곳은 숫자 ${Math.floor(t.m/5)}에서 작은 눈금 ${t.m%5}칸 더 갔어. ${Math.floor(t.m/5)} × 5 + ${t.m%5} = ?`,a:t.m,reteach:`${Math.floor(t.m/5)}×5=${Math.floor(t.m/5)*5}, 거기에 ${t.m%5}을 더해 ${t.m}분.`},
      {type:'done',text:`그래서 <b>${T(t.h,t.m)}</b>! 이제 직접 골라보자 ✏️`,a:t.m},
    ];},
    before(t){ const left=60-t.m; return [
      {type:'say',text:`<b>${T(t.h,t.m)}</b>은 다음 정각 ${t.h%12+1}시까지 <b>얼마나 남았는지</b>로도 말할 수 있어.`,visual:clockSVG(t.h,t.m),more:`긴바늘이 12까지 가려면 몇 칸 남았을까? 60분에서 지금 분을 빼면 돼.`},
      {type:'ask',text:`60 − ${t.m} = ?`,a:left,reteach:`60−${t.m}=${left}.`},
      {type:'done',text:`그래서 <b>${t.h%12+1}시 ${left}분 전</b>! ✏️`,a:left},
    ];},
    toMin(t){ return [
      {type:'say',text:`<b>1시간 = 60분</b>. 그래서 ${t.h}시간은 60분이 ${t.h}번!`,more:`시간을 분으로 바꾸려면 60을 곱해. 100이 아니라 60이야!`},
      {type:'ask',text:`${t.h} × 60 = ?`,a:t.h*60,reteach:`${t.h}×60=${t.h*60}.`},
      {type:'ask',text:`거기에 남은 ${t.m}분을 더하면? ${t.h*60} + ${t.m} = ?`,a:t.h*60+t.m,reteach:`${t.h*60}+${t.m}=${t.h*60+t.m}.`},
      {type:'done',text:`<b>${HM(t.h*60+t.m)} = ${t.h*60+t.m}분</b> ✏️`,a:t.h*60+t.m},
    ];},
    toSec(t){ return [
      {type:'say',text:`<b>1분 = 60초</b>. ${t.m}분은 60초가 ${t.m}번!`,more:`분을 초로 바꾸려면 60을 곱해.`},
      {type:'ask',text:`${t.m} × 60 = ?`,a:t.m*60,reteach:`${t.m}×60=${t.m*60}.`},
      {type:'ask',text:`남은 ${t.s}초를 더하면? ${t.m*60} + ${t.s} = ?`,a:t.m*60+t.s,reteach:`${t.m*60}+${t.s}=${t.m*60+t.s}.`},
      {type:'done',text:`<b>${MS(t.m*60+t.s)} = ${t.m*60+t.s}초</b> ✏️`,a:t.m*60+t.s},
    ];},
    timeAdd(t){ const sum=t.m+t.add, carry=sum>=60; const tot=t.h*60+sum; return [
      {type:'say',text:`시간 더하기는 <b>분은 분끼리, 시간은 시간끼리</b>. 그런데 분이 60을 넘으면 <b>1시간으로 받아올림</b>!`,more:`돈으로 치면 10원 10개가 100원 하나가 되듯, 60분은 1시간 하나가 돼.`},
      {type:'ask',text:`먼저 분끼리: ${t.m} + ${t.add} = ?`,a:sum,reteach:`${t.m}+${t.add}=${sum}.`},
      carry?{type:'say',text:`${sum}분은 60을 넘었지? <b>60분 = 1시간</b>으로 올리면 1시간 ${sum-60}분. 시간은 ${t.h}+1 = <b>${t.h+1}</b>시간!`}:{type:'say',text:`${sum}분은 60보다 작으니 그대로! 시간은 ${t.h}시간 그대로.`},
      {type:'done',text:`<b>${HM(tot)}</b> ✏️`,a:tot},
    ];},
    timeSub(t){ const borrow=t.m<t.sub; const tot=t.h*60+t.m-t.sub; return [
      {type:'say',text:`시간 빼기도 <b>분은 분끼리</b>. 그런데 분이 모자라면 <b>1시간을 60분으로 바꿔 내려</b>!`,more:`${t.m}에서 ${t.sub}을 뺄 수 없으면, 시간 하나를 헐어서 60분을 빌려 와.`},
      borrow?{type:'ask',text:`1시간을 빌려 60분을 더하면 분은? ${t.m} + 60 = ?`,a:t.m+60,reteach:`${t.m}+60=${t.m+60}.`}:{type:'say',text:`${t.m}에서 ${t.sub}은 바로 뺄 수 있어!`},
      {type:'ask',text:`이제 빼자: ${borrow?t.m+60:t.m} − ${t.sub} = ?`,a:(borrow?t.m+60:t.m)-t.sub,reteach:`${(borrow?t.m+60:t.m)}−${t.sub}=${(borrow?t.m+60:t.m)-t.sub}.`},
      borrow?{type:'say',text:`시간은 하나 빌려줬으니 ${t.h}−1 = <b>${t.h-1}</b>시간.`}:{type:'say',text:`시간은 ${t.h}시간 그대로.`},
      {type:'done',text:`<b>${HM(tot)}</b> ✏️`,a:tot},
    ];},
    elapsed(t){ const s=t.h1*60+t.m1, e=t.h2*60+t.m2, d=e-s; const toNext=60-t.m1; return [
      {type:'say',text:`시작 <b>${T(t.h1,t.m1)}</b> → 끝 <b>${T(t.h2,t.m2)}</b>. 걸린 시간은 시계가 <b>얼마나 돌았는지</b>야.`,visual:`<div style="display:flex;gap:6px;justify-content:center">${clockSVG(t.h1,t.m1,null,110)}<div style="font-size:28px;align-self:center">→</div>${clockSVG(t.h2,t.m2,null,110)}</div>`,more:`한 번에 빼기 어려우면 <b>징검다리</b>로! 시작에서 다음 정각까지, 그다음 끝까지 나눠서 세어.`},
      {type:'ask',text:`${T(t.h1,t.m1)}에서 ${t.h1%12+1}시 정각까지 몇 분? 60 − ${t.m1} = ?`,a:toNext,reteach:`60−${t.m1}=${toNext}.`},
      {type:'ask',text:`${t.h1%12+1}시에서 ${T(t.h2,t.m2)}까지는 몇 분? (시간은 60씩)`,a:d-toNext,reteach:`${(t.h2-(t.h1+1))*60}+${t.m2}=${d-toNext}.`},
      {type:'say',text:`둘을 더하면 ${toNext} + ${d-toNext} = <b>${d}분 = ${HM(d)}</b>`},
      {type:'done',text:`걸린 시간은 <b>${HM(d)}</b>! ✏️`,a:d},
    ];},
    h24(t){ return [
      {type:'say',text:`하루는 <b>24시간</b>. 시계는 12까지밖에 없어서 한 바퀴 더 돌면 <b>오후</b>야.`,more:`오후 시각을 24시간 표시로 바꾸려면 <b>12를 더해</b>. 오후 3시 → 3+12 = 15시.`},
      {type:'ask',text:`오후 ${t.h}시 → ${t.h} + 12 = ?`,a:t.h+12,reteach:`${t.h}+12=${t.h+12}.`},
      {type:'done',text:`<b>${t.h+12}시</b>! ✏️`,a:t.h+12},
    ];},
  });

  /* ---------- 문제 생성기 ---------- */
  const rH=()=>rnd(1,12);
  const gens=[
    {cat:'정각·30분 읽기', make(){ const h=rH(), m=pick([0,30]); const t={k:'clockRead',h,m}; const other=m===0?30:0;
      const {choices,a}=pick4(T(h,m),[T(h,other),T(m===0?12:6,h*5%60),T(h%12+1,m)],()=>T(rH(),pick([0,30])));
      return {visual:clockSVG(h,m),q:`이 시계는 몇 시일까?<br><span style="font-size:13px;color:var(--soft)">짧은바늘=시 · 긴바늘=분</span>`,choices,a,hint:'긴바늘이 12면 "정각", 6이면 "30분"(반)!',t,diag:g=>DIAG.clockRead(t,g)}; }},
    {cat:'5분 단위 읽기', make(){ const h=rH(), m=rnd(1,11)*5; const t={k:'clockRead',h,m};
      const {choices,a}=pick4(T(h,m),[T(h,m/5),T(m/5===0?12:m/5,h*5%60),T(h%12+1,m)],()=>T(rH(),rnd(1,11)*5));
      return {visual:clockSVG(h,m),q:`몇 시 몇 분일까?`,choices,a,hint:'긴바늘이 가리키는 숫자 × 5 = 분!',t,diag:g=>DIAG.clockRead(t,g)}; }},
    {cat:'1분 단위 읽기', make(){ const h=rH(); let m=rnd(1,59); if(m%5===0)m+=1; if(m>59)m=58; const t={k:'clockRead',h,m};
      const {choices,a}=pick4(T(h,m),[T(h,Math.floor(m/5)*5),T(h,Math.ceil(m/5)*5%60),T(h%12+1,m)],()=>T(rH(),rnd(1,59)));
      return {visual:clockSVG(h,m),q:`몇 시 몇 분일까? (작은 눈금까지!)`,choices,a,hint:'큰 눈금(숫자)×5 에 작은 눈금 수를 더해!',t,diag:g=>DIAG.clockRead(t,g)}; }},
    {cat:'초 읽기', make(){ const h=rH(), m=rnd(0,59), s=rnd(1,11)*5; const t={k:'clockRead',h,m};
      const {choices,a}=pick4(TS(h,m,s),[TS(h,m,s/5),TS(h,s,m),TS(h%12+1,m,s)],()=>TS(rH(),rnd(0,59),rnd(1,11)*5));
      return {visual:clockSVG(h,m,s),q:`가는 빨간 바늘은 <b>초</b>! 몇 시 몇 분 몇 초일까?`,choices,a,hint:'초바늘도 숫자×5 = 초. 1분=60초!',t}; }},
    {cat:'몇 분 전', make(){ const h=rH(), m=rnd(45,58); const t={k:'before',h,m};
      return {visual:clockSVG(h,m),q:`${T(h,m)}은 <b>${h%12+1}시 몇 분 전</b>일까? (숫자만)`,a:60-m,hint:`${h%12+1}시까지 긴바늘이 몇 칸 남았지? 60 − ${m}`,t,diag:g=>DIAG.before(t,g)}; }},
    {cat:'시간→분', make(){ const h=rnd(1,3), m=rnd(1,11)*5; const t={k:'toMin',h,m};
      return {q:`${HM(h*60+m)} = ? <b>분</b>`,a:h*60+m,hint:`1시간=60분. ${h}×60 + ${m}`,t,diag:g=>DIAG.toMin(t,g)}; }},
    {cat:'분→시간', make(){ const h=rnd(1,3), m=rnd(1,11)*5; const tot=h*60+m; const t={k:'toMin',h,m};
      const {choices,a}=pick4(HM(tot),[`${h}시간 ${m+60}분`,HM(tot-60),`${Math.floor(tot/100)}시간 ${tot%100}분`],()=>HM(rnd(1,3)*60+rnd(1,11)*5));
      return {q:`${tot}분 = 몇 시간 몇 분?`,choices,a,hint:`60분씩 묶어 봐. ${tot}에서 60을 몇 번 뺄 수 있지?`,t}; }},
    {cat:'분→초', make(){ const m=rnd(1,4), s=rnd(1,11)*5; const t={k:'toSec',m,s};
      return {q:`${MS(m*60+s)} = ? <b>초</b>`,a:m*60+s,hint:`1분=60초. ${m}×60 + ${s}`,t,diag:g=>DIAG.toSec(t,g)}; }},
    {cat:'초→분', make(){ const m=rnd(1,4), s=rnd(1,11)*5; const tot=m*60+s; const t={k:'toSec',m,s};
      const {choices,a}=pick4(MS(tot),[`${m}분 ${s+60}초`,MS(tot-60),`${Math.floor(tot/100)}분 ${tot%100}초`],()=>MS(rnd(1,4)*60+rnd(1,11)*5));
      return {q:`${tot}초 = 몇 분 몇 초?`,choices,a,hint:`60초씩 묶어 봐.`,t}; }},
    {cat:'시간 더하기', make(){ const h=rnd(1,3), m=rnd(20,55), add=rnd(15,50); const tot=h*60+m+add; const t={k:'timeAdd',h,m,add};
      const {choices,a}=pick4(HM(tot),[`${h}시간 ${m+add}분`,HM(tot-60),HM(tot+60)],()=>HM(rnd(1,4)*60+rnd(0,59)));
      return {q:`${HM(h*60+m)} + ${add}분 = ?`,choices,a,hint:'분끼리 더하고, 60이 넘으면 1시간으로 올려!',t,diag:g=>DIAG.timeAdd(t,g)}; }},
    {cat:'시간 빼기', make(){ const h=rnd(2,4), m=rnd(5,35), sub=rnd(m+5,55); const tot=h*60+m-sub; const t={k:'timeSub',h,m,sub};
      const {choices,a}=pick4(HM(tot),[`${h}시간 ${sub-m}분`,HM(tot+60),HM(tot-60)],()=>HM(rnd(1,4)*60+rnd(0,59)));
      return {q:`${HM(h*60+m)} − ${sub}분 = ?`,choices,a,hint:'분이 모자라면 1시간을 60분으로 바꿔 내려!',t,diag:g=>DIAG.timeSub(t,g)}; }},
    {cat:'초 계산', make(){ const m=rnd(1,3), s=rnd(30,55), add=rnd(20,45); const tot=m*60+s+add; const t={k:'timeAdd',h:m,m:s,add};
      const {choices,a}=pick4(MS(tot),[`${m}분 ${s+add}초`,MS(tot-60),MS(tot+60)],()=>MS(rnd(1,4)*60+rnd(0,59)));
      return {q:`${MS(m*60+s)} + ${add}초 = ?`,choices,a,hint:'초끼리 더하고, 60초가 넘으면 1분으로 올려!',t}; }},
    {cat:'걸린 시간', make(){ const h1=rnd(1,9), m1=rnd(5,55), dur=rnd(25,110); const e=h1*60+m1+dur, h2=Math.floor(e/60), m2=e%60; const t={k:'elapsed',h1,m1,h2,m2};
      const naive=Math.abs(h2-h1)*60+Math.abs(m2-m1);
      const {choices,a}=pick4(HM(dur),[HM(naive),HM(dur+60),HM(dur-60>0?dur-60:dur+30)],()=>HM(rnd(20,120)));
      return {visual:`<div style="display:flex;gap:6px;justify-content:center;align-items:center">${clockSVG(h1,m1,null,105)}<span style="font-size:24px">→</span>${clockSVG(h2,m2,null,105)}</div>`,q:`${T(h1,m1)}에 시작해서 ${T(h2,m2)}에 끝났어. <b>걸린 시간</b>은?`,choices,a,hint:'다음 정각까지 먼저, 그다음 나머지! (징검다리)',t,diag:g=>DIAG.elapsed(t,g)}; }},
    {cat:'끝나는 시각', make(){ const h1=rnd(1,9), m1=rnd(5,55), dur=rnd(20,95); const e=h1*60+m1+dur, h2=Math.floor(e/60), m2=e%60; const t={k:'timeAdd',h:h1,m:m1,add:dur};
      const {choices,a}=pick4(T(h2,m2),[T(h1,m1+dur),T(h2-1<=0?12:h2-1,m2),T(h2+1,m2)],()=>T(rH(),rnd(0,59)));
      return {q:`${T(h1,m1)}에 시작해서 <b>${HM(dur)}</b> 동안 했어. 끝난 시각은?`,choices,a,hint:'시작 시각에 걸린 시간을 더해. 분이 60 넘으면 시로!',t}; }},
    {cat:'오전·오후', make(){ const items=[['아침에 일어나 학교 가는 8시','오전'],['점심을 먹는 12시 30분','오후'],['학원이 끝나는 5시','오후'],['잠자리에 드는 9시','오후'],['해가 뜨는 6시','오전'],['간식 먹는 3시','오후'],['1교시 시작 9시','오전'],['저녁밥 7시','오후']]; const it=pick(items); const t={k:'ampm',ans:it[1]};
      const choices=shuffle(['오전','오후','정오','자정']); return {q:`"${it[0]}"는 오전일까 오후일까?`,choices,a:choices.indexOf(it[1]),hint:'낮 12시 전 = 오전, 낮 12시부터 밤 12시 전 = 오후',t,diag:g=>DIAG.ampm(t,g)}; }},
    {cat:'24시간 표시', make(){ const h=rnd(1,11); const t={k:'h24',h};
      return {q:`<b>오후 ${h}시</b>를 24시간 표시로 쓰면 몇 시? (숫자만)`,a:h+12,hint:'오후는 12를 더해! 오후 1시 = 13시',t,diag:g=>DIAG.h24(t,g)}; }},
    {cat:'시각과 시간', make(){ const items=[
        {q:'"3시에 만나자" — 시각? 시간?',c:'시각',w:['시간']},{q:'"30분 동안 책을 읽었어" — 시각? 시간?',c:'시간',w:['시각']},
        {q:'"수업이 9시 10분에 시작해" — 시각? 시간?',c:'시각',w:['시간']},{q:'"버스를 15분 기다렸어" — 시각? 시간?',c:'시간',w:['시각']},
        {q:'"저녁 7시에 밥 먹어" — 시각? 시간?',c:'시각',w:['시간']},{q:'"2시간 동안 놀았어" — 시각? 시간?',c:'시간',w:['시각']}];
      const it=pick(items); const choices=shuffle([it.c,it.w[0],'둘 다 아님','모름']); return {q:it.q,choices,a:choices.indexOf(it.c),hint:'"몇 시"는 시각(한 순간), "얼마 동안"은 시간(길이)!'}; }},
    {cat:'달력·주', make(){ const items=[
        {q:'1주일은 며칠?',a:7,h:'월화수목금토일!'},{q:'하루는 몇 시간?',a:24,h:'낮 12시간 + 밤 12시간'},{q:'1시간은 몇 분?',a:60,h:'긴바늘 한 바퀴'},
        {q:'1분은 몇 초?',a:60,h:'초바늘 한 바퀴'},{q:'2주일은 며칠?',a:14,h:'7일이 두 번'},{q:'1년은 몇 개월?',a:12,h:'1월부터 12월까지'},
        {q:'3일은 몇 시간?',a:72,h:'24시간이 세 번'},{q:'반나절(하루의 절반)은 몇 시간?',a:12,h:'24의 절반'}];
      const it=pick(items); return {q:it.q,a:it.a,hint:it.h}; }},
  ];

  /* ---------- 게임: 시계 돌리기 / 시간 띠 ---------- */
  window.buildClockPlay=function(host){
    window._cp={h:3,m:0}; host.innerHTML=`<div class="card">
      <p class="cg-tip">🕰️ 바늘을 돌려 보고 시각을 읽어 봐! 긴바늘이 한 바퀴 돌면 짧은바늘은 한 칸 움직여.</p>
      <div id="cp-clock"></div>${legend}
      <div class="ctrl-row" style="margin-top:10px">
        <div class="ctrl"><span class="lbl">시간</span><button class="stepbtn" onclick="cpStep(-60)">－</button><span class="val" id="cp-h"></span><button class="stepbtn" onclick="cpStep(60)">＋</button></div>
        <div class="ctrl"><span class="lbl">5분</span><button class="stepbtn" onclick="cpStep(-5)">－</button><span class="val">5</span><button class="stepbtn" onclick="cpStep(5)">＋</button></div>
        <div class="ctrl"><span class="lbl">1분</span><button class="stepbtn" onclick="cpStep(-1)">－</button><span class="val">1</span><button class="stepbtn" onclick="cpStep(1)">＋</button></div>
      </div>
      <div class="cg-eq" id="cp-eq"></div></div>`; cpDraw(); };
  window.cpStep=function(d){ const s=window._cp; let tot=((s.h%12)*60+s.m+d+720)%720; s.h=Math.floor(tot/60)||12; s.m=tot%60; cpDraw(); };
  window.cpDraw=function(){ const {h,m}=window._cp; $('#cp-clock').innerHTML=clockSVG(h,m,null,190); $('#cp-h').textContent=h;
    const before=m>=45?`<br><span style="font-size:15px;color:var(--soft)">= ${h%12+1}시 ${60-m}분 전</span>`:''; const half=m===30?`<br><span style="font-size:15px;color:var(--soft)">= ${h}시 반</span>`:'';
    $('#cp-eq').innerHTML=`<span class="big">${T(h,m)}</span>${half}${before}<br><span style="font-size:14px;color:var(--soft)">긴바늘: 숫자 ${Math.floor(m/5)} × 5 + ${m%5}칸 = ${m}분 · 오후라면 ${h===12?12:h+12}시</span>`; };

  window.buildTimeBand=function(host){
    window._tb={s:140,d:50}; host.innerHTML=`<div class="card">
      <p class="cg-tip">📏 시간 띠: 시작 시각에서 얼마나 지났는지 한 칸=10분으로 세어 봐!</p>
      <div class="ctrl-row">
        <div class="ctrl"><span class="lbl">시작</span><button class="stepbtn" onclick="tbStep('s',-10)">－</button><span class="val" id="tb-s"></span><button class="stepbtn" onclick="tbStep('s',10)">＋</button></div>
        <div class="ctrl"><span class="lbl">걸린 시간</span><button class="stepbtn" onclick="tbStep('d',-10)">－</button><span class="val" id="tb-d"></span><button class="stepbtn" onclick="tbStep('d',10)">＋</button></div>
      </div>
      <div id="tb-clocks" style="display:flex;gap:8px;justify-content:center;align-items:center;margin:8px 0"></div>
      <div class="seg-row" id="tb-seg" style="flex-wrap:wrap"></div><div class="cg-eq" id="tb-eq"></div></div>`; tbDraw(); };
  window.tbStep=function(w,d){ const s=window._tb; if(w==='s') s.s=Math.max(60,Math.min(660,s.s+d)); else s.d=Math.max(10,Math.min(180,s.d+d)); tbDraw(); };
  window.tbDraw=function(){ const {s,d}=window._tb; const e=s+d; const h1=Math.floor(s/60),m1=s%60,h2=Math.floor(e/60),m2=e%60;
    $('#tb-s').textContent=T(h1,m1); $('#tb-d').textContent=HM(d);
    $('#tb-clocks').innerHTML=`${clockSVG(h1,m1,null,100)}<span style="font-size:22px">→</span>${clockSVG(h2||12,m2,null,100)}`;
    let seg=''; for(let i=0;i<d/10;i++){ const at=s+(i+1)*10; seg+=`<div class="seg" style="${at%60===0?'background:var(--c);color:#fff':''}">10분${at%60===0?`<br>${Math.floor(at/60)}시`:''}</div>`; }
    $('#tb-seg').innerHTML=seg;
    $('#tb-eq').innerHTML=`${T(h1,m1)} + <b>${HM(d)}</b> = <span class="big">${T(h2||12,m2)}</span><br><span style="font-size:14px;color:var(--soft)">10분 칸이 ${d/10}개 = ${d}분 = ${HM(d)}</span>`; };

  /* ---------- 단원 본체 ---------- */
  MODULES.time={
    concept(){ return `
      <div class="card"><span class="method-tag">1 · 시계의 약속</span>
        <h3>🕰️ 짧은바늘 = 시, 긴바늘 = 분</h3>
        ${clockSVG(3,0,null,150)}
        <p><b>짧은바늘</b>이 3을 가리키고 <b>긴바늘</b>이 12에 있으면 <span class="hl">3시</span>(정각). 긴바늘이 6이면 <span class="hl">30분</span> = "3시 반".</p></div>
      <div class="card"><span class="method-tag">2 · 분 읽기의 비밀</span>
        <h3>✖️ 숫자 × 5 = 분</h3>
        ${clockSVG(7,20,null,150)}
        <p>긴바늘이 숫자 <b>4</b>를 가리키면 4×5 = <span class="hl">20분</span>. 숫자 사이 작은 눈금은 1분씩! 숫자 4에서 작은 눈금 2칸 더 가면 22분.</p>
        <div class="tipbox"><b>짧은바늘 주의</b> 짧은바늘은 두 숫자 사이에 있어. <b>지나온 숫자</b>가 "시"! (7과 8 사이면 아직 7시)</div></div>
      <div class="card"><span class="method-tag">3 · 몇 분 전</span>
        <h3>⏪ 다음 정각까지 남은 시간</h3>
        ${clockSVG(4,55,null,130)}
        <p>4시 55분은 5시까지 5분 남았으니 <span class="hl">5시 5분 전</span>. 60에서 분을 빼면 돼!</p></div>
      <div class="card"><span class="method-tag">4 · 시각 vs 시간 · 오전/오후</span>
        <h3>📍 순간 / 📏 길이</h3>
        <p><b>시각</b>은 "몇 시"라는 한 순간(3시에 만나), <b>시간</b>은 "얼마 동안"이라는 길이(30분 동안). 하루 24시간 중 낮 12시 전은 <b>오전</b>, 그 뒤는 <b>오후</b>. 오후 시각 + 12 = 24시간 표시(오후 3시 = 15시).</p></div>
      <div class="card"><span class="method-tag">5 · 초 (3학년)</span>
        <h3>⏱️ 1분 = 60초</h3>
        ${clockSVG(10,10,40,130)}
        <p>가는 빨간 바늘이 <b>초바늘</b>. 한 바퀴 = 60초 = 1분. 초바늘도 숫자×5 로 읽어(숫자 8이면 40초). 1분 30초 = 90초.</p></div>
      <div class="card"><span class="method-tag">6 · 시간의 덧셈과 뺄셈 (3학년 핵심)</span>
        <h3>🔁 60이 넘으면 올리고, 모자라면 내려</h3>
        <div class="formula" style="font-size:17px">1시간 40분 + 35분<br>= 1시간 75분 → <b>2시간 15분</b></div>
        <p>분끼리 더해 60이 넘으면 <span class="hl">60분 = 1시간</span>으로 받아올림. 빼기에서 분이 모자라면 <span class="hl">1시간을 60분으로</span> 바꿔 받아내림.</p>
        <div class="formula" style="font-size:17px">3시간 10분 − 40분<br>= 2시간 70분 − 40분 = <b>2시간 30분</b></div>
        <div class="tipbox"><b>걸린 시간 구하기</b> 2시 20분 → 3시 5분: 징검다리! 3시까지 40분 + 5분 = <b>45분</b></div></div>`;
    },
    games:[
      {name:'🕰️ 시계 돌리기', build:buildClockPlay},
      {name:'📏 시간 띠', build:buildTimeBand},
    ],
    gens,
    thinkGens:[
      poolGen('🧠 왜 그럴까',[
        {q:'긴바늘이 숫자 3을 가리키는데 왜 "3분"이 아니라 "15분"일까?', c:'숫자 사이에 작은 눈금이 5칸씩 있어서 숫자 하나가 5분이라서', w:['시계가 고장 나서','3에 12를 더해서','긴바늘은 원래 5배로 읽는 규칙이라 그냥'], h:'12까지 숫자, 60까지 눈금!'},
        {q:'1시간 75분이 "틀린 표현"인 까닭은?', c:'60분이 넘으면 1시간으로 바꿔 써야 해서 (= 2시간 15분)', w:['75가 홀수라서','시간은 두 자리 수를 못 써서','틀린 표현이 아니다'], h:'60분 = 1시간!'},
        {q:'"3시"와 "3시간"은 무엇이 다를까?', c:'3시는 한 순간(시각), 3시간은 얼마 동안(시간)', w:['같은 말이다','3시가 더 길다','3시간은 오후에만 쓴다'], h:'📍 순간 vs 📏 길이'},
        {q:'짧은바늘이 7과 8 사이에 있을 때 8시가 아니라 7시인 까닭은?', c:'아직 8을 지나지 않았고 7을 지나는 중이라서', w:['8이 더 가까워서','짧은바늘은 항상 작은 수','시계가 느려서'], h:'지나온 숫자가 시!'},
        {q:'오후 3시를 15시라고도 쓰는 까닭은?', c:'하루가 24시간이라 12시 뒤로는 12를 더해 세어서', w:['3에 5를 곱해서','오후는 두 배로 세니까','15가 3보다 커서'], h:'12 + 3 = 15'},
      ]),
      poolGen('🔄 거꾸로·오개념',[
        {q:'친구가 "4시 50분은 5시 50분 전이야"라고 했어. 바르게 고치면?', c:'5시 10분 전', w:['4시 10분 전','5시 50분 전이 맞다','6시 10분 전'], h:'60 − 50 = 10'},
        {q:'"2시간 = 200분"이라고 계산했어. 왜 틀렸을까?', c:'1시간은 100분이 아니라 60분이라서 (2시간 = 120분)', w:['틀리지 않았다','2시간은 2000분이라서','시간은 분으로 못 바꿔서'], h:'60씩!'},
        {q:'끝난 시각 5시, 걸린 시간 40분. 시작 시각은?', c:'4시 20분', w:['5시 40분','4시 40분','4시 60분'], h:'거꾸로 40분 전으로!'},
        {q:'초바늘이 한 바퀴 돌면 긴바늘은?', c:'작은 눈금 1칸(1분) 움직인다', w:['한 바퀴 돈다','움직이지 않는다','숫자 하나(5분) 움직인다'], h:'60초 = 1분'},
      ]),
    ],
    deepGens:[
      {cat:'🚀 두 번 건너기', make(){ const h1=rnd(1,8), m1=rnd(10,50), d1=rnd(25,70), d2=rnd(20,60); const e=h1*60+m1+d1+d2; const t={k:'timeAdd',h:h1,m:m1,add:d1+d2};
        const {choices,a}=pick4(T(Math.floor(e/60),e%60),[T(h1,m1+d1+d2),T(Math.floor(e/60)-1,e%60),T(Math.floor(e/60)+1,e%60)],()=>T(rH(),rnd(0,59)));
        return {q:`${T(h1,m1)}에 출발해 ${HM(d1)} 가고, 쉬었다가 다시 ${HM(d2)} 갔어. 도착 시각은?`,choices,a,hint:'두 시간을 먼저 더하고, 시작 시각에 더해!',t}; }},
      {cat:'🚀 초까지 더하기', make(){ const m=rnd(1,3), s=rnd(20,55), m2=rnd(1,2), s2=rnd(20,55); const tot=(m+m2)*60+s+s2;
        const {choices,a}=pick4(MS(tot),[`${m+m2}분 ${s+s2}초`,MS(tot-60),MS(tot+60)],()=>MS(rnd(2,6)*60+rnd(0,59)));
        return {q:`${MS(m*60+s)} + ${MS(m2*60+s2)} = ?`,choices,a,hint:'초끼리 더해 60 넘으면 1분 올리고, 분끼리 더해!'}; }},
      poolGen('🚀 생활 속 시간',[
        {q:'영화가 오후 2시 40분에 시작해 1시간 50분 동안 해. 끝나는 시각은?', c:'오후 4시 30분', w:['오후 3시 90분','오후 4시 90분','오후 3시 30분'], h:'2시 40분 + 1시간 50분. 40+50=90 → 1시간 30분 올림'},
        {q:'오전 11시 30분부터 오후 1시까지 몇 시간 몇 분?', c:'1시간 30분', w:['2시간 30분','10시간 30분','30분'], h:'12시까지 30분 + 1시간'},
        {q:'하루 24시간 중 8시간 자고 6시간 학교에 있으면 남는 시간은?', c:'10시간', w:['14시간','16시간','2시간'], h:'24 − 8 − 6'},
        {q:'1교시 40분 수업, 쉬는 시간 10분. 3교시가 끝나는 건 9시 시작 후 몇 분 뒤?', c:'140분 뒤 (2시간 20분)', w:['120분 뒤','150분 뒤','130분 뒤'], h:'40+10+40+10+40 = 140'},
      ]),
    ],
  };

  /* ---------- 발견·핵심·대화 ---------- */
  DISCOVER.time=[
    {show:`<div style="display:flex;gap:4px;justify-content:center">${clockSVG(3,0,null,95)}${clockSVG(3,15,null,95)}${clockSVG(3,30,null,95)}</div>`,
     q:'긴바늘만 움직였어. 숫자 3 → 6으로 갈 때 분은 15에서 얼마가 됐을까?',
     choices:['30분 — 숫자 하나에 5분씩','6분 — 숫자 그대로','60분 — 두 배'], a:0,
     yes:'발견! 긴바늘의 숫자는 <b>×5</b>가 분이야. 숫자 12개 × 5 = 60분 = 한 바퀴!'},
    {show:`<div style="display:flex;gap:6px;justify-content:center">${clockSVG(7,10,null,110)}${clockSVG(7,50,null,110)}</div>`,
     q:'둘 다 7시대야. 짧은바늘이 오른쪽 시계에선 8에 가까운데, 몇 시일까?',
     choices:['7시 50분 — 아직 8을 안 지났으니까','8시 50분 — 8에 가까우니까','8시 10분'], a:0,
     yes:'맞아! 짧은바늘은 <b>지나온 숫자</b>를 읽어. 8에 가까워도 8을 지나기 전까진 7시야.'},
    {show:'1시간 40분 + 35분 = 1시간 75분 ❓',
     q:'75분은 그대로 둬도 될까?',
     choices:['60분을 1시간으로 바꿔 2시간 15분','그대로 1시간 75분','100분을 1시간으로'], a:0,
     yes:'바로 그거야! <b>60분 = 1시간</b>이라 60이 넘으면 받아올림. 이게 시간 계산의 전부야.'},
  ];
  INSIGHT.time='짧은바늘=지나온 숫자(시), 긴바늘=숫자×5(분), 60이 넘으면 1시간으로!';
  TALK.time=['집 안 시계로 지금 시각을 읽고, 저녁밥까지 얼마나 남았는지 같이 계산해 보자!','오늘 잠든 시각과 일어난 시각으로 몇 시간 잤는지 구해 보자. 징검다리로!','"3시에 만나"와 "3시간 놀아"가 어떻게 다른지 설명해 줘!'];
})();
