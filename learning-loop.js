/* 작은 관찰을 쌓는 학습 루프. 점수·스티커·필수 과제 완료 조건은 바꾸지 않는다. */
(function(){
  'use strict';
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const plain=s=>String(s==null?'':s).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
  const dateKey=()=>typeof todayKey==='function'?todayKey():new Date().toISOString().slice(0,10);
  const names={reading:'글의 뜻 살피기',spatial:'방향과 모양 살피기',number:'수와 계산 살피기',math:'수학 풀이'};
  const helpSeen=new WeakSet(), attemptSeen=new WeakSet();
  function records(){ return Array.isArray(DB.learningEvidence)?DB.learningEvidence:[]; }
  function persist(){ saveDB(); if(typeof syncSoon==='function') syncSoon(); }
  function put(e){
    if(DB.viewer) return;
    DB.learningEvidence=records();
    const id=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
    DB.learningEvidence.push(Object.assign({id,t:Date.now(),day:dateKey(),version:1},e));
    DB.learningEvidence=DB.learningEvidence.slice(-600);
  }
  window.learningMarkHelp=function(P){ if(P&&P.cur) helpSeen.add(P.cur); };
  window.learningRecordAttempt=function(P,ok){
    if(DB.viewer||!P||!P.cur||attemptSeen.has(P.cur)) return;
    const c=P.cur; attemptSeen.add(c);
    const unit=c.unitId||P.unitId, u=UNITS.find(x=>x.id===unit);
    if(!u) return;
    const helped=helpSeen.has(c), practice=!!(c.retry||c.fromWrong||P.mode==='review');
    // 한 번의 오답으로 능력을 단정하지 않고 첫 풀이·도움·재연습을 나누어 저장.
    put({source:'quiz',unit,cat:plain(c.cat).slice(0,80),tag:u.subj==='math'?'math':'subject',
      itemKey:unit+'|'+plain(c.q).slice(0,240),question:plain(c.q).slice(0,240),
      firstAnswer:plain(c.given).slice(0,160),correct:!!ok,helped,practice,
      independent:!helped&&!practice,helpStatus:'앱 풀이 도움만 기록·외부 도움은 알 수 없음'});
  };
  function independentRows(rows){
    const seen=new Set();
    return rows.filter(e=>{
      if(!e.independent||e.practice||e.helped) return false;
      const key=e.itemKey||e.id;
      if(seen.has(key)) return false;
      seen.add(key); return true;
    });
  }
  function summarize(rows){
    const independent=independentRows(rows), n=independent.length, correct=independent.filter(e=>e.correct).length;
    const days=new Set(independent.map(e=>e.day)).size;
    const enough=n>=6&&days>=2;
    return {n,correct,wrong:n-correct,days,helped:rows.filter(e=>e.helped).length,total:rows.length,
      enough,status:!enough?'더 살펴보는 중':(correct/n>=0.8?'혼자 해결한 모습이 쌓였어요':'함께 연습할 부분을 살펴봐요')};
  }
  window.learningSummary=function(){
    const recent=records().filter(e=>Number(e.t)>=Date.now()-30*86400000), byTag={};
    ['reading','spatial','number'].forEach(tag=>{byTag[tag]=summarize(recent.filter(e=>e.tag===tag));});
    const grouped={};
    recent.filter(e=>e.source==='quiz'&&e.unit&&e.cat&&UNITS.some(u=>u.id===e.unit&&u.subj==='math')).forEach(e=>{ const k=e.unit+'|'+e.cat; (grouped[k]||(grouped[k]=[])).push(e); });
    return {byTag,categories:Object.entries(grouped).map(([key,rows])=>Object.assign({key,unit:rows[0].unit,cat:rows[0].cat},summarize(rows))),total:recent.length};
  };
  window.learningWeakScores=function(){
    return learningSummary().categories.filter(s=>s.enough&&s.wrong>=2&&s.correct/s.n<0.8&&UNITS.some(u=>u.id===s.unit&&u.subj==='math'&&(u.grade||3)===3))
      .map(s=>({unit:s.unit,cat:s.cat,score:1+4*s.wrong/s.n,reason:`최근 30일 서로 다른 ${s.n}문제 · 혼자 맞힌 ${s.correct}개`}));
  };
  window.learningAdjustWeakScores=function(baseline){
    // 기존 학습 이력과 선생님 집중 유형을 삭제하지 않는다. 최근 충분한 성공 근거가 쌓일 때만 완화.
    const recent=records().filter(e=>e.source==='quiz'&&Number(e.t)>=Date.now()-14*86400000);
    return baseline.map(w=>{
      const rows=independentRows(recent.filter(e=>e.unit===w.unit&&e.cat===w.cat)).sort((a,b)=>Number(a.t)-Number(b.t));
      const n=rows.length, days=new Set(rows.map(e=>e.day)).size, correct=rows.filter(e=>e.correct).length;
      const stable=n>=8&&days>=3&&correct/n>=0.875&&rows.slice(-3).every(e=>e.correct);
      return Object.assign({},w,stable?{score:w.score*0.25,baseScore:w.score,reason:`최근 14일 ${n}개 독립 풀이·${days}일의 성공 근거로 연습 비중 완화`}:{});
    });
  };
  // 주간계획은 부모가 확인한 현재 주차의 단원만 사용. 루트의 업로드 UI와 공유하는 어댑터.
  window.learningSchoolFocus=function(){
    const day=dateKey(), plans=Array.isArray(DB.schoolPlans)?DB.schoolPlans:[];
    const plan=plans.filter(p=>p&&p.status==='confirmed'&&Number(p.confirmedAt)>0&&Number(p.grade)===3&&/^\d{4}-\d{2}-\d{2}$/.test(p.weekStart||'')&&/^\d{4}-\d{2}-\d{2}$/.test(p.weekEnd||'')&&p.weekStart<=day&&p.weekEnd>=day)
      .sort((a,b)=>Number(b.confirmedAt)-Number(a.confirmedAt))[0];
    if(!plan) return [];
    const units=Array.isArray(plan.subjects)?plan.subjects:[];
    return [...new Set(units.filter(s=>s&&s.subject==='math'&&s.confirmed===true&&MODULES[s.unitId]&&UNITS.some(u=>u.id===s.unitId&&u.subj==='math'&&(u.grade||3)===3)).map(s=>s.unitId))];
  };
  function shell(title,html){
    const old=document.getElementById('learning-sheet'); if(old) old.remove();
    const overlay=document.createElement('div'); overlay.id='learning-sheet'; overlay.className='bridge-overlay';
    overlay.innerHTML=`<section class="bridge-sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h2>${esc(title)}</h2><button class="wpill" onclick="closeLearningSheet()" aria-label="닫기">닫기 ✕</button></div><div id="learning-sheet-body">${html}</div></section>`;
    overlay.addEventListener('keydown',e=>{if(e.key==='Escape') closeLearningSheet();});
    document.body.appendChild(overlay); overlay.querySelector('button').focus();
  }
  window.closeLearningSheet=function(){ const el=document.getElementById('learning-sheet');if(el)el.remove(); mission=null; };
  function statsText(s){return `서로 다른 첫 풀이 ${s.n}개 중 혼자 맞힌 ${s.correct}개 · ${s.days}일 관찰 · 도움 사용 ${s.helped}회`;}
  window.openLearningProfile=function(){
    if(!DB.viewer){ shell('나의 작은 발견','<p>한 번 틀려도 괜찮아. 어떤 방법이 편한지 함께 찾아보자.</p><button class="bigbtn" onclick="openInterestMission()">✨ 선택 미션 해보기</button>');return;}
    const s=learningSummary(), focus=learningSchoolFocus();
    shell('선생님의 학습 관찰',`<p>최근 30일의 앱 풀이를 살펴봐요. 한 번의 오답으로 약점을 정하지 않아요.</p>
      ${Object.entries(s.byTag).map(([tag,x])=>`<div class="bridge-note"><b>${names[tag]}</b><p>${esc(x.status)}</p><small>${statsText(x)}</small></div>`).join('')}
      <h3>수학 유형별 풀이 근거</h3>${s.categories.slice().sort((a,b)=>b.n-a.n).slice(0,8).map(x=>`<div class="bridge-note"><b>${esc((UNITS.find(u=>u.id===x.unit)||{}).name||x.unit)} · ${esc(x.cat)}</b><p>${esc(x.status)}</p><small>${statsText(x)}</small></div>`).join('')||'<p>새 관찰 기록이 아직 없어요. 기존 학습 기록과 과제는 그대로 이어집니다.</p>'}
      <p>${focus.length?'이번 주 확인한 수학 단원: '+focus.map(id=>esc((UNITS.find(u=>u.id===id)||{}).name||id)).join(', '):'부모가 확인한 이번 주 수학 단원이 아직 없어요.'}</p>
      <div class="tipbox">다음 행동: 함께 막힌 유형 한 가지를 그림으로 풀어보고, 다른 날 새 문제로 확인해 주세요.<br><br>6개 이상·2일 이상은 임시 관찰 기준이에요. 같은 문제 반복과 도움 후 정답은 독립 풀이에서 제외해요. 앱 밖 도움은 알 수 없고, 학년 수준·지능·자존감·어려움의 원인을 판정하지 않아요.</div>`);
  };
  // 직접 작성한 결정적 정답 문항. 임상·성적 진단이나 생성 AI 정답에 의존하지 않는다.
  const reading=[
    ['댄스 연습은 수요일에는 쉬어요. 월요일과 금요일에는 연습해요. 쉬는 날은 언제일까요?',['월요일','수요일','금요일'],1,'“수요일에는 쉬어요”라는 문장을 찾아봐.'],
    ['소라는 공연 전에 물을 마시고, 그다음 신발 끈을 묶었어요. 먼저 한 일은 무엇일까요?',['신발 끈 묶기','공연 끝내기','물 마시기'],2,'“그다음”보다 앞에 한 일을 찾아봐.'],
    ['관찰 노트에는 잎의 색을 먼저 적고 잎의 수를 나중에 적어요. 먼저 기록할 것은?',['잎의 색','잎의 수','화분의 가격'],0,'무엇을 “먼저” 적는다고 했는지 읽어봐.'],
    ['비가 와서 무대 연습 장소를 운동장에서 강당으로 바꿨어요. 장소를 바꾼 까닭은?',['노래가 좋아서','강당이 멀어서','비가 와서'],2,'문장에서 “와서” 앞에 이유가 있어.'],
    ['작은 연구실에서 파란 상자는 종이를, 노란 상자는 연필을 담아요. 연필은 어느 상자에 넣을까요?',['노란 상자','파란 상자','두 상자 모두'],0,'연필을 담는다고 한 상자를 찾아봐.'],
    ['연습실에 들어가면 가방을 놓고 손을 씻어요. 손을 씻은 뒤 음악을 켜요. 음악을 켜기 바로 전에 한 일은?',['가방 찾기','손 씻기','문 닫기'],1,'“손을 씻은 뒤 음악을 켜요”의 순서를 살펴봐.']
  ];
  const spatial=[
    ['무대에서 위쪽 ↑을 보고 있어요. 오른쪽으로 한 번(90도) 돌면 어느 쪽일까요?',['→','←','↓'],0,'↑에서 시계 방향으로 네모 모서리 한 칸만 돌아봐.'],
    ['오른쪽 →을 보고 있어요. 왼쪽으로 한 번(90도) 돌면 어느 쪽일까요?',['↓','↑','←'],1,'→에서 시계 반대 방향으로 한 칸 돌아봐.'],
    ['아래쪽 ↓을 보고 있어요. 반 바퀴(180도) 돌면 어느 쪽일까요?',['→','←','↑'],2,'반 바퀴 돌면 처음 방향의 반대쪽이야.'],
    ['왼쪽 ←을 보고 있어요. 오른쪽으로 한 번(90도) 돌면 어느 쪽일까요?',['↓','↑','→'],1,'←에서 시계 방향으로 한 칸 돌아봐.'],
    ['정사각형 종이를 세로 선을 따라 같은 크기 둘로 자르면 어떤 모양 두 개가 될까요?',['삼각형','원','직사각형'],2,'정사각형의 위에서 아래로 곧게 한 줄 잘라봐.'],
    ['블록 3개를 한 줄로 놓고, 각 블록 위에 블록을 1개씩 더 올렸어요. 위에서 내려다보면 몇 자리가 보일까요?',['3자리','6자리','2자리'],0,'위의 블록은 아래 블록과 같은 자리에 포개져 있어.']
  ];
  const numbers=[
    ['댄스 팀 4명이 리본을 3개씩 가져왔어요. 리본은 모두 몇 개일까요?',['7개','12개','16개'],1,'3개씩 4묶음이야. 3+3+3+3을 생각해 봐.'],
    ['관찰 카드 18장을 3명에게 똑같이 나누어요. 한 명이 받는 카드는?',['6장','9장','15장'],0,'3명에게 1장씩 나눠주는 일을 몇 번 할 수 있을까?'],
    ['연습 스티커가 27장 있어요. 15장을 더 받으면 모두 몇 장일까요?',['32장','52장','42장'],2,'27에 10을 더하고, 다시 5를 더해 봐.'],
    ['연구 노트가 50권 있었는데 18권을 나누었어요. 남은 노트는?',['42권','32권','38권'],1,'50에서 10을 빼고, 다시 8을 빼 봐.'],
    ['똑같은 간식 꾸러미 5개에 과자가 2개씩 들어 있어요. 과자는 모두?',['10개','7개','12개'],0,'2개씩 5묶음, 2+2+2+2+2야.'],
    ['병원 놀이 번호표 24장을 4묶음으로 똑같이 나누어요. 한 묶음에 몇 장?',['4장','8장','6장'],2,'4묶음에 1장씩 넣으며 24장이 될 때까지 생각해 봐.']
  ];
  const bank=[];
  [['reading',reading],['spatial',spatial],['number',numbers]].forEach(([tag,list])=>list.forEach((v,i)=>bank.push({id:tag+'-v1-'+i,tag,q:v[0],choices:v[1],a:v[2],hint:v[3]})));
  window.learningMissionBank=function(){return bank.map(q=>Object.assign({},q,{choices:q.choices.slice()}));};
  let mission=null;
  window.openInterestMission=function(){
    if(DB.viewer){shell('함께할 작은 미션','<p>아이 화면에서 선택 미션을 시작할 수 있어요. 끝나면 학습 관찰에서 결과를 볼 수 있어요.</p>');return;}
    shell('✨ 3분 작은 발견',`<p>댄스 연습실과 작은 연구실을 여행해 볼까? 짧은 미션 3개야. 원하면 언제든 쉬어도 돼.</p><p>선택 미션은 오늘 필수 과제와 별개이고, 스티커나 상점이 추가되지 않아.</p><button class="bigbtn" onclick="startInterestMission()">좋아, 시작!</button><button class="bigbtn ghost" onclick="closeLearningSheet()">다음에 할래</button>`);
  };
  window.startInterestMission=function(){
    if(DB.viewer) return;
    const all=records(), selected=['reading','spatial','number'].map(tag=>{
      const candidates=bank.filter(q=>q.tag===tag);
      return candidates.find(q=>!all.some(e=>e.itemKey===q.id))||candidates[new Date().getDate()%candidates.length];
    });
    mission={items:selected,i:0,helped:false,first:null,answered:false}; renderMission();
  };
  function renderMission(){
    const el=document.getElementById('learning-sheet-body'); if(!el||!mission)return;
    if(mission.i>=mission.items.length){el.innerHTML='<div style="text-align:center;font-size:42px">🌟</div><h3>오늘의 작은 발견 완료!</h3><p>생각해 보고 도움을 청한 것도 좋은 연습이야. 아빠에게 가장 재미있었던 미션을 이야기해 볼까?</p><button class="bigbtn" onclick="closeLearningSheet()">돌아가기</button>';return;}
    const q=mission.items[mission.i];
    el.innerHTML=`<p>${mission.i+1}/3 · ${names[q.tag]}</p><h3 style="line-height:1.7">${esc(q.q)}</h3><div class="choice-grid">${q.choices.map((v,i)=>`<button class="choice-btn" onclick="answerInterestMission(${i})">${esc(v)}</button>`).join('')}</div><div id="interest-feedback" aria-live="polite"></div><button class="bigbtn ghost" onclick="hintInterestMission()">💡 같이 생각해 볼래</button><button class="wpill" onclick="closeLearningSheet()">여기서 쉬기</button>`;
  }
  window.hintInterestMission=function(){
    if(!mission||mission.answered||mission.i>=mission.items.length)return;
    mission.helped=true; const el=document.getElementById('interest-feedback');if(el)el.textContent=mission.items[mission.i].hint;
  };
  window.answerInterestMission=function(i){
    if(DB.viewer||!mission||mission.answered||mission.i>=mission.items.length)return;
    const q=mission.items[mission.i];if(!Number.isInteger(i)||i<0||i>=q.choices.length)return;
    mission.answered=true;mission.first=i;
    const practice=records().some(e=>e.itemKey===q.id);
    put({source:'interest',tag:q.tag,itemKey:q.id,question:q.q,firstAnswer:q.choices[i],correct:i===q.a,
      helped:mission.helped,practice,independent:!mission.helped&&!practice,helpStatus:'앱 힌트만 기록·외부 도움은 알 수 없음'}); persist();
    const el=document.getElementById('learning-sheet-body');if(!el)return;
    el.querySelectorAll('.choice-btn').forEach(b=>b.disabled=true);
    const fb=document.getElementById('interest-feedback');fb.innerHTML=`<div class="tipbox">${i===q.a?'맞았어! 생각해 낸 방법도 떠올려 보자.':'같이 알아보자. 정답은 '+esc(q.choices[q.a])+'이야.'}<br>${esc(q.hint)}</div><button class="bigbtn" onclick="nextInterestMission()">${mission.i===2?'작은 발견 마치기':'다음 작은 발견 →'}</button>`;
  };
  window.nextInterestMission=function(){if(!mission||!mission.answered)return;mission.i++;mission.helped=false;mission.first=null;mission.answered=false;renderMission();};
})();
