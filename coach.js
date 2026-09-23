/* =========================================================
   🎤 음성 인터뷰 · 📋 학업 분석 리포트 · 🗺️ 지도 계획 반영 — 2026-09-24
   - 인터뷰: 선생님이 소리로 묻고(speechSynthesis) 아이는 말로 답함(SpeechRecognition, 없으면 키보드 🎤).
     /api/interview 가 한 턴씩 이해 정도(knows/partial/gap)를 판정 → DB.interviews 에 저장 → 학습기록 sync 로 리포트 재료가 됨
   - 리포트: 부모 폰에서 보기·지금 만들기(/api/report-start), 매주 일요일 20시 자동(서버 스케줄)
   - 계획: 아이 앱이 최신 리포트의 focus·interviewTopics 를 받아(DB.plan) 약점 훈련 출제·인터뷰 주제에 반영
   엔진·daily·expr 뒤, ui 앞에 로드.
   ========================================================= */
(function(){
  const API=()=>window.HW_API||TUTOR_API;
  const st=document.createElement('style'); st.textContent=`
  .iv-wrap{text-align:center}
  .iv-say{background:#fff;border:2px solid #f1e6d8;border-radius:20px;padding:16px;font-size:19px;font-weight:800;line-height:1.55;margin:6px 0 10px;text-align:left}
  .iv-prob{font-size:34px;font-weight:900;color:var(--c-dark);margin:6px 0 10px;letter-spacing:1px}
  .iv-mic{width:120px;height:120px;border-radius:60px;background:var(--c);color:#fff;font-size:46px;box-shadow:0 10px 24px rgba(0,0,0,.18);margin:8px auto;display:flex;align-items:center;justify-content:center}
  .iv-mic.rec{background:#e8503a;animation:ivp 1s infinite}
  @keyframes ivp{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
  .iv-heard{min-height:26px;font-size:16px;font-weight:700;color:var(--soft);margin:4px 0}
  .iv-row{display:flex;gap:8px;margin-top:8px}
  .iv-row input{flex:1;border:2px solid #eee;border-radius:14px;padding:12px;font-size:16px;font-weight:700}
  .iv-row button{background:#fff;border:2px solid #eee;border-radius:14px;padding:0 14px;font-weight:800}
  .rp-sig{display:inline-flex;align-items:center;gap:4px;border-radius:12px;padding:4px 10px;font-size:13px;font-weight:800;margin:3px 4px 3px 0}
  .rp-green{background:#e8f8f0;color:#138a5e}.rp-yellow{background:#fff6e0;color:#a86b00}.rp-red{background:#fdecea;color:#c0392b}
  .rp-sec h4{margin:14px 0 6px;font-size:15px;color:var(--c-dark)}
  .rp-item{background:var(--bg);border-radius:12px;padding:9px 11px;margin:6px 0;font-size:14px;line-height:1.55}
  .rp-item b{color:var(--ink)}
  `; document.head.appendChild(st);

  /* ---------- 음성 도구 ---------- */
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  window.coachSpeak=function(text){
    try{ if(DB.muted||!window.speechSynthesis) return; speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(String(text).replace(/[^\p{L}\p{N}\s.,?!~:]/gu,' ')); u.lang='ko-KR'; u.rate=0.95; u.pitch=1.05;
      const v=(speechSynthesis.getVoices()||[]).find(v=>(v.lang||'').toLowerCase().startsWith('ko')); if(v) u.voice=v;
      speechSynthesis.speak(u); }catch(e){}
  };
  let rec=null;
  window.coachListen=function(onText,onState){
    if(!SR){ onState&&onState('nosr'); return; }
    try{ if(rec) rec.abort(); }catch(e){}
    try{ window.speechSynthesis&&speechSynthesis.cancel(); }catch(e){}
    rec=new SR(); rec.lang='ko-KR'; rec.interimResults=true; rec.continuous=false; rec.maxAlternatives=1;
    let finalText='';
    rec.onresult=e=>{ let t=''; for(let i=0;i<e.results.length;i++){ t+=e.results[i][0].transcript; if(e.results[i].isFinal) finalText=t; } onState&&onState('hear',t); };
    rec.onerror=e=>{ onState&&onState('error',e.error); };
    rec.onend=()=>{ onState&&onState('end'); const t=(finalText||'').trim(); if(t) onText(t); };
    try{ rec.start(); onState&&onState('rec'); }catch(e){ onState&&onState('error','start'); }
  };
  window.coachStop=function(){ try{ rec&&rec.stop(); }catch(e){} };

  /* ---------- 🎤 인터뷰 ---------- */
  window.interviewTopics=function(){
    const plan=(DB.plan&&DB.plan.interviewTopics)||[];
    const weak=typeof weakList==='function'?weakList().map(s=>s.split('·').pop()):[];
    const base=['시계에서 긴바늘과 짧은바늘 읽기','곱셈이 무슨 뜻인지','받아올림이 왜 필요한지'];
    return [...new Set([...plan, ...weak.slice(0,2), ...base])].slice(0,3);
  };
  let IV=null;
  window.startInterview=function(opt){
    IV={body:opt.body, onDone:opt.onDone, topics:opt.topics||interviewTopics(), msgs:[], findings:[], answers:0, busy:false, say:'', problem:'', done:false};
    ivDraw(); ivAsk(false);
  };
  function ivDraw(state,heard){
    if(!IV) return; const b=IV.body; if(!b) return;
    b.innerHTML=`<div class="iv-wrap">
      <div class="quiz-top"><span class="score-pill">🎤 선생님이랑 이야기</span><span class="score-pill">${IV.answers}/6</span><button class="stopbtn" onclick="ivEnd()">그만</button></div>
      <div class="iv-say" id="iv-say">${IV.busy&&!IV.say?'선생님이 생각 중…':(IV.say||'')}</div>
      ${IV.clock&&typeof clockSVG==='function'?(()=>{ const [h,m]=IV.clock.split(':').map(Number); return `<div style="margin:4px 0 8px">${clockSVG(h%12||12,m,null,170)}</div>`; })():''}
      ${IV.problem?`<div class="iv-prob">${IV.problem}</div>`:''}
      ${IV.done?`<button class="bigbtn" onclick="ivFinish()">✅ 이야기 끝!</button>`:`
        <button class="iv-mic ${state==='rec'?'rec':''}" id="iv-mic" onclick="ivMic()" ${IV.busy?'disabled style="opacity:.5"':''}>${state==='rec'?'⏹':'🎤'}</button>
        <div class="iv-heard" id="iv-heard">${heard?`"${heard}"`:(IV.busy?'':(SR?'버튼을 누르고 말해 봐':'아래 칸을 누르고 키보드의 🎤로 말해도 돼'))}</div>
        <div class="iv-row"><input id="iv-text" placeholder="글로 써도 돼" maxlength="200" onkeydown="if(event.key==='Enter')ivSendText()"><button onclick="ivSendText()">보내기</button></div>
        <div class="iv-row"><button style="flex:1;padding:10px" onclick="coachSpeak(IV_say())">🔊 다시 듣기</button><button style="flex:1;padding:10px" onclick="ivSend('잘 모르겠어')">🤔 잘 모르겠어</button></div>`}
    </div>`;
  }
  window.IV_say=()=>IV?IV.say:'';
  async function ivAsk(final){
    if(!IV) return; IV.busy=true; ivDraw();
    try{
      const ctx={weak:typeof weakList==='function'?weakList():[], misses:(DB.miss||[]).slice(0,5).map(m=>({q:m.q,a:m.a,g:m.g}))};
      let r, j;
      for(let k=0;k<2;k++){ r=await fetch(API()+'/api/interview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:learnerId(),topics:IV.topics,ctx,messages:IV.msgs,final})}); j=await r.json().catch(()=>({})); if(r.ok&&j.say) break; }
      if(!IV) return;
      IV.say=j.say||'음, 다시 한 번 말해 줄래?'; IV.problem=j.problem||''; IV.clock=/^\d{1,2}:\d{2}$/.test(j.clock||'')?j.clock:''; IV.done=!!j.done;
      (j.findings||[]).forEach(f=>IV.findings.push(Object.assign({t:Date.now()},f)));
      IV.msgs.push({role:'assistant',content:IV.say});
    }catch(e){ IV.say='인터넷이 잠깐 안 되나 봐. 다시 눌러 줄래?'; }
    IV.busy=false; ivDraw(); coachSpeak(IV.say);
  }
  window.ivSend=function(text){ if(!IV||IV.busy||IV.done) return; text=String(text||'').trim(); if(!text) return; IV.msgs.push({role:'user',content:text}); IV.answers++; IV.say=''; ivAsk(IV.answers>=6); };
  window.ivSendText=function(){ const i=document.getElementById('iv-text'); if(i&&i.value.trim()){ const t=i.value; i.value=''; ivSend(t); } };
  window.ivMic=function(){
    if(!IV||IV.busy) return;
    const m=document.getElementById('iv-mic'); if(m&&m.classList.contains('rec')){ coachStop(); return; }
    coachListen(t=>ivSend(t),(s,x)=>{ if(s==='rec') ivDraw('rec'); else if(s==='hear'){ const h=document.getElementById('iv-heard'); if(h) h.textContent='"'+x+'"'; } else if(s==='error'){ const h=document.getElementById('iv-heard'); if(h) h.textContent=x==='not-allowed'?'마이크 허용이 필요해요. 아래 칸에 글로 써도 돼':'잘 안 들렸어. 다시 눌러 볼래?'; const mm=document.getElementById('iv-mic'); if(mm) mm.classList.remove('rec'); } else if(s==='nosr'){ document.getElementById('iv-text')?.focus(); } });
  };
  window.ivFinish=function(){
    if(!IV) return; try{ speechSynthesis.cancel(); }catch(e){}
    DB.interviews=DB.interviews||[]; DB.interviews.push({t:Date.now(), topics:IV.topics, findings:IV.findings.slice(0,12), turns:IV.msgs.slice(0,16).map(m=>({role:m.role,content:String(m.content).slice(0,300)}))});
    while(DB.interviews.length>10) DB.interviews.shift();
    saveDB(); syncSoon(); const n=IV.findings.length, cb=IV.onDone; IV=null; cb&&cb(n);
  };
  window.ivEnd=function(){ if(!IV) return; if(IV.answers>=3){ IV.done=true; ivFinish(); } else { try{ speechSynthesis.cancel(); }catch(e){} IV=null; home(); } };

  /* ---------- 🗺️ 지도 계획 (아이 앱) ---------- */
  let planLast=0;
  window.fetchPlan=async function(){
    if(DB.viewer||!navigator.onLine||Date.now()-planLast<30*60000) return false;
    try{ const r=await fetch(API()+'/api/report?id='+encodeURIComponent(learnerId())+'&plan=1'); const j=await r.json(); planLast=Date.now(); if(j.plan){ DB.plan=j.plan; saveDB(); } return true; }catch(e){ return false; }
  };

  /* ---------- 📋 리포트 (부모 폰) ---------- */
  window.fetchReports=async function(){
    try{ const r=await fetch(API()+'/api/report?id='+encodeURIComponent(DB.lid)); const j=await r.json(); if(Array.isArray(j.reports)){ DB.reports=j.reports; saveDB(); return true; } }catch(e){} return false;
  };
  window.subscribeReports=function(){ if(DB.reportSub||!DB.viewer||!DB.lid) return; fetch(API()+'/api/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'subscribe',id:DB.lid})}).then(r=>{ if(r.ok){ DB.reportSub=Date.now(); saveDB(); } }).catch(()=>{}); };
  window.makeReportNow=async function(){
    const jobId='r'+Array.from(crypto.getRandomValues(new Uint8Array(5))).map(b=>(b%36).toString(36)).join('')+Date.now().toString(36).slice(-4);
    DB.reportJob={jobId,t:Date.now(),status:'pending'}; saveDB(); home();
    try{ const r=await fetch(API()+'/api/report-start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:DB.lid,jobId})}); const j=await r.json().catch(()=>({}));
      if(!r.ok&&r.status!==202){ DB.reportJob={jobId,t:Date.now(),status:'error',error:j.error||('오류 '+r.status)}; saveDB(); home(); return; } }
    catch(e){ DB.reportJob={jobId,t:Date.now(),status:'error',error:'인터넷 연결을 확인해 주세요'}; saveDB(); home(); return; }
    for(let k=0;k<60;k++){ await new Promise(r=>setTimeout(r,5000));
      try{ const j=await (await fetch(API()+'/api/report?id='+encodeURIComponent(DB.lid)+'&job='+jobId)).json(); const s=j.job&&j.job.status;
        if(s==='done'){ DB.reportJob=null; await fetchReports(); saveDB(); if(!PLAY&&!curUnit) renderReport(0); return; }
        if(s==='error'){ DB.reportJob={jobId,t:Date.now(),status:'error',error:j.job.error}; saveDB(); if(!PLAY&&!curUnit) home(); return; } }catch(e){}
    }
    DB.reportJob={jobId,t:Date.now(),status:'error',error:'시간이 오래 걸려요. 잠시 뒤 새로고침해 보세요'}; saveDB(); home();
  };
  const SIG={green:'🟢',yellow:'🟡',red:'🔴'};
  window.parentReportHTML=function(){
    const R=(DB.reports||[])[0], J=DB.reportJob;
    const live=J&&J.status==='pending'?`<div class="logrow"><span>⏳ 선생님이 기록을 분석하는 중… (1~3분)</span><span class="d">${fmtAgo(J.t)}</span></div>`:J&&J.status==='error'?`<div class="logrow"><span style="color:#e8503a">⚠️ ${J.error}</span></div>`:'';
    const isNew=R&&R.t>(DB.reportSeen||0);
    return `<div class="card" style="border:2px solid #b6d4ff">
      <h3 style="color:#2e6fd1">📋 선생님 리포트 ${isNew?'<span class="rp-sig rp-red" style="margin-left:auto">NEW</span>':''}</h3>
      ${R?`<div style="font-weight:900;font-size:16px;margin:2px 0 6px">${R.headline}</div>
        <div>${(R.signals||[]).slice(0,5).map(s=>`<span class="rp-sig rp-${s.status}">${SIG[s.status]} ${s.area}</span>`).join('')}</div>
        <div class="dim" style="margin-top:6px">${new Date(R.t).toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short'})} · ${R.auto?'주간 자동':'직접 요청'} · 푼 문제 ${R.basis?R.basis.solved:'-'}개 기준</div>
        <button class="bigbtn" style="background:#2e86de;margin-top:8px" onclick="renderReport(0)">📋 리포트 전체 보기</button>`
       :`<p class="dim">아직 리포트가 없어요. 매주 일요일 저녁 8시에 자동으로 와요. 지금 바로 받아 볼 수도 있어요.</p>`}
      ${live}
      <button class="bigbtn ghost" style="margin-top:6px" onclick="makeReportNow()" ${J&&J.status==='pending'?'disabled':''}>🔄 지금 새로 분석하기</button>
    </div>`;
  };
  window.renderReport=function(i){
    const R=(DB.reports||[])[i]; if(!R){ home(); return; }
    DB.reportSeen=Math.max(DB.reportSeen||0,R.t); saveDB();
    const sev={high:'🔴 급함',mid:'🟡 보통',low:'🟢 가벼움'};
    const older=(DB.reports||[]).slice(1,6).map((r,k)=>`<div class="logrow" style="cursor:pointer" onclick="renderReport(${k+1})"><span>${r.headline}</span><span class="d">${new Date(r.t).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'})}</span></div>`).join('');
    app.innerHTML=`
      <div class="topbar"><button class="back" onclick="home()">←</button><div class="t">📋 선생님 리포트</div></div>
      <div class="card rp-sec">
        <div class="dim">${new Date(R.t).toLocaleString('ko-KR',{month:'long',day:'numeric',weekday:'short',hour:'numeric',minute:'2-digit'})} · 푼 문제 ${R.basis?R.basis.solved:'-'}개 기준</div>
        <h3 style="font-size:19px;margin:6px 0">${R.headline}</h3>
        <p style="font-size:15px">${R.summary}</p>
        <div>${(R.signals||[]).map(s=>`<div class="rp-item"><span class="rp-sig rp-${s.status}">${SIG[s.status]} ${s.area}</span> ${s.note}</div>`).join('')}</div>
        ${R.progress?`<h4>📈 지난 계획 대비</h4><div class="rp-item">${R.progress}</div>`:''}
        ${(R.strengths||[]).length?`<h4>👍 잘하는 것</h4>${R.strengths.map(s=>`<div class="rp-item">${s}</div>`).join('')}`:''}
        ${(R.weaknesses||[]).length?`<h4>🔍 취약점과 원인</h4>${R.weaknesses.map(w=>`<div class="rp-item"><b>${w.area}</b> <span class="dim">${sev[w.severity]||''}</span><br>근거: ${w.evidence}<br>원인: ${w.cause}</div>`).join('')}`:''}
        ${(R.homeTips||[]).length?`<h4>🏠 집에서 해 주실 것</h4>${R.homeTips.map((s,k)=>`<div class="rp-item">${k+1}. ${s}</div>`).join('')}`:''}
        ${(R.plan||[]).length?`<h4>🗺️ 선생님의 다음 지도 계획</h4>${R.plan.map(p=>`<div class="rp-item"><b>${p.when}</b> — ${p.what}<br><span class="dim">왜: ${p.why}</span></div>`).join('')}`:''}
        ${(R.focus||[]).length||(R.interviewTopics||[]).length?`<div class="tipbox" style="margin-top:12px">🤖 자동 반영: 다음 약점 훈련은 <b>${(R.focus||[]).map(k=>k.split('|')[1]).join(', ')||'-'}</b> 위주로, 다음 음성 인터뷰는 <b>${(R.interviewTopics||[]).join(', ')||'-'}</b>를 확인해요.</div>`:''}
        ${R.dataNote?`<h4>📊 데이터 메모</h4><div class="rp-item dim" style="font-weight:600">${R.dataNote}</div>`:''}
      </div>
      ${older?`<details class="more"><summary>지난 리포트</summary><div class="card" style="margin-top:8px">${older}</div></details>`:''}`;
    window.scrollTo(0,0);
  };

  /* ---------- 💬 채팅 음성 입력 ---------- */
  window.chatMic=function(){
    const btn=document.getElementById('chat-mic'), inp=document.getElementById('chat-input');
    if(!SR){ inp&&inp.focus(); alert('키보드의 🎤 버튼을 눌러 말하면 글로 바뀌어요.'); return; }
    if(btn&&btn.dataset.rec){ coachStop(); return; }
    coachListen(t=>{ if(inp) inp.value=t; sendChat(); },(s,x)=>{ if(!btn) return; if(s==='rec'){ btn.dataset.rec=1; btn.textContent='⏹'; } else if(s==='hear'){ if(inp) inp.value=x; } else if(s==='end'||s==='error'){ delete btn.dataset.rec; btn.textContent='🎤'; } });
  };
})();
