/* =========================================================
   🎯 매일 과제 (수학 위주) + 성취도 대시보드  — 2026-09-22
   - 아이 폰이 하루 처음 열 때 오늘 과제 4개를 만든다(약점 훈련·시계·오늘의 단원·틀린 문제 다시)
   - 진행·완료는 DB.daily[날짜]에 저장 → 학습기록 sync로 부모 폰에도 그대로 보임(부모 폰은 만들지 않음)
   - 엔진(index.html) 뒤에 로드. 엔진의 finishMaster/finishReview 가 dailyOnFinish() 를 호출한다.
   ========================================================= */
(function(){
  // 과제 양: 부모가 고름(DB.dailyLevel). 보통 ≈ 25분, 많이 ≈ 40분
  const LEVELS={normal:{weak:12,time:8,expr:8,review:8,deep:false}, more:{weak:16,time:12,expr:12,review:10,deep:true}};
  const L=()=>LEVELS[DB.dailyLevel]||LEVELS.normal;
  const WEAK_N=()=>L().weak, TIME_N=()=>L().time, EXPR_N=()=>L().expr, REVIEW_N=()=>L().review;
  const mathUnits=()=>UNITS.filter(u=>(u.grade||3)===3&&u.subj==='math');
  const dkey=()=>todayKey();
  function todayTask(){ return (DB.daily||{})[dkey()]||null; }

  /* 기존 단원 통계·최근 오답·선생님 계획을 기본으로 유지. 충분한 새 독립 풀이만 가중치를 낮춘다. */
  function weakScores(){
    const s={};
    mathUnits().forEach(u=>{const cats=unitDB(u.id).cats;for(const c in cats){if(cats[c].wrong>0)s[u.id+'|'+c]=(s[u.id+'|'+c]||0)+cats[c].wrong;}});
    ((DB.plan&&DB.plan.focus)||[]).forEach(k=>{if(mathUnits().some(u=>u.id===k.split('|')[0]))s[k]=(s[k]||0)+4;});
    (DB.miss||[]).slice(0,60).forEach(m=>{if(m.u&&m.cat&&mathUnits().some(u=>u.id===m.u))s[m.u+'|'+m.cat]=(s[m.u+'|'+m.cat]||0)+1.5;});
    const baseline=Object.entries(s).map(([k,score])=>{const [unit,cat]=k.split('|');return {unit,cat,score};});
    return (typeof learningAdjustWeakScores==='function'?learningAdjustWeakScores(baseline):baseline).sort((a,b)=>b.score-a.score);
  }
  window.dailyWeakScores=weakScores;
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
    // 이미 생성한 오늘 과제는 바꾸지 않음. 새 날짜의 단원부터 확인된 학교 진도를 우선 반영.
    const school=typeof learningSchoolFocus==='function'?learningSchoolFocus():[];
    const schoolUnits=mathUnits().filter(u=>school.includes(u.id));
    if(schoolUnits.length) return schoolUnits.find(u=>u.id!==yUnit)||schoolUnits[0];
    const cands=mathUnits().filter(u=>u.id!=='time'&&u.id!==yUnit);
    cands.sort((a,b)=>{ const A=unitDB(a.id),B=unitDB(b.id); const accA=A.solved?A.correct/A.solved:0.5, accB=B.solved?B.correct/B.solved:0.5;
      return (A.clears-B.clears)||(accA-accB)||(Math.random()-0.5); });
    return cands[0]||mathUnits()[0];
  }
  function needTalk(){ const iv=(DB.interviews||[]).slice(-1)[0]; return !iv||Date.now()-iv.t>36*3600*1000; }
  window.ensureDaily=function(){
    if(DB.viewer) return todayTask();
    DB.daily=DB.daily||{}; if(DB.daily[dkey()]) return DB.daily[dkey()];
    const u=pickUnitOfDay(); const wrongPool=DB.wrong.filter(w=>mathUnits().some(m=>m.id===w.unitId));
    const tasks=[
      {id:'weak',  title:'🎯 맞춤 연습',        sub:`풀이 기록을 살펴 고른 ${WEAK_N()}문제`, n:WEAK_N(),  done:false, correct:0, total:0},
      {id:'time',  title:'🕰️ 시계 집중',        sub:`시각과 시간 ${TIME_N()}문제`,          n:TIME_N(),  done:false, correct:0, total:0, unit:'time'},
      ...(needTalk()?[{id:'talk', title:'🎤 선생님과 이야기', sub:'말로 답하는 3분 인터뷰', n:0, done:false, correct:0, total:0}]:[]),
      {id:'expr',  title:'✍️ 식 세우기',        sub:`상황을 식으로 ${EXPR_N()}문제 + 다른 방법으로`, n:EXPR_N(), done:false, correct:0, total:0},
      {id:'unit',  title:`📘 오늘의 단원 · ${u.name}`, sub:L().deep?'퀴즈 + 심화 클리어':'퀴즈 한 세트 클리어', n:0, done:false, correct:0, total:0, unit:u.id, deep:L().deep, quizDone:false},
      {id:'review',title:'🔁 틀린 문제 다시',   sub:wrongPool.length?`최근 오답 ${Math.min(REVIEW_N(),wrongPool.length)}개`:'틀린 문제가 없어요 — 자동 완료!', n:Math.min(REVIEW_N(),wrongPool.length), done:wrongPool.length===0, correct:0, total:0},
    ];
    DB.daily[dkey()]={tasks, made:Date.now(), allDone:null};
    syncHwTasks(DB.daily[dkey()]);
    // 오래된 기록 정리(90일)
    const keys=Object.keys(DB.daily).sort(); while(keys.length>90) delete DB.daily[keys.shift()];
    saveDB(); return DB.daily[dkey()];
  };

  /* 📸 부모가 만든 사진 숙제 → 오늘 과제에 추가(아직 안 푼 세트만, 하루에 처음 보이는 것부터) */
  function syncHwTasks(D){
    if(!D||DB.viewer||typeof hwPendingSets!=='function') return;
    let changed=false;
    hwPendingSets().forEach(s=>{ const id='hw:'+s.jobId; if(!D.tasks.some(t=>t.id===id)){ D.tasks.splice(Math.min(1,D.tasks.length),0,{id, title:`📚 엄마 숙제 · ${s.title}`, sub:`${s.problems.length}문제 (문제집에서 틀린 유형)`, n:s.problems.length, done:false, correct:0, total:0, hw:s.jobId}); if(D.allDone) D.allDone=null; changed=true; } });
    if(changed) saveDB();
  }
  window.syncHwTasks=syncHwTasks;

  /* ---------- 과제 시작 ---------- */
  function dailyScreen(title){
    clearTimers(); PLAY=null; stopStudyClock(); setTheme(null); curUnit=null;
    app.innerHTML=`<div class="topbar"><button class="back" onclick="home()">←</button><div class="t">🎯 오늘의 과제 · ${title}</div><div class="spacer"></div><span class="mini">🎟️ ${DB.stickers}</span></div><div id="stage-body"></div>`;
    startStudyClock(); return $('#stage-body');
  }
  window.startDaily=function(id){
    const D=ensureDaily(); if(!D) return; const task=D.tasks.find(t=>t.id===id); if(!task) return;
    if(DB.viewer){ alert('함께 보기 모드에서는 아이 기록만 볼 수 있어요.'); return; }
    if(id==='unit'){ openUnit(task.unit); setStage(task.deep&&task.quizDone?'deep':'quiz'); return; }
    if(id==='talk'){ const body=dailyScreen(task.title); startInterview({body, onDone:n=>dailyTaskDone(task,0,0,body,`선생님이 확인한 개념 ${n}개`)}); return; }
    if(id==='expr'){
      const body=dailyScreen(task.title);
      startExprSet(buildExprSet(EXPR_N()),{body, stop:()=>home(), onDone:(ft,total)=>{ dailyTaskDone(task, ft, total, body, `다른 방법 성공 ${EX_METHOD()}`); }});
      return;
    }
    if(id.startsWith('hw:')){ const body=dailyScreen(task.title); startHomework(task.hw,{body, daily:id}); return; }
    if(id==='review'){
      const pool=DB.wrong.filter(w=>mathUnits().some(m=>m.id===w.unitId)).slice(0,REVIEW_N());
      if(!pool.length){ task.done=true; saveDB(); dailyCheckAll(); home(); return; }
      const body=dailyScreen(task.title);
      PLAY={mode:'review',unitId:pool[0].unitId,body,daily:id,queue:shuffle(pool.map(p=>Object.assign({fromWrong:true},p))),startN:pool.length,fixed:0,score:0,streak:0,corr:0,cur:null,buf:'',locked:false};
      advance(); return;
    }
    const body=dailyScreen(task.title);
    let set = id==='time' ? buildMasterSet('time',null,TIME_N()) : buildDailyWeakSet(WEAK_N());
    set.forEach((s,i)=>s.id=i);
    PLAY={mode:'master',unitId:set[0]?set[0].unitId:'time',body,daily:id,queue:set,total:set.length,solved:new Set(),score:0,retry:0,streak:0,corr:0,cur:null,buf:'',locked:false};
    advance();
  };

  /* ---------- 완료 처리 (엔진 finishMaster/finishReview 가 호출) ---------- */
  function markDone(task,correct,total){ task.done=true; task.correct=correct; task.total=total; task.doneAt=Date.now(); }
  /* 과제 전부 완료 = 스티커 문이 열리는 유일한 순간.
     보상 = 기본 5 + 정확도 보너스(첫 시도 90% 이상 과제당 +1, 학업 능력) + 연속 완료 보너스(3·7·14·30·60·100일, 공부 습관) */
  const STREAK_BONUS={3:3,7:7,14:14,30:30,60:60,100:100};
  window.dailyCheckAll=function(){
    const D=todayTask(); if(!D||D.allDone) return false;
    if(!D.tasks.every(t=>t.done)) return false;
    D.allDone=Date.now();
    // 사진 숙제가 뒤늦게 추가되어 allDone이 다시 열려도 같은 날짜 보상은 한 번만 지급.
    if(D.reward){ saveDB(); syncSoon(); return true; }
    DB.dailyDoneEver=(DB.dailyDoneEver||0)+1;
    const acc=D.tasks.filter(t=>t.total>0&&t.correct/t.total>=0.9).length;
    const streak=dailyStreak(); const sb=STREAK_BONUS[streak]||0;
    D.reward={base:5, acc, streak:sb, total:5+acc+sb};
    addStickers(D.reward.total, true);
    saveDB(); syncSoon(); return true;
  };
  window.dailyRewardText=function(D){
    const r=D&&D.reward; if(!r) return '';
    return `🎟️ 스티커 +${r.total} <span style="font-size:13px;font-weight:700;color:var(--soft)">(과제 완료 ${r.base}${r.acc?` · 정확도 보너스 +${r.acc}`:''}${r.streak?` · 🔥 ${dailyStreak()}일 연속 보너스 +${r.streak}`:''})</span>`;
  };
  // 반환값 true = 과제 화면을 직접 그렸으니 엔진은 기본 결과 화면을 그리지 말 것
  window.EX_METHOD=function(){ try{ const e=typeof exState==='function'?exState():null; return e?`${e.methodOk}/${e.methodTotal}`:''; }catch(err){ return ''; } };
  window.dailyOnFinish=function(P){
    if(P.daily&&String(P.daily).startsWith('quest:')&&typeof questOnFinish==='function') return questOnFinish(P);
    const D=todayTask(); if(!D) return false;
    if(P.daily){
      const task=D.tasks.find(t=>t.id===P.daily);
      if(!task){ return (P.hw&&typeof questOnFinish==='function')?questOnFinish(P):false; } // 🎁 퀘스트
      const total=P.mode==='review'?P.startN:P.total;
      const firstTry=P.mode==='review'?P.fixed:P.solved.size-P.retry; // 첫 시도에 맞힌 수(재도전 외)
      if(P.hw){ DB.hw=DB.hw||{done:{}}; DB.hw.done=DB.hw.done||{}; DB.hw.done[P.hw]={t:Date.now(),correct:Math.max(0,firstTry),total,wrongQs:(P.wrongQs||[]).slice(0,8)}; }
      dailyTaskDone(task, Math.max(0,firstTry), total, P.body, P.mode!=='review'&&P.retry?`다시 풀어 맞힌 ${P.retry}개`:'');
      return true;
    }
    // 일반 퀴즈/심화로 오늘의 단원을 깨도 과제로 인정 (많이 모드는 퀴즈+심화 둘 다)
    if(P.mode==='master'&&!P.think){ const t=D.tasks.find(t=>t.id==='unit'&&t.unit===P.unitId&&!t.done); if(t){ if(!P.deep){ t.quizDone=true; t.correct=P.total-Math.min(P.retry,P.total); t.total=P.total; } if(t.deep? (t.quizDone&&P.deep) : !P.deep){ markDone(t,t.correct||P.total-Math.min(P.retry,P.total),t.total||P.total); dailyCheckAll(); } saveDB(); } }
    return false;
  };
  /* 과제 하나 끝났을 때 공통 결과 화면 */
  window.dailyTaskDone=function(task, firstTry, total, body, extra){
      const D=todayTask(); if(!D) return;
      markDone(task,firstTry,total); logEvent(task.unit||'daily','daily',1);
      const all=dailyCheckAll(); const newCards=checkCardUnlocks(); saveDB(); syncSoon();
      confetti(all); sfx('win'); idolPopup(all?'오늘 과제 다 했다!! 이제 스티커 문이 열렸어 🏆':'과제 하나 끝! 잘했어 ✨', true);
      const left=D.tasks.filter(t=>!t.done); const accOk=total>0&&firstTry/total>=0.9;
      body.innerHTML=`<div class="result card">
        <div class="stars">${all?'🏆🎉':'✅'}</div>
        <h2>${task.title} 완료!</h2>
        <div class="msg">${total?`${total}문제 중 처음에 바로 맞힌 문제 <b>${firstTry}개</b>${extra?` · ${extra}`:''}`:(extra||'잘했어!')}${accOk?' · 🎯 정확도 90% 이상!':''}</div>
        ${all?`<div class="reward-banner">${dailyRewardText(D)}</div><div class="tipbox" style="text-align:center">✨ 이제부터 더 푸는 건 전부 <b>보너스 스티커</b>! 문제은행·심화·다른 단원 도전해 봐.</div>`
             :`<div class="tipbox" style="text-align:center">📌 남은 과제 ${left.length}개를 다 끝내면 스티커를 받아요${accOk?' (정확도 보너스 +1 확보!)':''}</div>`}
        ${rewardCardHTML(newCards)}
        ${left.length?`<p style="margin-top:12px">남은 과제 ${left.length}개: ${left.map(t=>t.title).join(', ')}</p><button class="bigbtn" onclick="startDaily('${left[0].id}')">▶ 다음 과제 ${left[0].title}</button>`:`<p style="margin-top:12px">오늘 과제 끝! 내일 또 만나 😊</p>`}
        <button class="bigbtn ghost" onclick="home()">🏠 홈으로</button></div>`;
  };

  /* ---------- 홈 카드 ---------- */
  window.dailyCardHTML=function(){
    const D=ensureDaily(); if(!D) return `<div class="card" style="text-align:center;color:var(--soft)">🎯 오늘 과제는 아이가 앱을 열면 만들어져요.</div>`;
    syncHwTasks(D);
    const done=D.tasks.filter(t=>t.done).length, n=D.tasks.length, pct=Math.round(done/n*100);
    const streak=dailyStreak();
    const rows=D.tasks.map(t=>`<div class="cat-row" style="display:flex;align-items:center;gap:8px;padding:6px 0">
      <span style="font-size:20px">${t.done?'✅':'⬜'}</span>
      <div style="flex:1;min-width:0"><div style="font-weight:800;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title}</div><div class="sub" style="margin:0">${t.done?(t.total?`${t.total}문제 중 바로 맞힌 ${t.correct}개`:'완료'):t.sub}</div></div>
      ${t.done||DB.viewer?'':`<button class="wpill" style="border-color:var(--c);color:var(--c-dark)" onclick="startDaily('${t.id}')">풀기</button>`}
    </div>`).join('');
    return `<div class="card" style="border:2px solid #ffd9a8">
      <h3 style="margin-bottom:6px">🎯 오늘의 과제 <span style="font-size:13px;color:var(--soft);font-weight:700;margin-left:auto">${done}/${n} ${streak?`· 🔥 ${streak}일 연속`:''}</span></h3>
      <div class="progress" style="height:12px;margin:0 0 6px"><div class="bar" style="width:${pct}%;background:${pct===100?'#19a974':'var(--c)'}"></div></div>
      ${rows}
      ${D.allDone?`<div class="tipbox" style="margin-top:8px">🏆 오늘 과제 완료! ${dailyRewardText(D)}</div>`
                 :`<div style="font-size:12px;color:var(--soft);margin-top:6px">🎟️ 다 끝내면 스티커 · 정확도 90%↑ +1 · 🔥 연속 보너스</div>`}
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
    const names={weak:'🎯 맞춤 연습',time:'🕰️ 시계',unit:'📘 단원 퀴즈',review:'🔁 다시 풀기'};
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
