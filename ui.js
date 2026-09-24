/* =========================================================
   🧹 화면 정리 (2026-09-23) — 홈·공부기록·부모 화면·설정
   index.html 의 옛 home()/renderDashboard() 를 대신한다. 엔진·daily·expr 뒤에 로드.
   원칙: 아이 홈 = 오늘의 과제가 중심, 나머지는 한 줄 / 부모 화면 = 오늘 현황 → 숙제 → 응원 → 왜 틀렸나 → 성취도
   ========================================================= */
(function(){
  const unitCard=u=>{ const cl=unitDB(u.id).clears; return `<button class="unit-card" style="background:linear-gradient(135deg,${u.c},${u.cd})" onclick="openUnit('${u.id}')">${cl>0?`<div class="clr">🏆 ${cl}</div>`:''}<div class="emoji">${u.emoji}</div><div><div class="uname">${u.name}</div><div class="usub">${u.sub}</div></div></button>`; };
  const grid=us=>`<div class="unit-grid">${us.map(unitCard).join('')}</div>`;
  const head=(e,n)=>`<div class="subj-head"><span>${e} ${n}</span><span class="line"></span></div>`;

  /* ---------- 아이 홈 ---------- */
  window.home=function(){
    clearTimers(); PLAY=null; stopStudyClock(); setTheme(null); saveDB();
    document.title=appTitle()+' ✨';
    if(DB.viewer){ renderParent(); return; }
    const g=DB.grade||3, open=[1,2,3,4,5,6].filter(n=>!isLocked(n));
    const gradeBar=open.length>1?`<div class="gradebar">${open.map(n=>`<button class="gchip ${n===g?'on':''}" onclick="tryGrade(${n})">${n}학년</button>`).join('')}</div>`:'';
    const inG=u=>(u.grade||3)===g;
    const math=UNITS.filter(u=>inG(u)&&u.subj==='math');
    const others=SUBJECTS.filter(s=>s.id!=='math').map(s=>({s,us:UNITS.filter(u=>inG(u)&&u.subj===s.id)})).filter(x=>x.us.length);
    const streak=typeof dailyStreak==='function'?dailyStreak():0;
    app.innerHTML=`
      <div class="hbar"><div class="htitle">${appTitle()} ✨</div>
        <div class="hright"><span class="hpill">🎟️ ${DB.stickers}</span>${streak?`<span class="hpill">🔥 ${streak}일</span>`:''}<button class="hpill" onclick="toggleMute()">${DB.muted?'🔇':'🔊'}</button></div></div>
      ${gradeBar}
      ${typeof notifBarHTML==='function'?notifBarHTML():''}
      ${typeof questCardHTML==='function'?questCardHTML():''}
      ${g===3&&typeof dailyCardHTML==='function'?dailyCardHTML():''}
      <div class="row3"><button class="pri" onclick="openChat(null)">🤖 선생님</button><button onclick="openFamily()">💬 ${typeof famLabel==='function'?famLabel():'아빠'}${typeof famUnread==='function'&&famUnread()?`<span class="badge">${famUnread()}</span>`:''}</button><button onclick="renderGallery()">🎴 카드</button><button onclick="renderDashboard()">📊 기록</button></div>
      ${math.length?head('🧮','수학')+grid(math):''}
      ${others.length?`<details class="more"><summary>${others.map(x=>x.s.name).join(' · ')} — 단원 ${others.reduce((n,x)=>n+x.us.length,0)}개</summary>${others.map(x=>head(x.s.emoji,x.s.name)+grid(x.us)).join('')}</details>`:''}
      ${!math.length&&!others.length?`<div class="credit" style="margin:34px 0;font-size:16px">📚 ${g}학년 내용은 곧 추가될 거예요!</div>`:''}
      <div class="credit"><span id="sync-dot">${syncLabel()}</span></div>`;
  };

  /* ---------- 왜 틀렸을까 (아이·부모 공용) ---------- */
  window.whyCardHTML=function(limit){
    const ms=(DB.miss||[]).slice(0,40); if(!ms.length) return '';
    const cnt={}; ms.forEach(m=>{ const k=m.why||'(원인 미분류) '+m.cat; cnt[k]=(cnt[k]||0)+1; });
    const rows=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,limit||5).map(([k,v])=>`<div class="cat-row"><div class="lab"><span style="font-size:13.5px;font-weight:700">${k}</span><span style="color:#e8503a">✗${v}</span></div></div>`).join('');
    const recent=ms.slice(0,4).map(m=>`<div class="logrow"><span style="font-size:13px">${(UNITS.find(u=>u.id===m.u)||{}).emoji||'📚'} ${m.q.slice(0,34)} → <b>${m.a}</b> <span style="color:#e8503a">(아이 ${m.g})</span></span><span class="d">${fmtAgo(m.t)}</span></div>`).join('');
    return `<div class="card"><h3>🔍 왜 틀렸을까</h3>${rows}<div class="dim" style="margin:8px 0 2px">최근 오답</div>${recent}</div>`;
  };
  function unitRowsHTML(){
    return UNITS.filter(u=>(u.grade||3)===(DB.grade||3)&&unitDB(u.id).solved>0).map(u=>{ const d=unitDB(u.id); const a=Math.round(d.correct/d.solved*100); const col=a>=80?'#19a974':a>=50?'#f39c12':'#e8503a';
      return `<div class="cat-row"><div class="lab"><span>${u.emoji} ${u.name}</span><span style="color:${col}">${a}% <span class="dim">· ${d.solved}문제</span></span></div><div class="progress" style="height:9px;margin:3px 0 0"><div class="bar" style="width:${a}%;background:${col}"></div></div></div>`; }).join('')||'<p class="dim">아직 푼 단원이 없어요.</p>';
  }

  /* ---------- 아이 폰: 공부 기록 ---------- */
  window.renderDashboard=function(){
    stopStudyClock(); setTheme(null);
    if(DB.viewer){ renderParent(); return; }
    app.innerHTML=`
      <div class="topbar"><button class="back" onclick="home()">←</button><div class="t">📊 공부 기록</div><div class="spacer"></div><button class="mini" onclick="renderSettings()">🔧 부모 설정</button></div>
      ${typeof dailyAchievementHTML==='function'?dailyAchievementHTML():''}
      ${whyCardHTML(5)}
      ${typeof workSummaryHTML==='function'?workSummaryHTML():''}
      ${typeof paceSummaryHTML==='function'?paceSummaryHTML():''}
      <div class="card"><h3>📅 최근 7일</h3>${weekChart()}</div>
      <details class="more"><summary>단원별 정답률</summary><div class="card" style="margin-top:8px">${unitRowsHTML()}</div></details>
      <div class="credit">총 ${DB.totalSolved}문제 · 정답률 ${DB.totalSolved?Math.round(DB.totalCorrect/DB.totalSolved*100):0}% · 공부 ${fmtTime(DB.studySeconds)}</div>`;
  };

  /* ---------- 아이 폰: 부모 설정 (PIN) ---------- */
  window.renderSettings=function(skipPin){
    if(!skipPin&&!parentOK()) return;
    const pill=(on,t,fn)=>`<button class="wpill" style="${on?'border-color:var(--c);color:var(--c-dark)':'opacity:.5'}" onclick="${fn}">${on?'✅':'⬜'} ${t}</button>`;
    app.innerHTML=`
      <div class="topbar"><button class="back" onclick="renderDashboard()">←</button><div class="t">🔧 부모 설정</div></div>
      <div class="card">
        <div class="setrow"><div class="k">👧 아이 이름<small>제목이 "${appTitle()}"로 보여요 · 이 폰에만 저장</small></div><button class="wpill" onclick="setChildName()">${DB.name?'바꾸기':'넣기'}</button></div>
        <div class="setrow"><div class="k">📚 과제 양<small>보통 ≈25분 · 많이 ≈40분(퀴즈+심화)</small></div><div style="display:flex;gap:6px">${pill((DB.dailyLevel||'normal')==='normal','보통',"DB.dailyLevel='normal';saveDB();renderSettings(true)")}${pill(DB.dailyLevel==='more','많이',"DB.dailyLevel='more';saveDB();renderSettings(true)")}</div></div>
        <div class="setrow"><div class="k">👨‍👩‍👧 가족 코드<small>부모 폰에서 이 코드를 넣으면 같은 기록이 보여요</small></div><button class="wpill" onclick="showFamilyCode()">보기</button></div>
        ${typeof remindSettingHTML==='function'?remindSettingHTML():''}
        ${typeof workModeSettingHTML==='function'?workModeSettingHTML():''}
      </div>
      <div class="card"><h3>🔒 학년</h3><p class="dim">잠긴 학년은 PIN 없이 못 들어가요. 열린 학년이 둘 이상이면 홈에 선택 칩이 생겨요.</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${[1,2,3,4,5,6].map(n=>`<button class="wpill" style="${isLocked(n)?'opacity:.5':'border-color:var(--c);color:var(--c-dark)'}" onclick="DB.locked=DB.locked||{};DB.locked[${n}]=!DB.locked[${n}];if(DB.locked[${n}]&&DB.grade===${n})DB.grade=3;saveDB();renderSettings(true)">${isLocked(n)?'🔒':'🔓'} ${n}학년</button>`).join('')}</div></div>
      <div class="card"><h3>🛠️ 단원 안 단계</h3><p class="dim">끈 단계는 단원 화면에서 사라져요 (개념·퀴즈는 항상).</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${[['game','🎮 게임'],['expr','✍️ 식 세우기'],['think','🧠 생각'],['bank','🏦 문제은행'],['review','📘 복습'],['deep','🚀 심화']].map(([k,t])=>pill(DB.stages[k]!==false,t,`DB.stages['${k}']=!(DB.stages['${k}']!==false);saveDB();renderSettings(true)`)).join('')}</div></div>
      <div class="card">
        <div class="setrow"><div class="k">💾 백업 파일</div><div style="display:flex;gap:6px"><button class="wpill" onclick="exportData()">저장</button><button class="wpill" onclick="document.getElementById('impfile').click()">불러오기</button></div></div>
        <input type="file" id="impfile" accept=".json,application/json" style="display:none" onchange="importData(this)">
        <div class="setrow"><div class="k">🗑️ 기록 초기화<small>되돌릴 수 없어요</small></div><button class="wpill" style="border-color:#e8503a;color:#e8503a" onclick="resetAll()">초기화</button></div>
      </div>`;
  };

  /* ---------- 부모 폰: 함께 보기 화면 ---------- */
  window.renderParent=function(){
    clearTimers(); PLAY=null; stopStudyClock(); setTheme(null);
    const D=(DB.daily||{})[todayKey()];
    app.innerHTML=`
      <div class="hbar"><div class="htitle">${appTitle()} <span class="dim">· 부모</span></div>
        <div class="hright"><span class="hpill">👀 ${DB.lastPull?fmtAgo(DB.lastPull):'…'}</span><button class="hpill" onclick="pullNow(true).then(()=>{fetchHomework(true).then(()=>home())})">🔄</button></div></div>
      ${typeof notifBarHTML==='function'?notifBarHTML():''}
      ${typeof presenceHTML==='function'?presenceHTML():''}
      <div class="row3"><button class="pri" onclick="openFamily()">💬 ${DB.name?nameI(DB.name):'아이'}와 채팅${typeof famUnread==='function'&&famUnread()?`<span class="badge">${famUnread()}</span>`:''}</button><button style="background:#e056a0;border-color:#e056a0;color:#fff" onclick="renderGallery()">💌 응원 카드</button><button onclick="openChat(null)">🤖 선생님</button></div>
      ${typeof dailyCardHTML==='function'?dailyCardHTML():''}
      ${typeof parentReportHTML==='function'?parentReportHTML():''}
      ${typeof parentQuestHTML==='function'?parentQuestHTML():''}
      ${typeof parentHomeworkHTML==='function'?parentHomeworkHTML():''}
      ${whyCardHTML(5)||'<div class="card"><h3>🔍 왜 틀렸을까</h3><p class="dim">아직 오답 기록이 없어요.</p></div>'}
      ${typeof workInsightHTML==='function'?workInsightHTML(4):''}
      ${typeof dailyAchievementHTML==='function'?dailyAchievementHTML():''}
      ${typeof workSummaryHTML==='function'?workSummaryHTML():''}
      ${typeof paceSummaryHTML==='function'?paceSummaryHTML():''}
      <details class="more"><summary>더 보기 — 최근 7일 · 단원별 정답률</summary>
        <div class="card" style="margin-top:8px"><h3>📅 최근 7일</h3>${weekChart()}</div>
        <div class="card">${unitRowsHTML()}</div></details>
      <details class="more"><summary>설정</summary>
        <div class="card" style="margin-top:8px">
          <div class="setrow"><div class="k">👧 아이 이름<small>이 폰 제목 표시용</small></div><button class="wpill" onclick="setChildName()">${DB.name?'바꾸기':'넣기'}</button></div>
          <div class="setrow"><div class="k">🙋 채팅에서 내 이름</div><div style="display:flex;gap:6px">${['아빠','엄마'].map(f=>`<button class="wpill" style="${(DB.parentLabel||'아빠')===f?'border-color:var(--c);color:var(--c-dark)':'opacity:.55'}" onclick="DB.parentLabel='${f}';saveDB();home()">${f}</button>`).join('')}</div></div>
          ${typeof remindSettingHTML==='function'?remindSettingHTML():''}
          ${typeof workModeSettingHTML==='function'?workModeSettingHTML():''}
          <div class="setrow"><div class="k">가족 코드<small>${DB.lid}</small></div><button class="wpill" onclick="leaveViewer()">함께 보기 끄기</button></div>
        </div></details>`;
  };
})();
