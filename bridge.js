/* 학습 설명 → 부모 상담 연결. 검토본: 원본 앱과 배포본에는 적용하지 않음. */
(function(){
  'use strict';
  const css=document.createElement('style');
  css.textContent=`
    .bridge-card{border:2px solid #b9d9ff;background:linear-gradient(135deg,#f0f7ff,#fff);}
    .bridge-card p{margin:5px 0 12px;line-height:1.55;color:var(--soft);font-size:14px;}
    .bridge-actions{display:flex;gap:8px;flex-wrap:wrap;}
    .bridge-actions button{border:2px solid #82b7ef;border-radius:13px;background:#fff;color:#2468ae;padding:10px 13px;font-size:14px;font-weight:850;}
    .bridge-actions .bridge-main{background:#2e6fd1;border-color:#2e6fd1;color:#fff;}
    .bridge-note{background:#fff;border:1px solid #dbeafb;border-radius:12px;padding:10px 12px;margin:8px 0;font-size:14px;line-height:1.55;white-space:pre-wrap;word-break:break-word;}
    .bridge-overlay{position:fixed;inset:0;z-index:180;background:rgba(28,40,58,.58);display:flex;align-items:flex-end;justify-content:center;padding:10px;}
    .bridge-sheet{width:min(100%,550px);max-height:92vh;overflow:auto;background:#fff;border-radius:22px;padding:18px;box-shadow:0 14px 50px #192a4a55;}
    .bridge-sheet h2{font-size:20px;margin:2px 0 10px;}
    .bridge-sheet p{font-size:15px;line-height:1.55;}
    .bridge-sheet textarea{width:100%;min-height:110px;resize:vertical;border:2px solid #c9def7;border-radius:15px;padding:12px;font:inherit;line-height:1.55;}
    .bridge-status{min-height:20px;color:#a24e22;font-size:13px;margin:7px 0;}
    @media(min-width:650px){.bridge-overlay{align-items:center;}}
  `;
  document.head.appendChild(css);

  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const plain=s=>String(s??'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
  const recent=()=>Array.isArray(DB.explainLog)?DB.explainLog:[];
  let active=null;

  window.bridgeChildCardHTML=function(){
    if(DB.viewer||!DB.lastExplainQuestion) return '';
    const q=DB.lastExplainQuestion;
    const saved=recent().find(x=>x.source===q.t);
    if(saved&&Date.now()-saved.t>2*3600*1000) return ''; // 남긴 뒤 2시간 지나면 카드 숨김
    if(saved) return `<div class="card bridge-card"><h3>✅ 내 생각을 남겼어</h3>
      <p>선생님과 이어서 이야기하거나, 다음 문제를 풀어 봐.</p>
      <div class="bridge-actions"><button onclick="bridgeAsk()">선생님과 이어서</button></div></div>`;
    return `<div class="card bridge-card"><h3>🗣️ 내 말로 설명해 보기</h3>
      <p>최근에 틀린 문제, 처음에 어떻게 생각했는지 말해 줄래? 틀려도 괜찮아 — 네 생각이 궁금해.</p>
      <div class="bridge-actions"><button class="bridge-main" onclick="openExplain()">말하거나 글로 남기기</button><button onclick="openChat(null)">선생님에게 묻기</button></div></div>`;
  };
  window.bridgeAsk=function(){
    const note=recent().find(x=>x.source===DB.lastExplainQuestion?.t);
    if(!note) return openChat(null);
    openChat({unit:note.unit,q:note.q,a:note.a,given:note.g,cat:note.cat,explanation:note.text});
  };

  window.bridgeParentHTML=function(){
    if(!DB.viewer) return '';
    const list=recent().slice(0,3);
    const notes=list.length?list.map(x=>`<div class="bridge-note"><b>${escape(x.unit||'수학')} · ${x.ok?'맞힌 문제':'다시 살핀 문제'}</b><br>
      <span class="dim">${escape(x.q)}</span><br>“${escape(x.text)}”</div>`).join(''):'<p class="dim">아이가 문제를 푼 뒤 자기 말로 설명하면 여기에 표시돼요.</p>';
    return `<div class="card bridge-card"><h3>🌉 아이와 나를 잇는 선생님</h3>
      <p>아이의 설명은 정답 판정이 아닌 생각의 단서예요. 선생님에게 상담하면 기록을 바탕으로 집에서 어떻게 물을지 제안해 줍니다.</p>
      ${notes}<div class="bridge-actions"><button class="bridge-main" onclick="openChat(null)">선생님과 상담</button><button onclick="openFamily()">아이에게 직접 말하기</button></div></div>`;
  };

  window.openExplain=function(){
    if(DB.viewer||!DB.lastExplainQuestion) return;
    active=Object.assign({},DB.lastExplainQuestion);
    const old=document.getElementById('bridge-overlay'); if(old) old.remove();
    const overlay=document.createElement('div'); overlay.id='bridge-overlay'; overlay.className='bridge-overlay';
    overlay.innerHTML=`<div class="bridge-sheet" role="dialog" aria-modal="true" aria-labelledby="bridge-title">
      <h2 id="bridge-title">🗣️ 어떻게 생각했어?</h2>
      <p class="dim">${escape(active.q)}</p>
      <p>${active.ok?'왜 그렇게 풀었는지 네 말로 알려 줘.':'처음에는 어떻게 생각했어? 지금은 어떻게 다시 풀어 볼래?'}</p>
      <textarea id="bridge-text" maxlength="240" placeholder="예: 같은 수가 세 묶음이라서 곱했어. 이름이나 학교 같은 정보는 적지 않아도 돼."></textarea>
      <div class="bridge-status" id="bridge-status"></div>
      <div class="bridge-actions"><button onclick="bridgeMic()">🎤 말로 입력</button><button class="bridge-main" onclick="bridgeSave()">내 생각 남기기</button><button onclick="bridgeClose()">나중에</button></div>
      <p class="dim" style="font-size:12px">이 앱은 목소리 파일을 저장하지 않고, 확인한 글만 학습 기록에 남겨요.</p>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('textarea').focus();
  };
  window.bridgeClose=function(){
    document.getElementById('bridge-overlay')?.remove(); active=null;
  };
  window.bridgeMic=function(){
    const ta=document.getElementById('bridge-text'), status=document.getElementById('bridge-status');
    if(!ta||typeof coachListen!=='function') return;
    coachListen(t=>{ ta.value=String(t).slice(0,240); status.textContent='말한 내용을 확인하고 [내 생각 남기기]를 눌러 줘.'; },
      (state,heard)=>{ if(state==='hear') status.textContent=String(heard||'');
        else if(state==='nosr') status.textContent='이 기기는 말로 입력을 지원하지 않아. 글로 적어 줘.';
        else if(state==='error') status.textContent='마이크를 쓸 수 없어. 글로 적어도 돼.'; });
  };
  window.bridgeSave=function(){
    const ta=document.getElementById('bridge-text'), status=document.getElementById('bridge-status');
    if(!active||!ta) return;
    const value=ta.value.trim().slice(0,240);
    if(value.length<2){ status.textContent='한 문장이나 “잘 모르겠어”라고 남겨 줘.'; ta.focus(); return; }
    const entry={t:Date.now(),source:active.t,u:active.u,unit:active.unit,cat:active.cat,q:active.q,
      a:active.a,g:active.g,ok:!!active.ok,text:value};
    DB.explainLog=[entry,...recent().filter(x=>x.source!==entry.source)].slice(0,30);
    saveDB(); syncSoon(); bridgeClose(); home();
  };
  window.bridgeParentContext=function(){
    const explanations=recent().slice(0,3).map(x=>({unit:x.unit,q:x.q,answer:x.a,given:x.g,
      correct:x.ok,text:x.text}));
    // 최근 오답 3개 + 아이가 식을 쓴 최근 오답(최대 5개) — 식이 가장 강한 근거
    const workTxt=w=>w?[...(w.l||[]),w.col?`세로셈 ${w.col.a}${w.col.op}${w.col.b} 답칸 ${w.col.r}`:''].filter(Boolean).join(' / '):'';
    const pick=[...(DB.miss||[]).slice(0,3),...(DB.miss||[]).filter(x=>x.w&&(x.w.l||x.w.col))].filter((x,i,a)=>a.indexOf(x)===i).slice(0,5);
    const misses=pick.map(x=>({unit:(UNITS.find(u=>u.id===x.u)||{}).name||'',q:x.q,answer:x.a,given:x.g,why:x.why||'',work:workTxt(x.w)}));
    // 최근 음성 인터뷰에서 선생님이 판정한 것
    const findings=(DB.interviews||[]).slice(-2).flatMap(iv=>iv.findings||[]).slice(-6).map(f=>({concept:f.concept,status:f.status,evidence:f.evidence}));
    return {explanations,misses,findings};
  };
})();
