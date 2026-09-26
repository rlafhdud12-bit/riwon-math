/* 작성: GPT(Codex·메인북) · 2026-09-26 — 표시만 변경, 기존 오늘 과제·보상 로직 유지 */
(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.dailyCardHTML=function(){
    const D=ensureDaily();if(!D)return '<div class="card"><h3>오늘의 과제</h3><p class="dim">아이가 오늘 앱을 열면 과제가 보여요.</p></div>';
    if(typeof syncHwTasks==='function')syncHwTasks(D);
    const done=D.tasks.filter(t=>t.done).length,total=D.tasks.length,next=D.tasks.find(t=>!t.done),pct=total?Math.round(done/total*100):0;
    const rows=D.tasks.map(t=>`<div class="today-row"><span aria-hidden="true">${t.done?'✓':'○'}</span><div class="info"><b>${esc(t.title)}</b><small>${t.done?(t.total?esc(t.total)+'문제 중 처음 맞힌 '+esc(t.correct)+'개':'완료'):esc(t.sub)}</small></div>${!t.done&&!DB.viewer?`<button class="wpill" onclick="startDaily('${esc(t.id)}')">풀기</button>`:''}</div>`).join('');
    return `<section class="today-card" aria-label="오늘의 과제"><div class="today-caption"><h3>오늘의 작은 무대</h3><span class="today-count">${done} / ${total} 완료</span></div><div class="today-track" role="progressbar" aria-label="오늘 과제 완료" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><span style="width:${pct}%"></span></div>${next&&!DB.viewer?`<div class="today-next"><div class="label">지금 할 일</div><h4>${esc(next.title)}</h4><p>${esc(next.sub)}</p><button onclick="startDaily('${esc(next.id)}')">이 도전 시작하기 →</button></div>`:D.allDone?'<div class="today-celebrate">으쓱! 오늘 약속한 과제를 마쳤어 ✨</div>':''}${!DB.viewer&&typeof fanWelcomeHTML==='function'?fanWelcomeHTML():''}<details class="today-all"${DB.viewer?' open':''}><summary>오늘 과제 ${total}개 모두 보기 · 남은 ${total-done}개</summary>${rows}</details><div class="today-note">${D.allDone?dailyRewardText(D).replaceAll('스티커','으쓱'):'오늘 과제를 다 마치면 으쓱이 쌓여요. 어제 못한 과제가 오늘의 빚으로 붙지는 않아요.'}</div></section>`;
  };
  const originalTheme=setTheme;
  window.setTheme=function(u){originalTheme(u);if(!u){document.documentElement.style.setProperty('--c','#ac4778');document.documentElement.style.setProperty('--c-dark','#81345f');}};
  // 사진 테마는 출제·채점과 분리해 문제 위에만 표시한다.
  const unitRender=renderUnit;
  window.renderUnit=function(){unitRender();addBanner();};
  const dailyStart=startDaily;
  window.startDaily=function(id){dailyStart(id);addBanner();};
  function addBanner(){if(DB.viewer||typeof fanStageHTML!=='function')return;const top=app.querySelector('.topbar');if(top&&!app.querySelector('.fan-stage'))top.insertAdjacentHTML('afterend',fanStageHTML());}
})();
