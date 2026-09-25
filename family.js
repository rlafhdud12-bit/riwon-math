/* =========================================================
   👨‍👧 가족 채팅 · 🔔 알림(웹 푸시) · 🐢 천천히 브레이크 — 2026-09-24
   - 채팅: /api/family (아이 폰=child, 부모 폰=parent). 채팅 화면이 열려 있을 때만 4초마다 새 메시지 확인.
     아이 이름은 서버에 보내지 않는다(각 폰이 자기 DB.name 으로 표시).
   - 알림: 서비스워커 push → 앱이 꺼져 있어도 폰 알림. 아이: 매일 숙제 시간·퀘스트·숙제·응원 카드·아빠 메시지 / 부모: 아이 메시지·과제 완료·리포트
   - 천천히 브레이크: 3초 안에 제출하면 채점 전에 한 번 멈춤("다시 볼게"/"확신해"). 빠른 답·느린 답 정답률을 DB.pace 에 기록 → 리포트 분석
   엔진·daily·expr·coach 뒤, ui 앞에 로드.
   ========================================================= */
(function(){
  const API=()=>window.HW_API||TUTOR_API;
  const VAPID='BBc3r2o9UH2_I9cXFcnr-Wsl1gaBBgVI1jLG7UhzLP8JQqWyQDoubwsCwvfuply-MFX5I69pd1H_KD4QrgQngWA';
  const st=document.createElement('style'); st.textContent=`
  .badge{display:inline-block;min-width:18px;padding:1px 6px;border-radius:10px;background:#e8503a;color:#fff;font-size:11.5px;font-weight:900;margin-left:4px;line-height:16px}
  .fam-row{display:flex;gap:6px;padding:0 12px 8px;background:#fff}
  .fam-row button{flex:1;background:#fff5e8;border:2px solid #ffd9a8;border-radius:14px;padding:7px 0;font-size:18px}
  .msg .who{display:block;font-size:11.5px;font-weight:800;opacity:.7;margin-bottom:2px}
  .msg .tm{display:block;font-size:10.5px;opacity:.6;margin-top:3px;text-align:right}
  .pace-box{background:#fff6e0;border:2px solid #ffd27a;border-radius:16px;padding:12px;font-weight:900;color:#8a5a00;font-size:16px}
  .pace-row{display:flex;gap:8px;margin-top:10px}
  .choice-btn.pace-pick{outline:4px solid #ffd27a;outline-offset:2px}
  .pace-row button{flex:1;border-radius:12px;padding:11px;font-weight:900;font-size:15px}
  .pace-row button:first-child{background:#fff;border:2px solid #ffd27a;color:#8a5a00}
  .pace-row button:last-child{background:var(--c);color:#fff}
  .notif-bar{display:flex;align-items:center;gap:8px;background:#eef6ff;border:2px solid #b6d4ff;border-radius:16px;padding:10px 12px;margin:0 0 12px;font-size:13.5px;font-weight:700}
  .notif-bar button{margin-left:auto;background:#2e86de;color:#fff;border-radius:12px;padding:8px 12px;font-weight:900;white-space:nowrap}
  `; document.head.appendChild(st);
  const role=()=>DB.viewer?'parent':'child';
  const lid=()=>DB.viewer?DB.lid:learnerId();
  // 부모 폰이 여러 대(엄마·아빠)일 수 있어 기기마다 익명 표시를 둔다 → '내가 보낸 말'을 기기로 가림
  const devId=()=>{ if(!DB.devId){ DB.devId=Array.from(crypto.getRandomValues(new Uint8Array(6))).map(b=>(b%36).toString(36)).join(''); saveDB(); } return DB.devId; };
  const isMine=m=>m.from===role()&&(!DB.viewer||!m.dev||m.dev===devId());
  const hhmm=t=>{ const d=new Date(t); return (d.getMonth()+1)+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); };

  /* ================= 👨‍👧 가족 채팅 ================= */
  let FAM=null, famTimer=null;
  window.famLabel=()=>DB.parentLabel||'아빠';
  window.famUnread=()=>DB.famUnread||0;
  window.checkFamily=async function(){
    if(!navigator.onLine) return false;
    try{ const j=await (await fetch(API()+'/api/family?id='+encodeURIComponent(lid())+'&since='+(DB.famRead||0))).json();
      learnLabel(j.msgs);
      const n=(j.msgs||[]).filter(m=>!isMine(m)).length; const changed=n!==(DB.famUnread||0); DB.famUnread=n; saveDB(); return changed; }catch(e){ return false; }
  };
  // 아이 폰은 부모가 고른 호칭(아빠/엄마)을 모른다 → 부모가 보낸 마지막 메시지의 이름으로 배운다
  //   엄마·아빠 둘 다 보내면 "엄마·아빠"
  function learnLabel(msgs){ if(DB.viewer) return; const names=new Set(DB.parentNames||[]); (msgs||[]).forEach(m=>{ if(m.from==='parent'&&m.name) names.add(m.name); });
    const list=[...names].sort((a,b)=>a==='엄마'?-1:b==='엄마'?1:0).slice(0,3), label=list.join('·');
    if(label&&label!==DB.parentLabel){ DB.parentNames=list; DB.parentLabel=label; saveDB(); } }
  window.openFamily=async function(){
    if(document.getElementById('family')){ famPull(); return; } // 이미 열려 있으면(알림을 또 누름) 새 메시지만
    FAM={msgs:[], last:0, busy:false};
    const el=document.createElement('div'); el.className='chat-wrap'; el.id='family'; document.body.appendChild(el);
    const other=DB.viewer?(DB.name||'아이'):famLabel();
    el.innerHTML=`
      <div class="chat-top"><button class="back" onclick="closeFamily()">←</button><div class="t">💬 ${other}${DB.viewer?'와':'랑'} 이야기</div></div>
      <div class="chat-log" id="fam-log"><div class="msg sys">불러오는 중…</div></div>
      <div class="fam-row">${['❤️','👍','🎉','💪','😊','🙏'].map(e=>`<button onclick="famSend('${e}')">${e}</button>`).join('')}</div>
      <div class="chat-in"><button id="fam-mic" onclick="famMic()" style="background:#fff;color:var(--c-dark);border:2px solid #eee;padding:0 12px">🎤</button><input id="fam-input" placeholder="${other}에게 말해 봐…" maxlength="300" onkeydown="if(event.key==='Enter'){famSend()}"><button id="fam-send" onclick="famSend()">보내기</button></div>`;
    await famPull(true);
    famTimer=setInterval(()=>{ if(!document.hidden) famPull(); },4000);
  };
  window.closeFamily=function(){ clearInterval(famTimer); famTimer=null; const el=document.getElementById('family'); if(el) el.remove(); FAM=null; DB.famUnread=0; saveDB(); if(!PLAY&&!curUnit) home(); }; // 문제 풀다 알림으로 들어왔으면 풀던 화면으로 돌아감
  async function famPull(first){
    if(!FAM) return;
    try{ const j=await (await fetch(API()+'/api/family?id='+encodeURIComponent(lid())+'&since='+(first?0:FAM.last))).json();
      const log=document.getElementById('fam-log'); if(!log||!FAM) return;
      if(first){ log.innerHTML=(j.msgs||[]).length?'':`<div class="msg sys">아직 주고받은 말이 없어요. 첫 인사를 해 볼까요? 😊</div>`; }
      learnLabel(j.msgs);
      (j.msgs||[]).forEach(m=>{ if(m.t<=FAM.last) return; FAM.last=m.t; famBubble(m); });
      if(FAM.last){ DB.famRead=FAM.last; DB.famUnread=0; saveDB(); }
    }catch(e){ if(first){ const log=document.getElementById('fam-log'); if(log) log.innerHTML='<div class="msg sys">인터넷 연결을 확인해 주세요.</div>'; } }
  }
  function famBubble(m){
    const log=document.getElementById('fam-log'); if(!log) return;
    const sys=log.querySelector('.msg.sys'); if(sys) sys.remove();
    const mine=isMine(m);
    const who=m.from==='parent'?(m.name||'아빠'):(DB.viewer?(DB.name||'아이'):'나');
    const d=document.createElement('div'); d.className='msg '+(mine?'me':'t');
    const big=/^\p{Extended_Pictographic}{1,3}$/u.test(m.text);
    d.innerHTML=`${mine?'':`<span class="who">${who}</span>`}<span style="${big?'font-size:34px':''}"></span><span class="tm">${hhmm(m.t)}</span>`;
    d.children[mine?0:1].textContent=m.text;
    log.appendChild(d); log.scrollTop=log.scrollHeight;
  }
  window.famSend=async function(preset){
    if(!FAM||FAM.busy) return; const inp=document.getElementById('fam-input');
    const text=String(preset||(inp&&inp.value)||'').trim(); if(!text) return; if(inp&&!preset) inp.value='';
    FAM.busy=true;
    try{ const r=await fetch(API()+'/api/family',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'send',id:lid(),from:role(),name:DB.viewer?famLabel():'',dev:DB.viewer?devId():'',text})});
      const j=await r.json(); if(j.msg){ FAM.last=Math.max(FAM.last,j.msg.t); famBubble(j.msg); DB.famRead=FAM.last; saveDB(); } else alert('못 보냈어요: '+(j.error||r.status)); }
    catch(e){ alert('인터넷 연결을 확인해 주세요.'); if(inp&&!preset) inp.value=text; }
    FAM.busy=false;
  };
  window.famMic=function(){
    const btn=document.getElementById('fam-mic'), inp=document.getElementById('fam-input');
    if(typeof coachListen!=='function'||!(window.SpeechRecognition||window.webkitSpeechRecognition)){ inp&&inp.focus(); alert('키보드의 🎤 버튼을 눌러 말하면 글로 바뀌어요.'); return; }
    if(btn&&btn.dataset.rec){ coachStop(); return; }
    coachListen(t=>{ if(inp) inp.value=t; famSend(); },(s,x)=>{ if(!btn) return; if(s==='rec'){ btn.dataset.rec=1; btn.textContent='⏹'; } else if(s==='hear'){ if(inp) inp.value=x; } else if(s==='end'||s==='error'){ delete btn.dataset.rec; btn.textContent='🎤'; } });
  };

  /* ================= 🔔 알림 (웹 푸시) ================= */
  const pushSupported=()=>('serviceWorker' in navigator)&&('PushManager' in window)&&('Notification' in window);
  const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone=()=>window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  function b64u8(s){ const p='='.repeat((4-s.length%4)%4); const b=atob((s+p).replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from([...b].map(c=>c.charCodeAt(0))); }
  window.pushStatus=function(){
    if(!pushSupported()) return isIOS()&&!standalone()?'ios-install':'unsupported';
    if(Notification.permission==='denied') return 'denied';
    return DB.pushOn&&Notification.permission==='granted'?'on':'off';
  };
  window.enablePush=async function(){
    const s=pushStatus();
    if(s==='ios-install'){ alert('아이폰은 먼저 Safari 공유 버튼(□↑) → "홈 화면에 추가"로 앱을 설치한 뒤, 홈 화면의 공부노트에서 켜야 알림이 와요.'); return false; }
    if(s==='unsupported'){ alert('이 브라우저는 알림을 지원하지 않아요. 크롬(안드로이드)이나 홈 화면에 설치한 앱에서 켜 주세요.'); return false; }
    if(s==='denied'){ alert('알림이 차단돼 있어요. 폰 설정 → 앱(크롬/공부노트) → 알림에서 허용해 주세요.'); return false; }
    try{
      const perm=await Notification.requestPermission(); if(perm!=='granted'){ alert('알림을 허용해야 켜져요.'); return false; }
      const reg=await navigator.serviceWorker.ready;
      let sub=await reg.pushManager.getSubscription(); if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:b64u8(VAPID)});
      const r=await fetch(API()+'/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'subscribe',id:lid(),role:role(),sub:sub.toJSON()})});
      if(!r.ok) throw new Error('서버 등록 실패 '+r.status);
      DB.pushOn=role(); saveDB();
      fetch(API()+'/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'test',id:lid(),role:role()})}).catch(()=>{});
      alert('알림이 켜졌어요! 시험 알림이 곧 와요 🔔'); return true;
    }catch(e){ alert('알림을 켜지 못했어요: '+e.message); return false; }
  };
  // 켜 둔 폰은 하루 한 번 조용히 다시 등록(폰이 구독 주소를 바꾸면 서버가 옛 주소를 지워 알림이 끊기는 것 방지)
  window.resyncPush=async function(){
    if(!DB.pushOn||!pushSupported()||Notification.permission!=='granted'||DB.pushSync===todayKey()) return;
    try{ const reg=await navigator.serviceWorker.ready; let sub=await reg.pushManager.getSubscription(); if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:b64u8(VAPID)});
      const r=await fetch(API()+'/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'subscribe',id:lid(),role:role(),sub:sub.toJSON()})});
      if(r.ok){ DB.pushOn=role(); DB.pushSync=todayKey(); saveDB(); } }catch(e){}
  };
  window.notifBarHTML=function(){
    const s=pushStatus(); if(s==='on'||s==='unsupported'||DB.notifBarHide===todayKey()) return '';
    const msg=s==='ios-install'?'아이폰은 공유 버튼 → 「홈 화면에 추가」로 설치한 앱에서 알림을 켤 수 있어요'
      :s==='denied'?'알림이 막혀 있어요. 폰 설정 → 알림에서 이 앱(또는 크롬)을 허용해 주세요'
      :DB.viewer?'알림을 켜면 아이 메시지·과제 완료·리포트를 바로 알려 드려요':`알림을 켜면 숙제 시간·${famLabel()} 메시지·숙제 도착을 알려 줘요`;
    return `<div class="notif-bar">🔔 ${msg}${s==='off'?`<button onclick="enablePush().then(ok=>{ if(ok) home(); })">켜기</button>`:''}<span onclick="DB.notifBarHide=todayKey();saveDB();home()" style="cursor:pointer;color:var(--soft);font-weight:900;padding:0 2px">✕</span></div>`;
  };
  // 매일 숙제 알림 시각(서버 설정, 아이별 1개)
  window.remindSettingHTML=function(){
    const s=DB.remind||{remindAt:'17:00',enabled:false};
    return `<div class="setrow"><div class="k">⏰ 매일 숙제 알림<small>아이 폰에 알림(오늘 과제를 다 했으면 안 울려요)</small></div>
      <div style="display:flex;gap:6px;align-items:center"><input type="time" id="remind-at" value="${s.remindAt}" style="border:2px solid #eee;border-radius:10px;padding:6px;font-weight:800">
      <button class="wpill" style="${s.enabled?'border-color:var(--c);color:var(--c-dark)':'opacity:.55'}" onclick="saveRemind(${!s.enabled})">${s.enabled?'✅ 켜짐':'⬜ 꺼짐'}</button></div></div>
      <div class="setrow"><div class="k">🔔 이 폰 알림<small>${({on:'켜져 있어요',off:'꺼져 있어요',denied:'차단됨 — 폰 설정에서 허용',unsupported:'이 브라우저는 지원 안 함','ios-install':'아이폰은 홈 화면에 추가 후 켜기'})[pushStatus()]}</small></div><div style="display:flex;gap:6px">${pushStatus()==='on'?'<button class="wpill" onclick="pushTest()">시험</button>':''}<button class="wpill" onclick="enablePush().then(()=>{ loadRemind(); })">${pushStatus()==='on'?'다시 등록':'켜기'}</button></div></div>`;
  };
  // 알림이 정말 오는지 스스로 확인: 서버가 이 역할로 등록된 폰 몇 대에 보냈는지 알려 준다
  window.pushTest=async function(){
    try{ const j=await (await fetch(API()+'/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'test',id:lid(),role:role()})})).json();
      alert(j.sent?`시험 알림을 폰 ${j.sent}대에 보냈어요. 몇 초 안에 안 오면 폰 설정 → 알림에서 크롬(또는 공부노트)을 허용해 주세요.`:'서버에 등록된 이 폰이 없어요. [다시 등록]을 눌러 주세요.'); }
    catch(e){ alert('인터넷 연결을 확인해 주세요.'); }
  };
  window.loadRemind=async function(){ try{ const j=await (await fetch(API()+'/api/push?id='+encodeURIComponent(lid()))).json(); if(j.settings){ DB.remind=j.settings; DB.remindCounts=j.counts; saveDB(); } }catch(e){} rerender(); };
  window.saveRemind=async function(enabled){
    const at=(document.getElementById('remind-at')||{}).value||'17:00';
    try{ const r=await fetch(API()+'/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'settings',id:lid(),remindAt:at,enabled})}); const j=await r.json(); if(j.settings){ DB.remind=j.settings; saveDB(); } else alert(j.error||'저장 실패'); }catch(e){ alert('인터넷 연결을 확인해 주세요.'); }
    rerender();
  };
  function rerender(){ const t=document.querySelector('.topbar .t')?.textContent||''; if(t.includes('부모 설정')) renderSettings(true); else if(DB.viewer&&!PLAY&&!curUnit&&!document.getElementById('family')) home(); }

  /* ================= 🐢 천천히 브레이크 ================= */
  const FAST_MS=3000;
  window.paceCheck=function(P){
    // 멈춘 상태에서 다시 제출: 같은 답이면 "확신해"와 같고(빠른 답 그대로), 다른 답을 골랐으면 다시 생각한 것
    if(P.pausing){ P.pausing=false; P.paceOk=true; P.lastFast=(P.buf===P.pausedBuf); return false; }
    if(P.paceOk) return false;
    P.lastFast=(Date.now()-(P.shownAt||0))<FAST_MS;
    if(!P.lastFast) return false;
    if((P.paceGap||0)>0){ P.paceGap--; return false; }
    const fb=document.getElementById('fb'); if(!fb) return false;
    P.pausing=true; P.paceGap=2; P.pausedBuf=P.buf;
    DB.pace=DB.pace||{}; DB.pace.pauses=(DB.pace.pauses||0)+1;
    if(P.cur&&P.cur.choices){ const b=document.getElementById('ch'+P.buf); if(b) b.classList.add('pace-pick'); } // 뭘 골랐는지 보이게
    fb.className='feedback'; fb.innerHTML=`<div class="pace-box">🐢 잠깐! 너무 빨랐어. 한 번만 더 확인해 볼까?<div class="pace-row"><button onclick="paceAgain()">🔍 다시 볼게</button><button onclick="paceSure()">✅ 확신해</button></div></div>`;
    return true;
  };
  // 멈춘 상태에서 숫자판을 누르면 = 다시 보기로 치고 새로 입력(원래 답 뒤에 숫자가 붙지 않게). ⌫는 고쳐 쓰기라 답을 남김
  window.paceEdit=function(P,fresh){ P.pausing=false; P.paceOk=true; P.lastFast=false; if(fresh) P.buf=''; DB.pace.again=(DB.pace.again||0)+1; saveDB();
    const fb=document.getElementById('fb'); if(fb){ fb.className='feedback'; fb.textContent='좋아, 천천히 다시 풀어 봐 👀'; } };
  window.paceAgain=function(){ const P=PLAY; if(!P) return; document.querySelectorAll('.pace-pick').forEach(b=>b.classList.remove('pace-pick')); P.pausing=false; P.paceOk=true; P.lastFast=false; P.buf=''; const a=document.getElementById('ans'); if(a){ a.textContent='?'; a.classList.add('empty'); } const fb=document.getElementById('fb'); if(fb){ fb.className='feedback'; fb.textContent='좋아, 천천히 다시 풀어 봐 👀'; } DB.pace.again=(DB.pace.again||0)+1; saveDB(); };
  window.paceSure=function(){ const P=PLAY; if(!P) return; P.pausing=false; P.paceOk=true; submit(); };
  window.paceRecord=function(P,ok){
    DB.pace=DB.pace||{}; const k=P.lastFast?'fast':'slow'; const s=DB.pace[k]=DB.pace[k]||{n:0,ok:0}; s.n++; if(ok) s.ok++;
    if(P.paceOk&&!P.lastFast){ const r=DB.pace.recheck=DB.pace.recheck||{n:0,ok:0}; r.n++; if(ok) r.ok++; } // 멈춘 뒤 다시 본 문제
  };
  window.paceSummaryHTML=function(){
    const p=DB.pace||{}; const f=p.fast||{n:0,ok:0}, s=p.slow||{n:0,ok:0}, r=p.recheck||{n:0,ok:0}; if(f.n+s.n<10) return '';
    const pc=x=>x.n?Math.round(x.ok/x.n*100)+'%':'-';
    return `<div class="card"><h3>🐢 빠르기와 정확도</h3><div class="dash-grid">
      <div class="dash-stat"><div class="v">${pc(f)}</div><div class="k">3초 안에 푼 문제 (${f.n})</div></div>
      <div class="dash-stat"><div class="v">${pc(s)}</div><div class="k">천천히 푼 문제 (${s.n})</div></div></div>
      ${r.n?`<p class="dim" style="margin-top:8px">멈춘 뒤 다시 보고 푼 문제 정답률 ${pc(r)} (${r.n}문제)</p>`:''}</div>`;
  };

  /* ================= 👀 접속 상태 (아이 폰 → 부모 폰) =================
     앱을 "보고 있는" 동안만 1분마다 신호(화면·마지막 입력 시각·오늘 푼 문제 수). 켜 놓기만 하고 안 푸는 것도 보이게 마지막 입력을 같이 보낸다. */
  let lastInput=0, lastPing=0, lastScreen='', pingTimer=null;
  function screenName(){
    if(document.getElementById('family')) return '💬 가족 채팅';
    if(document.getElementById('chat')) return '🤖 선생님 채팅';
    if(document.querySelector('.iv-row,.iv-prob')) return '🎤 음성 인터뷰';
    if(typeof PLAY!=='undefined'&&PLAY){ const u=(UNITS.find(x=>x.id===(PLAY.cur&&PLAY.cur.unitId||PLAY.unitId))||{}).name;
      const kind=PLAY.hw?(PLAY.daily&&String(PLAY.daily).startsWith('quest:')?'🎁 퀘스트':'📸 사진 숙제'):PLAY.daily?'🎯 오늘의 과제':'✏️ 문제 풀이';
      return kind+(u&&!PLAY.hw?' · '+u:''); }
    if(document.getElementById('ex-slot')) return '✍️ 식 세우기';
    if(typeof curUnit!=='undefined'&&curUnit) return '📘 '+curUnit.name+' 단원';
    const t=document.querySelector('.topbar .t'); return t?t.textContent.trim().slice(0,20):'🏠 홈';
  }
  function ping(state,beacon){
    if(DB.viewer||!navigator.onLine) return; lastPing=Date.now(); lastScreen=screenName();
    const d=(DB.days||{})[todayKey()]||{s:0,c:0};
    const body=JSON.stringify({id:learnerId(), state, screen:lastScreen, lastInput, solved:d.s||0, correct:d.c||0});
    try{ if(beacon&&navigator.sendBeacon){ navigator.sendBeacon(API()+'/api/presence', new Blob([body],{type:'text/plain'})); return; }
      fetch(API()+'/api/presence',{method:'POST',headers:{'Content-Type':'text/plain'},body,keepalive:true}).catch(()=>{}); }catch(e){}
  }
  window.presenceStart=function(){
    if(DB.viewer||pingTimer) return;
    const mark=()=>{ lastInput=Date.now(); if(Date.now()-lastPing>20000&&screenName()!==lastScreen) ping('on'); }; // 화면이 바뀌면 조금 빨리 알림
    document.addEventListener('pointerdown',mark,true); document.addEventListener('keydown',mark,true);
    document.addEventListener('visibilitychange',()=>{ if(document.hidden) ping('off',true); else ping('on'); });
    window.addEventListener('pagehide',()=>ping('off',true));
    pingTimer=setInterval(()=>{ if(!document.hidden) ping('on'); },60000);
    ping('on');
  };
  // 부모 폰: 상태 카드
  let PRES=null, presTimer=null;
  const ago=ms=>{ const m=Math.round(ms/60000); return m<1?'방금':m<60?m+'분 전':m<1440?Math.floor(m/60)+'시간 '+(m%60?m%60+'분 ':'')+'전':Math.floor(m/1440)+'일 전'; };
  const clock=t=>{ const d=new Date(t), h=d.getHours(); return `${h<12?'오전':'오후'} ${h%12||12}:${String(d.getMinutes()).padStart(2,'0')}`; };
  window.presenceHTML=function(){
    if(!DB.viewer) return '';
    const who=DB.name?nameI(DB.name):'아이';
    if(!PRES) return `<div class="card" id="presence"><h3>👀 ${who} 지금</h3><p class="dim">불러오는 중…</p></div>`;
    const L=PRES.last, now=PRES.now||Date.now(); let head='', sub='';
    if(!L) head=`⚪ 아직 접속 기록이 없어요 <span class="dim">(아이 폰 앱이 새 버전이 되면 보여요)</span>`;
    else { const since=now-L.t, idle=L.lastInput?now-L.lastInput:Infinity;
      if(L.state==='on'&&since<150000){
        if(idle<120000){ head=`🟢 <b>지금 공부 중</b>`; sub=`${L.screen} · 마지막 입력 ${ago(idle)}`; }
        else { head=`🟡 <b>앱은 켜져 있는데 ${Math.round(idle/60000)}분째 입력이 없어요</b>`; sub=L.screen; } }
      else { head=`⚪ 마지막 접속 <b>${ago(since)}</b>`; sub=`${new Date(L.t).toDateString()===new Date().toDateString()?'오늘':(new Date(L.t).getMonth()+1)+'/'+new Date(L.t).getDate()} ${clock(L.t)} · ${L.screen||''}`; } }
    const T=PRES.today||{min:0,n:0,solved:0};
    const days=(PRES.days||[]).slice(0,7).map(d=>`<div class="logrow"><span>${d.d.slice(5).replace('-','/')}</span><span>${d.min}분 · ${d.n}번 · 문제 ${d.solved}개</span></div>`).join('');
    const pin=DB.pinBad&&DB.pinBad.n?`<p style="margin-top:6px;font-size:12.5px;color:#b7791f">🔐 아이 폰에서 부모 확인 숫자를 틀린 횟수 <b>${DB.pinBad.n}</b>번 (마지막 ${ago(Date.now()-DB.pinBad.t)})</p>`:'';
    return `<div class="card" id="presence"><h3>👀 ${who} 지금</h3><div style="font-size:15.5px">${head}</div>${sub?`<div class="dim" style="margin-top:2px">${sub}</div>`:''}
      <div style="margin-top:8px;font-size:14px">오늘 앱 사용 <b>${T.min}분</b> · ${T.n}번 들어옴 · 문제 ${T.solved}개</div>${pin}
      ${days?`<details class="more"><summary>최근 7일 접속</summary>${days}</details>`:''}</div>`;
  };
  window.presenceFetch=async function(){
    if(!DB.viewer||!navigator.onLine) return;
    try{ const j=await (await fetch(API()+'/api/presence?id='+encodeURIComponent(DB.lid))).json(); if(j.ok){ PRES=j; const el=document.getElementById('presence'); if(el) el.outerHTML=presenceHTML(); } }catch(e){}
  };
  window.presenceWatch=function(){ if(!DB.viewer||presTimer) return; presenceFetch(); presTimer=setInterval(()=>{ if(!document.hidden&&document.getElementById('presence')) presenceFetch(); },30000);
    document.addEventListener('visibilitychange',()=>{ if(!document.hidden) presenceFetch(); }); };

  /* ================= 알림 눌러서 들어왔을 때 ================= */
  window.routeHash=function(){
    const h=location.hash; if(!h) return; history.replaceState(null,'',location.pathname+location.search);
    if(h==='#family') openFamily();
    else if(h==='#report'&&DB.viewer&&typeof fetchReports==='function') fetchReports().then(()=>renderReport(0));
    else if(h==='#interview'&&!DB.viewer&&typeof startIvReq==='function'){ if(typeof PLAY!=='undefined'&&PLAY) return; startIvReq(); }
  };
  if(navigator.serviceWorker) navigator.serviceWorker.addEventListener('message',e=>{
    if(e.data&&e.data.hash){ location.hash=e.data.hash; routeHash(); return; }
    // 앱을 켜 둔 채 알림이 오면 화면도 바로 갱신(채팅 배지·카드·숙제)
    if(e.data&&e.data.push){ const idle=()=>!PLAY&&!curUnit&&!document.getElementById('family');
      if(document.getElementById('family')) famPull();
      else checkFamily().then(ch=>{ if(ch&&idle()) home(); });
      if(!DB.viewer){ if(typeof fetchIvReq==='function') fetchIvReq().then(ch=>{ if(ch&&idle()) home(); }); if(typeof fetchCheer==='function') fetchCheer(); if(typeof fetchHomework==='function') fetchHomework().then(ok=>{ if(ok&&idle()) home(); }); }
      else if(typeof pullNow==='function') pullNow(true).then(ok=>{ if(ok&&idle()) home(); }); }
  });
})();
