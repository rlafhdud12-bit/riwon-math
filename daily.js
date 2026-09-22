/* =========================================================
   🎯 매일 과제 (수학 위주) + 성취도 대시보드  — 2026-09-22
   - 아이 폰이 하루 처음 열 때 오늘 과제 4개를 만든다(약점 훈련·시계·오늘의 단원·틀린 문제 다시)
   - 진행·완료는 DB.daily[날짜]에 저장 → 학습기록 sync로 부모 폰에도 그대로 보임(부모 폰은 만들지 않음)
   - 엔진(index.html) 뒤에 로드. 엔진의 finishMaster/finishReview 가 dailyOnFinish() 를 호출한다.
   ========================================================= */
(function(){
  const WEAK_N=8, TIME_N=6, REVIEW_N=6;
  const mathUnits=()=>UNITS.filter(u=>(u.grade||3)===3&&u.subj==='math');
  const dkey=()=>todayKey();
  function todayTask(){ return (DB.daily||{})[dkey()]||null; }

  /* 약점 유형 점수: 단원 통계(틀린 수) + 최근 오답 로그(최근 60개, 가중) */
  function weakScores(){
    const s={}; // key unit|cat → score
    mathUnits().forEach(u=>{ const cats=unitDB(u.id).cats; for(const c in cats){ if(cats[c].wrong>0) s[u.id+'|'+c]=(s[u.id+'|'+c]||0)+cats[c].wrong; } });
    (DB.miss||[]).slice(0,60).forEach(m=>{ if(m.u&&m.cat&&mathUnits().some(u=>u.id===m.u)) s[m.u+'|'+m.cat]=(s[m.u+'|'+m.cat]||0)+1.5; });
    return Object.entries(s).map(([k,v])=>{ const [unit,cat]=k.split('|'); return {unit,cat,score:v}; }).sort((a,b)=>b.score-a.score);
  }
  function genFor(unit,cat){ const m=MODULES[unit]; return m&&m.gens.find(g=>g.cat===cat); }
  /* 약점 훈련 세트: 약점 유형 가중 추출, 부족하면 시계·기본 연산으로 채움 */
  window.buildDailyWeakSet=function(n){
    const weak=weakScores().filter(w=>genFor(w.unit,w.cat)).slice(0,6);
    const set=[]; const fallback=[['time',null],['mul',null],['div',null],['add',null],['time',null]];
    for(let i=0;i<n;i++){
      let unit,gen;
      if(weak.length&&(i<Math.ceil(n*0.7)||weak.length>=4)){ const tot=weak.reduce((a,w)=>a+w.score,0); let r=Math.random()*tot; let w=weak[weak.length-1]; for(const x of weak){ r-=x.score; if(r<=0){ w=x; break; } } unit=w.unit; gen=genFor(w.unit,w.cat); }
      else { const f=fallback[i%fallback.length]; unit=f[0]; const m=MODULES[unit]; if(!m){ continue; } gen=pick(m.gens); }
      if(!gen) continue; set.push(genOne(unit,gen));
    }
    return shuffle(set);
  };
  /* 오늘의 단원: 클리어 적고 정답률 낮은 단원 우선, 어제 단원 제외, 시계는 별도 과제라 제외 */
  function pickUnitOfDay(){
    const y=new Date(Date.now()-86400000); const yk=y.getFullYear()+'-'+String(y.getMonth()+1).padStart(2,'0')+'-'+String(y.getDate()).padStart(2,'0');
    const yt=(DB.daily||{})[yk]; const yUnit=yt&&(yt.tasks.find(t=>t.id==='unit')||{}).unit;
    const cands=mathUnits().filter(u=>u.id!=='time'&&u.id!==yUnit);
    cands.sort((a,b)=>{ const A=unitDB(a.id),B=unitDB(b.id); const accA=A.solved?A.correct/A.solved:0.5, accB=B.solved?B.correct/B.solved:0.5;
      return (A.clears-B.clears)||(accA-accB)||(Math.random()-0.5); });
    return cands[0]||mathUnits()[0];
  }
  window.ensureDaily=function(){
    if(DB.viewer) return todayTask();
    DB.daily=DB.daily||{}; if(DB.daily[dkey()]) return DB.daily[dkey()];
    const u=pickUnitOfDay(); const wrongPool=DB.wrong.filter(w=>mathUnits().some(m=>m.id===w.unitId));
    const tasks=[
      {id:'weak',  title:'🎯 약점 훈련',        sub:`가장 많이 틀린 유형 ${WEAK_N}문제`, n:WEAK_N,  done:false, correct:0, total:0},
      {id:'time',  title:'🕰️ 시계 집중',        sub:`시각과 시간 ${TIME_N}문제`,          n:TIME_N,  done:false, correct:0, total:0, unit:'time'},
      {id:'unit',  title:`📘 오늘의 단원 · ${u.name}`, sub:'퀴즈 한 세트 클리어',         n:0,       done:false, correct:0, total:0, unit:u.id},
      {id:'review',title:'🔁 틀린 문제 다시',   sub:wrongPool.length?`최근 오답 ${Math.min(REVIEW_N,wrongPool.length)}개`:'틀린 문제가 없어요 — 자동 완료!', n:Math.min(REVIEW_N,wrongPool.length), done:wrongPool.length===0, correct:0, total:0},
    ];
    DB.daily[dkey()]={tasks, made:Date.now(), allDone:null};
    // 오래된 기록 정리(90일)
    const keys=Object.keys(DB.daily).sort(); while(keys.length>90) delete DB.daily[keys.shift()];
    saveDB(); return DB.daily[dkey()];
  };

  /* ---------- 과제 시작 ---------- */
  function dailyScreen(title){
    clearTimers(); PLAY=null; stopStudyClock(); setTheme(null); curUnit=null;
    app.innerHTML=`<div class="topbar"><button class="back" onclick="home()">←</button><div class="t">🎯 오늘의 과제 · ${title}</div><div class="spacer"></div><span class="mini">🎟️ ${DB.stickers}</span></div><div id="stage-body"></div>`;
    startStudyClock(); return $('#stage-body');
  }
  window.startDaily=function(id){
    const D=ensureDaily(); if(!D) return; const task=D.tasks.find(t=>t.id===id); if(!task) return;
    if(DB.viewer){ alert('함께 보기 모드에서는 아이 기록만 볼 수 있어요.'); return; }
    if(id==='unit'){ openUnit(task.unit); setStage('quiz'); return; }
    if(id==='review'){
      const pool=DB.wrong.filter(w=>mathUnits().some(m=>m.id===w.unitId)).slice(0,REVIEW_N);
      if(!pool.length){ task.done=true; saveDB(); dailyCheckAll(); home(); return; }
      const body=dailyScreen(task.title);
      PLAY={mode:'review',unitId:pool[0].unitId,body,daily:id,queue:shuffle(pool.map(p=>Object.assign({fromWrong:true},p))),startN:pool.length,fixed:0,score:0,streak:0,corr:0,cur:null,buf:'',locked:false};
      advance(); return;
    }
    const body=dailyScreen(task.title);
    let set = id==='time' ? buildMasterSet('time').slice(0,TIME_N) : buildDailyWeakSet(WEAK_N);
    set.forEach((s,i)=>s.id=i);
    PLAY={mode:'master',unitId:set[0]?set[0].unitId:'time',body,daily:id,queue:set,total:set.length,solved:new Set(),score:0,retry:0,streak:0,corr:0,cur:null,buf:'',locked:false};
    advance();
  };

  /* ---------- 완료 처리 (엔진 finishMaster/finishReview 가 호출) ---------- */
  function markDone(task,correct,total){ task.done=true; task.correct=correct; task.total=total; task.doneAt=Date.now(); }
  window.dailyCheckAll=function(){
    const D=todayTask(); if(!D||D.allDone) return false;
    if(D.tasks.every(t=>t.done)){ D.allDone=Date.now(); addStickers(5); DB.dailyDoneEver=(DB.dailyDoneEver||0)+1; saveDB(); syncSoon(); return true; }
    return false;
  };
  // 반환값 true = 과제 화면을 직접 그렸으니 엔진은 기본 결과 화면을 그리지 말 것
  window.dailyOnFinish=function(P){
    const D=todayTask(); if(!D) return false;
    if(P.daily){
      const task=D.tasks.find(t=>t.id===P.daily); if(!task) return false;
      const total=P.mode==='review'?P.startN:P.total, correct=P.mode==='review'?P.fixed:(P.total-Math.min(P.retry,P.total));
      const firstTry=P.mode==='review'?P.fixed:P.solved.size-P.retry; // 첫 시도에 맞힌 수(재도전 제외)
      markDone(task,Math.max(0,firstTry),total);
      const reward=3; addStickers(reward); logEvent(P.unitId,'daily',1);
      const all=dailyCheckAll(); const newCards=checkCardUnlocks(); saveDB(); syncSoon();
      confetti(all); sfx('win'); idolPopup(all?'오늘 과제 다 했다!! 정말 자랑스러워 🏆':'과제 하나 끝! 잘했어 ✨', true);
      const left=D.tasks.filter(t=>!t.done);
      P.body.innerHTML=`<div class="result card">
        <div class="stars">${all?'🏆🎉':'✅'}</div>
        <h2>${task.title} 완료!</h2>
        <div class="msg">${total}문제 중 처음에 바로 맞힌 문제 <b>${Math.max(0,firstTry)}개</b>${P.mode!=='review'&&P.retry?` · 다시 풀어 맞힌 ${P.retry}개`:''}</div>
        <div class="reward-banner">🎟️ 스티커 +${reward}${all?' · 오늘 과제 전부 완료 보너스 +5 🎁':''}</div>
        ${rewardCardHTML(newCards)}
        ${left.length?`<p style="margin-top:12px">남은 과제 ${left.length}개: ${left.map(t=>t.title).join(', ')}</p><button class="bigbtn" onclick="startDaily('${left[0].id}')">▶ 다음 과제 ${left[0].title}</button>`:`<p style="margin-top:12px">오늘 과제 끝! 내일 또 만나 😊</p>`}
        <button class="bigbtn ghost" onclick="home()">🏠 홈으로</button></div>`;
      return true;
    }
    // 일반 퀴즈로 오늘의 단원을 깨도 과제로 인정
    if(P.mode==='master'&&!P.think&&!P.deep){ const t=D.tasks.find(t=>t.id==='unit'&&t.unit===P.unitId&&!t.done); if(t){ markDone(t,P.total-Math.min(P.retry,P.total),P.total); dailyCheckAll(); saveDB(); } }
    return false;
  };

  /* ---------- 홈 카드 ---------- */
  window.dailyCardHTML=function(){
    const D=ensureDaily(); if(!D) return `<div class="card" style="text-align:center;color:var(--soft)">🎯 오늘 과제는 아이가 앱을 열면 만들어져요.</div>`;
    const done=D.tasks.filter(t=>t.done).length, n=D.tasks.length, pct=Math.round(done/n*100);
    const streak=dailyStreak();
    const rows=D.tasks.map(t=>`<div class="cat-row" style="display:flex;align-items:center;gap:8px;padding:6px 0">
      <span style="font-size:20px">${t.done?'✅':'⬜'}</span>
      <div style="flex:1"><div style="font-weight:800">${t.title}</div><div class="sub" style="margin:0">${t.done?(t.total?`${t.total}문제 중 바로 맞힌 ${t.correct}개`:'완료'):t.sub}</div></div>
      ${t.done||DB.viewer?'':`<button class="wpill" style="border-color:var(--c);color:var(--c-dark)" onclick="startDaily('${t.id}')">풀기</button>`}
    </div>`).join('');
    return `<div class="card" style="border:2px solid #ffd9a8">
      <h3 style="margin-bottom:6px">🎯 오늘의 과제 <span style="font-size:13px;color:var(--soft);font-weight:700;margin-left:auto">${done}/${n} ${streak?`· 🔥 ${streak}일 연속`:''}</span></h3>
      <div class="progress" style="height:12px;margin:0 0 6px"><div class="bar" style="width:${pct}%;background:${pct===100?'#19a974':'var(--c)'}"></div></div>
      ${rows}
      ${D.allDone?'<div class="tipbox" style="margin-top:8px">🏆 오늘 과제 전부 완료! 보너스 +5 받았어요.</div>':''}
    </div>`;
  };

  /* ---------- 성취도 ---------- */
  function keyOf(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  window.dailyStreak=function(){
    let n=0; for(let i=0;i<365;i++){ const k=keyOf(new Date(Date.now()-i*86400000)); const d=(DB.daily||{})[k]; if(d&&d.allDone) n++; else if(i===0) continue; else break; } return n;
  };
  window.dailyAchievementHTML=function(){
    const days=[]; for(let i=13;i>=0;i--){ const dt=new Date(Date.now()-i*86400000), k=keyOf(dt), d=(DB.daily||{})[k]; const done=d?d.tasks.filter(t=>t.done).length:0, n=d?d.tasks.length:0; days.push({k,dt,done,n,all:!!(d&&d.allDone)}); }
    const week=days.slice(7); const wk=week.filter(x=>x.n).length, wkAll=week.filter(x=>x.all).length;
    const attempts=Object.values(DB.daily||{}).flatMap(d=>d.tasks.filter(t=>t.done&&t.total)); const acc=attempts.length?Math.round(attempts.reduce((s,t)=>s+t.correct/t.total,0)/attempts.length*100):null;
    const byType={}; attempts.forEach(t=>{ const id=t.id; byType[id]=byType[id]||{c:0,t:0,n:0}; byType[id].c+=t.correct; byType[id].t+=t.total; byType[id].n++; });
    const names={weak:'🎯 약점 훈련',time:'🕰️ 시계',unit:'📘 단원 퀴즈',review:'🔁 다시 풀기'};
    const cells=days.map(x=>{ const col=x.all?'#19a974':x.done?'#f39c12':x.n?'#e8503a':'#eee'; const lab=['일','월','화','수','목','금','토'][x.dt.getDay()];
      return `<div style="flex:1;text-align:center"><div title="${x.k}" style="height:34px;border-radius:8px;background:${col};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:12px">${x.n?x.done+'/'+x.n:''}</div><div style="font-size:10px;color:var(--soft)">${lab}</div></div>`; }).join('');
    return `<div class="card"><h3>🎯 과제 성취도</h3>
      <div class="dash-grid" style="margin-bottom:10px">
        <div class="dash-stat"><div class="v">🔥 ${dailyStreak()}</div><div class="k">연속 완료(일)</div></div>
        <div class="dash-stat"><div class="v">${wk?Math.round(wkAll/wk*100):0}%</div><div class="k">이번 주 완료율</div></div>
        <div class="dash-stat"><div class="v">${acc===null?'-':acc+'%'}</div><div class="k">과제 정답률</div></div>
        <div class="dash-stat"><div class="v">${DB.dailyDoneEver||0}</div><div class="k">전부 완료한 날</div></div>
      </div>
      <p style="font-size:12.5px;color:var(--soft);margin:0 0 4px">최근 14일 (초록=전부 완료 · 주황=일부 · 빨강=시작 안 함)</p>
      <div style="display:flex;gap:4px">${cells}</div>
      <div style="margin-top:12px">${Object.entries(byType).map(([id,v])=>{ const a=v.t?Math.round(v.c/v.t*100):0; const col=a>=80?'#19a974':a>=50?'#f39c12':'#e8503a';
        return `<div class="cat-row"><div class="lab"><span>${names[id]||id} <span style="color:var(--soft);font-size:12px">${v.n}회</span></span><span style="color:${col}">${a}%</span></div><div class="progress" style="height:10px;margin:4px 0 2px"><div class="bar" style="width:${a}%;background:${col}"></div></div></div>`; }).join('')||'<p style="color:var(--soft);font-size:13px">아직 완료한 과제가 없어요.</p>'}</div>
    </div>`;
  };
})();
