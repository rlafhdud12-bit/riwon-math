/* Family promises. Existing DB.stickers is read-only; reservations live on the server. */
(function () {
  'use strict';
  const role = () => DB.viewer ? 'parent' : 'child';
  const lid = () => DB.viewer ? DB.lid : learnerId();
  const api = () => window.HW_API || TUTOR_API;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Array.from(crypto.getRandomValues(new Uint8Array(12)), n => n.toString(16).padStart(2, '0')).join('');
  const storageKey = () => 'family_goals_pending_v1:' + lid() + ':' + role();
  let state = null, owner = '', busy = false, loading = false, error = '', form = null, timer = null, pending = null, lastRead = 0;
  const shell = () => document.getElementById('reward-goals');
  const labels = {proposed:'답장 기다리는 중',earning:'으쓱을 모으는 중',ready:'목표를 모았어요',requested:'사용 요청했어요',completed:'함께 했어요',declined:'이번에는 어려워요',cancelled:'취소한 약속'};
  const actionLabels = {create:'새 제안',accept:'수락',counter:'다른 제안',decline:'반려',redeem:'사용 요청',complete:'함께 했어요',cancel:'취소',excuse:'쉼 예외'};
  const who = value => value === 'parent' ? '아빠·엄마' : '아이';
  const myWho = () => role() === 'parent' ? '아이' : '아빠·엄마';
  function savePending(value) { pending = value ? JSON.parse(JSON.stringify(value)) : null; try { if (pending) localStorage.setItem(storageKey(), JSON.stringify(pending)); else localStorage.removeItem(storageKey()); } catch (_) {} }
  function readPending() { try { pending = JSON.parse(localStorage.getItem(storageKey()) || 'null'); } catch (_) { pending = null; } }
  function goalById(id) { return state && state.goals.find(g => g.id === id); }
  function available() { return Math.max(0, Number(state && state.balance && state.balance.available) || 0); }
  function normalized(payload) { return {goals:Array.isArray(payload.goals) ? payload.goals : [],balance:payload.balance || {},daily:payload.daily || {},activeFrom:payload.activeFrom || ''}; }
  function chooseOwner() { const key = lid() + ':' + role(); if (key !== owner) { state = null; owner = key; pending = null; lastRead = 0; } }
  function countersHTML() { return `<b>🌟 으쓱 ${esc(Math.max(0,Number(DB.stickers) || 0))}</b><span style="margin-left:16px">😅 머쓱 ${state ? esc(state.daily.count || 0) : '확인 중'}</span>`; }
  function updateSummary() { const counters = document.getElementById('rg-home-counters'); if (counters) counters.innerHTML = countersHTML(); const message = document.getElementById('rg-home-message'); if (message) { const count = state ? state.goals.filter(g => g.status === 'proposed' && g.proposer !== role()).length : 0; message.textContent = count ? `답장을 기다리는 제안 ${count}개가 있어요.` : '하고 싶은 일을 제안하고, 함께 약속해요.'; } }
  async function request(url, options) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
    try { return await fetch(url, {...options,signal:controller.signal}); }
    catch (e) { if (e.name === 'AbortError') throw new Error('연결이 늦어지고 있어요. 전송 결과를 다시 확인해 주세요.'); throw e; }
    finally { clearTimeout(timeout); }
  }
  const button = (text, action, id, cls) => `<button type="button" class="rg-btn ${cls || ''}" data-action="${action}"${id ? ` data-id="${esc(id)}"` : ''}${busy || pending ? ' disabled' : ''}>${text}</button>`;
  function ensureStyle() {
    if (document.getElementById('reward-goals-style')) return;
    const style = document.createElement('style'); style.id = 'reward-goals-style';
    style.textContent = `#reward-goals{position:fixed;inset:0;z-index:1200;background:#fff8fc;color:#40334f;overflow:auto;font-family:inherit;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}#reward-goals *{box-sizing:border-box}.rg-inner{max-width:640px;margin:auto;padding:16px 16px 40px}.rg-head{display:flex;align-items:center;gap:12px;position:sticky;top:0;background:#fff8fc;z-index:1;padding:12px 0}.rg-head h2{font-size:21px;margin:0;flex:1}.rg-btn{border:1px solid #dccbef;background:#f2eaff;color:#5b397a;border-radius:14px;padding:12px 16px;font:inherit;font-size:14px;font-weight:800;cursor:pointer;min-height:44px}.rg-btn:disabled{opacity:.48;cursor:wait}.rg-btn.primary{background:#8750ad;color:white;border-color:#8750ad}.rg-btn.mint{background:#ddf5ec;border-color:#b6dfcd;color:#275b4e}.rg-btn.plain{background:white}.rg-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.rg-card{background:#fff;border:1px solid #eddef0;border-radius:23px;padding:20px;margin:14px 0;box-shadow:0 6px 20px #74506b08}.rg-card h3{font-size:18px;margin:8px 0}.rg-card p{line-height:1.6;margin:8px 0;overflow-wrap:anywhere}.rg-small{color:#6c5d76;font-size:13px;line-height:1.6}.rg-tag{display:inline-block;font-size:12px;font-weight:800;padding:5px 9px;border-radius:9px;background:#f3edff;color:#624480}.rg-wallet{background:linear-gradient(115deg,#ffe6f2,#eeeaff 65%,#dff7ee);border-radius:24px;padding:20px;line-height:1.8}.rg-wallet strong{font-size:25px;color:#6d398e}.rg-error{padding:14px;border-radius:15px;background:#fff0e6;color:#703c20;line-height:1.6}.rg-card label{display:block;font-size:14px;font-weight:800;margin:14px 0 6px}.rg-card input,.rg-card textarea{width:100%;border:1px solid #d8c9e4;border-radius:12px;padding:12px;font:inherit;background:#fffcff;color:#40334f;font-size:16px}.rg-card textarea{min-height:80px;resize:vertical}.rg-card progress{display:block;width:100%;height:14px;accent-color:#a66cc4;margin:12px 0}.rg-card details{margin-top:16px}.rg-card summary{cursor:pointer;color:#735985;font-size:13px}.rg-history{border-left:3px solid #e7d8f3;margin:12px 0;padding-left:12px;font-size:13px;line-height:1.7;overflow-wrap:anywhere}.rg-empty{text-align:center;padding:24px 10px}.rg-summary{border:1px solid #e6d9f1;border-radius:20px;background:linear-gradient(120deg,#fff0f7,#efebff);padding:16px;margin:12px 0}.rg-summary button{margin-top:10px;background:#8050a1;color:#fff;border:0;border-radius:12px;padding:11px 16px;font-weight:800;font-size:14px}.rg-note{border-radius:13px;background:#eff9f4;padding:12px;line-height:1.6;font-size:13px}#reward-goals button:focus-visible,#reward-goals input:focus-visible,#reward-goals textarea:focus-visible{outline:3px solid #4e8fb0;outline-offset:3px}`;
    document.head.appendChild(style);
  }
  window.goalsSummaryHTML = function () {
    ensureStyle(); chooseOwner();
    const count = owner === lid() + ':' + role() && state ? state.goals.filter(g => g.status === 'proposed' && g.proposer !== role()).length : 0;
    return `<section class="rg-summary"><strong>💌 우리 가족의 소원 약속</strong><div id="rg-home-counters" style="margin:10px 0">${countersHTML()}</div><div class="rg-small">으쓱과 머쓱은 따로 기록해요. 오늘은 새롭게 시작해요.</div><div class="rg-small" id="rg-home-message">${count ? `답장을 기다리는 제안 ${count}개가 있어요.` : '하고 싶은 일을 제안하고, 함께 약속해요.'}</div><button type="button" onclick="openGoals()">${DB.viewer ? '약속 · 머쓱 기록 확인' : '내 소원 이야기하기'} →</button></section>`;
  };
  window.refreshGoalsSummary = async function () { chooseOwner(); await refresh(true); updateSummary(); };
  window.ensureGoalsRefresh = async function () { chooseOwner(); if (Date.now() - lastRead > 60000) await refresh(true); updateSummary(); };
  function actions(g) {
    if (g.status === 'proposed') return g.proposer !== role()
      ? button('좋아, 약속!', 'accept', g.id, 'primary') + button('다르게 제안하기', 'counter', g.id) + button('이번에는 어려워요', 'decline', g.id, 'plain')
      : button('제안 취소', 'cancel', g.id, 'plain');
    if (g.status === 'earning' || g.status === 'ready') return (role() === 'child' && available() >= g.terms.points ? button('모았어요! 사용 요청', 'redeem', g.id, 'primary') : '') + button('약속 취소하기', 'cancel', g.id, 'plain');
    if (g.status === 'requested') return (role() === 'parent' ? button('약속을 함께 했어요', 'complete', g.id, 'mint') : '') + button('사용 요청 취소', 'cancel', g.id, 'plain');
    return '';
  }
  function historyHTML(g) {
    if (!g.history || !g.history.length) return '';
    return `<details><summary>주고받은 약속 ${g.history.length}개 보기</summary>${g.history.map(h => `<div class="rg-history"><b>${esc(who(h.proposer || h.role || h.by))} · ${esc(actionLabels[h.action] || '제안')} ${h.version ? 'v' + esc(h.version) : ''}</b>${h.terms ? `<br>${esc(h.terms.title)} · ${esc(h.terms.points)} 으쓱${h.terms.when ? '<br>' + esc(h.terms.when) : ''}${h.terms.note ? '<br>' + esc(h.terms.note) : ''}` : ''}${h.reason ? '<br>' + esc(h.reason) : ''}</div>`).join('')}</details>`;
  }
  function card(g) {
    const t = g.terms || {}, cost = Number(t.points) || 0, progress = Math.min(available(), cost);
    return `<article class="rg-card"><span class="rg-tag">${esc(labels[g.status] || g.status)}</span><h3>${esc(t.title)}</h3><p><b>${esc(cost)} 으쓱</b>${t.when ? ' · ' + esc(t.when) : ''}</p>${t.note ? `<p>${esc(t.note)}</p>` : ''}<div class="rg-small">${esc(who(g.proposer))}의 제안 · v${esc(g.version || 1)}</div>${g.status === 'earning' || g.status === 'ready' ? `<progress max="${Math.max(1,cost)}" value="${progress}"></progress><div class="rg-small">${available() >= cost ? '목표를 모았어요. 함께 할 준비가 되었나요?' : `${progress} / ${cost} 으쓱 · 천천히 모아도 괜찮아요.`}</div>` : ''}${g.status === 'requested' ? '<p class="rg-note">포인트를 예약했어요. 약속을 실제로 함께 한 뒤 부모가 완료해요.</p>' : ''}${g.reason ? `<p class="rg-note">${esc(g.reason)}</p>` : ''}<div class="rg-row">${actions(g)}</div>${historyHTML(g)}</article>`;
  }
  function formHTML() {
    if (!form) return '';
    const terms = form.terms || {}, reasonOnly = ['decline','cancel','excuse'].includes(form.action), counter = form.action === 'counter';
    const title = counter ? '💬 내 생각은 이래요' : form.action === 'excuse' ? '🍃 쉬어 간 날로 기록하기' : form.action === 'decline' ? '이번에는 어려운 이유' : form.action === 'cancel' ? '약속을 취소하는 이유' : '✨ 내가 만드는 소원 약속';
    const reasonField = (reasonOnly || counter) ? `<label for="rg-reason">${counter ? '바꾼 이유 (필수)' : form.action === 'excuse' ? esc(form.date) + ' · 쉬어 간 이유 (필수)' : '상대에게 짧게 알려주세요'}</label><textarea id="rg-reason" name="reason" maxlength="${form.action === 'excuse' ? 200 : 240}" required placeholder="${form.action === 'excuse' ? '예: 아파서 쉬었어요. 가족 일정이 있었어요.' : '일정이나 비용처럼 구체적으로 말해 주세요.'}">${esc(form.reason)}</textarea>` : '';
    return `<form class="rg-card" id="rg-form"><h3>${title}</h3><fieldset style="border:0;padding:0;margin:0;min-width:0"${busy || pending ? ' disabled' : ''}>${reasonOnly ? '' : `<label for="rg-title">함께 무엇을 하고 싶나요?</label><input id="rg-title" name="title" maxlength="80" required placeholder="예: 같이 춤 연습하기" value="${esc(terms.title)}"><label for="rg-points">목표 으쓱</label><input id="rg-points" name="points" type="number" min="1" max="10000" step="1" inputmode="numeric" required value="${esc(terms.points == null ? 20 : terms.points)}"><label for="rg-when">언제 하고 싶나요? (선택)</label><input id="rg-when" name="when" maxlength="80" placeholder="예: 다음 주말, 날짜는 같이 정하기" value="${esc(terms.when)}"><label for="rg-note">전하고 싶은 말 (선택)</label><textarea id="rg-note" name="note" maxlength="240" placeholder="하고 싶은 이야기를 내 말로 써 보세요.">${esc(terms.note)}</textarea>`}${reasonField}<p class="rg-small">${counter ? '앞서 주고받은 제안은 남아요. 바꾼 조건에 상대가 동의해야 새 약속이 돼요.' : form.action === 'excuse' ? '이 날은 머쓱 합계에서 제외하고 쉼 기록으로 남겨요. 으쓱은 변하지 않아요.' : '제안하거나 수락해도 새 으쓱이 생기지 않아요. 이미 모은 으쓱으로 약속을 사용해요.'}</p><div class="rg-row"><button class="rg-btn primary" type="submit"${busy || pending ? ' disabled' : ''}>${form.action === 'excuse' ? '쉼 예외로 기록' : reasonOnly ? '이유 전하기' : myWho() + '에게 제안하기'}</button>${button('돌아가기','form-close',null,'plain')}</div></fieldset></form>`;
  }
  function dailyHTML() {
    if (!state) return '';
    const days = Array.isArray(state.daily.mussuk) ? state.daily.mussuk.slice().sort((a,b) => String(b.date).localeCompare(String(a.date))) : [];
    return `<details class="rg-card"${role() === 'parent' ? ' open' : ''}><summary>😅 머쓱 ${esc(state.daily.count || 0)} · 쉼 기록 보기</summary><p class="rg-small">하루 미완료는 하루 한 번만 기록해요. 어제의 과제가 오늘 할 일로 쌓이지 않아요.${state.activeFrom ? '<br>' + esc(state.activeFrom) + '부터 확인한 기록이에요.' : ''}</p>${days.length ? days.map(d => `<div class="rg-history"><b>${esc(d.date)} · ${d.excused ? '🍃 쉬어 간 날' : d.provisional ? '😅 머쓱 · 완료 확인 필요' : '😅 머쓱'}</b><br>${esc(d.excused ? d.excuseReason || '쉼 예외' : d.reason || '하루 과제 미완료')}${role() === 'parent' && !d.excused ? '<div class="rg-row">' + button('쉼 예외로 바꾸기','excuse',d.date,'mint') + '</div>' : ''}</div>`).join('') : '<p class="rg-small">아직 머쓱 기록이 없어요.</p>'}</details>`;
  }
  function render() {
    const el = shell(); if (!el) return;
    const wallet = state && state.balance;
    el.innerHTML = `<div class="rg-inner"><header class="rg-head"><button type="button" class="rg-btn plain" data-action="close" aria-label="약속 화면 닫기">←</button><h2>우리의 소원 약속</h2></header><div class="rg-wallet">🌟 함께 모으는 <b>으쓱</b><br><strong>${wallet ? esc(wallet.available || 0) : '—'}</strong> 지금 쓸 수 있어요${wallet ? `<div class="rg-small">기존 으쓱 ${esc(wallet.earned || 0)} · 예약 ${esc(wallet.reserved || 0)} · 사용 ${esc(wallet.spent || 0)}</div>` : '<div class="rg-small">가족의 최신 기록을 확인하고 있어요.</div>'}</div><p class="rg-small">아빠와 이야기하고 도움을 청하는 건 언제나 할 수 있어요. 약속 제안·수락으로 새 으쓱은 생기지 않고 이미 모은 으쓱을 사용해요.</p>${error ? `<div class="rg-error" role="alert">${esc(error)}</div>` : ''}${pending ? '<div class="rg-error">전송 결과를 아직 확인하지 못했어요. 같은 요청으로 다시 확인하므로 중복 사용되지 않아요.<div class="rg-row"><button type="button" class="rg-btn primary" data-action="retry">같은 요청 다시 확인</button></div></div>' : ''}<div class="rg-row">${button('＋ 새 소원 제안','new',null,'primary')}${button('새 답장 확인','refresh',null,'plain')}</div><div aria-live="polite" class="rg-small">${busy ? '안전하게 저장하고 있어요…' : loading ? '최신 약속을 확인하고 있어요…' : ''}</div>${formHTML()}${dailyHTML()}${!state && loading ? '<div class="rg-card">약속을 불러오는 중이에요…</div>' : state && state.goals.length ? state.goals.map(card).join('') : '<div class="rg-card rg-empty">💌<h3>첫 소원을 들려주세요</h3><p>하고 싶은 일과 목표 으쓱을<br>직접 정해서 제안해 보세요.</p></div>'}</div>`;
  }
  async function refresh(silent) {
    if (loading || busy) return; loading = true; if (!silent) render();
    const current = owner;
    try {
      const response = await request(api() + '/api/goals?id=' + encodeURIComponent(lid()) + '&role=' + role(), {cache:'no-store'});
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || '약속을 불러오지 못했어요.');
      if (owner !== current) return; state = normalized(payload); lastRead = Date.now(); error = '';
    } catch (e) { error = e.message || '연결을 확인한 뒤 새 답장을 확인해 주세요.'; }
    finally { loading = false; updateSummary(); if (!form) render(); }
  }
  async function send(body, retry) {
    if (busy || pending && !retry) return;
    busy = true; error = ''; if (!retry) savePending({...body,id:lid(),role:role(),requestId:uid()}); render();
    const operation = pending;
    try {
      const response = await request(api() + '/api/goals', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(operation)});
      let payload; try { payload = await response.json(); } catch (_) { throw new Error('서버 응답을 확인하지 못했어요. 같은 요청으로 다시 확인해 주세요.'); }
      if (owner !== operation.id + ':' + operation.role) { if (response.ok || response.status >= 400 && response.status < 500) { try { localStorage.removeItem('family_goals_pending_v1:' + operation.id + ':' + operation.role); } catch (_) {} } return; }
      if (!response.ok) { if (response.status >= 400 && response.status < 500) savePending(null); if (response.status === 409) { form = null; error = '약속이나 잔액이 바뀌었어요. 최신 내용을 확인하고 다시 선택해 주세요.'; try { const fresh = await request(api() + '/api/goals?id=' + encodeURIComponent(operation.id) + '&role=' + operation.role, {cache:'no-store'}); if (fresh.ok) state = normalized(await fresh.json()); } catch (_) {} } else error = payload.error || '저장하지 못했어요. 입력 내용을 확인해 주세요.'; }
      else { state = normalized(payload); lastRead = Date.now(); savePending(null); form = null; }
    } catch (e) { error = e.message || '연결을 확인한 뒤 다시 시도해 주세요.'; }
    finally { busy = false; updateSummary(); render(); }
  }
  function openForm(action, goal) { form = {action,goalId:goal && goal.id,version:goal && goal.version,terms:goal && goal.terms ? {...goal.terms} : {},reason:''}; error = ''; render(); shell().querySelector('input,textarea')?.focus(); }
  function onClick(event) {
    const target = event.target.closest('[data-action]'); if (!target) return; const action = target.dataset.action;
    if (action === 'close') { window.closeGoals(); return; }
    if (busy) return;
    if (action === 'retry') { if (pending) send(pending,true); return; }
    if (pending) return;
    if (action === 'new') { openForm('create'); return; }
    if (action === 'form-close') { form = null; render(); return; }
    if (action === 'refresh') { form = null; refresh(); return; }
    if (action === 'excuse') { if (role() !== 'parent' || !state || !(state.daily.mussuk || []).some(d => d.date === target.dataset.id && !d.excused)) return; form = {action:'excuse',date:target.dataset.id,reason:'',terms:{}}; error = ''; render(); shell().querySelector('textarea')?.focus(); return; }
    const goal = goalById(target.dataset.id); if (!goal) return;
    if (['counter','decline','cancel'].includes(action)) { openForm(action,goal); return; }
    if (action === 'accept' && !confirm('이 제안의 내용과 목표 으쓱으로 함께 약속할까요?')) return;
    if (action === 'redeem' && !confirm('약속에 사용할 으쓱을 예약할까요? 실제로 함께 한 뒤 사용 완료돼요.')) return;
    if (action === 'complete' && !confirm('약속한 활동이나 선물을 실제로 함께 했나요? 완료하면 예약한 으쓱이 사용돼요.')) return;
    send({action,goalId:goal.id,version:goal.version});
  }
  function onInput(event) { if (!form || busy || pending || !event.target.name) return; if (event.target.name === 'reason') form.reason = event.target.value; else form.terms[event.target.name] = event.target.value; }
  function onSubmit(event) {
    if (event.target.id !== 'rg-form') return; event.preventDefault(); if (!form || busy || pending) return;
    const body = {action:form.action,goalId:form.goalId,version:form.version};
    if (['decline','cancel','counter','excuse'].includes(form.action)) { body.reason = (form.reason || '').trim(); if (!body.reason) { error = form.action === 'counter' ? '바꾼 이유를 직접 적어 주세요.' : '이유를 짧게 적어 주세요.'; render(); return; } }
    if (form.action === 'excuse') { if (role() !== 'parent') return; body.date = form.date; }
    else if (!['decline','cancel'].includes(form.action)) { const t = form.terms, points = Number(t.points == null ? 20 : t.points); if (!String(t.title || '').trim() || !Number.isInteger(points) || points < 1 || points > 10000) { error = '하고 싶은 일과 1~10,000 사이의 목표 으쓱을 확인해 주세요.'; render(); return; } body.terms = {title:String(t.title).trim(),points,when:String(t.when || '').trim(),note:String(t.note || '').trim()}; }
    send(body);
  }
  window.openGoals = async function () {
    ensureStyle(); chooseOwner();
    if (!shell()) { const el = document.createElement('section'); el.id = 'reward-goals'; el.setAttribute('aria-label','가족의 소원 약속'); el.addEventListener('click',onClick); el.addEventListener('input',onInput); el.addEventListener('submit',onSubmit); document.body.appendChild(el); }
    readPending(); error = ''; form = null; render(); await refresh(); clearInterval(timer); timer = setInterval(() => { if (!document.hidden && !form && !pending && shell()) refresh(true); },15000);
  };
  window.closeGoals = function () { clearInterval(timer); timer = null; shell()?.remove(); form = null; };
})();
