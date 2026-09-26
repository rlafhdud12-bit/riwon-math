/* 기기별 팬 테마. 사진·표시만 담당하며 학습 DB·카드 해금·보상을 수정하지 않는다. */
(function(){
  'use strict';
  const KEY='study-note-fan-theme-v1';
  const themes={
    rora:{name:'로라',title:'로라의 곱셈 챌린지',unit:'mul',img:'assets/rora-manila-2026.jpg',position:'52% 24%',
      author:'Farouk Azim',work:'Rora 20260905 Manila.jpg',license:'CC BY-SA 4.0',licenseURL:'https://creativecommons.org/licenses/by-sa/4.0/',
      source:'https://commons.wikimedia.org/wiki/File:Rora_20260905_Manila.jpg'},
    wonyoung:{name:'장원영',title:'장원영의 생각 퀴즈',unit:'shape',img:'assets/wonyoung-2025.png',position:'50% 25%',
      author:'티비텐(TV10)',work:'Jang Won-young of Ive, March 27, 2025.png',license:'CC BY 3.0',licenseURL:'https://creativecommons.org/licenses/by/3.0/',
      source:'https://commons.wikimedia.org/wiki/File:Jang_Won-young_of_Ive,_March_27,_2025.png',original:'https://www.youtube.com/watch?v=rqrgJvnQaDw&t=141'}
  };
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let selected='rora';
  try{const saved=localStorage.getItem(KEY);if(saved==='none'||Object.prototype.hasOwnProperty.call(themes,saved))selected=saved;}catch(e){}
  let returnFocus=null;
  const current=()=>themes[selected]||null;
  const parent=()=>typeof DB!=='undefined'&&!!DB.viewer;
  const note='앱 선생님이 만든 문제·응원이에요. 아티스트의 실제 출제·발언이 아닌 팬 테마예요.';
  const photo=(t,cls)=>`<img class="fan-photo ${cls||''}" src="${t.img}" alt="${escape(t.name)} 사진" style="object-position:${t.position}" decoding="async">`;
  const css=document.createElement('style');
  css.id='fan-theme-styles';css.textContent=`
    .fan-welcome{position:relative;display:grid;grid-template-columns:96px minmax(0,1fr);gap:14px;background:linear-gradient(120deg,#fff1f7,#fffdf3 62%,#edfff9);border:1px solid #f4cfe2;border-radius:23px;padding:14px;margin:12px 0;box-shadow:0 7px 18px #b9709410;color:#4f3549;overflow:hidden}
    .fan-photo{display:block;width:100%;height:100%;object-fit:cover;background:#f1e8ed}
    .fan-portrait{width:96px;height:128px;border-radius:17px;box-shadow:0 3px 9px #69435020}
    .fan-kicker{font-size:11px;letter-spacing:.045em;color:#995272;font-weight:850;display:block;margin:1px 0 6px}
    .fan-welcome h3{font-size:18px;line-height:1.35;margin:0 0 7px;display:block;color:#523247}
    .fan-welcome p{font-size:13px;line-height:1.55;margin:0 0 9px;color:#745c70}
    .fan-actions{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
    .fan-btn{font:inherit;font-size:12px;font-weight:800;min-height:38px;border:1px solid #ddb3cc;border-radius:12px;padding:8px 11px;background:#fff;color:#77425f;cursor:pointer}
    .fan-btn.fan-primary{background:#ac527f;border-color:#ac527f;color:#fff}
    .fan-btn:focus-visible,.fan-choice:focus-visible,.fan-link:focus-visible{outline:3px solid #775bcc;outline-offset:3px}
    .fan-note{font-size:11px!important;line-height:1.5!important;color:#806a7a!important;margin:9px 0 0!important;grid-column:1/-1}
    .fan-credit-link{font:inherit;font-size:11px;border:0;padding:4px 0;background:none;color:#795566;text-decoration:underline;cursor:pointer}
    .fan-stage{display:flex;gap:10px;align-items:center;margin:9px 0 12px;padding:10px 12px;background:#fff6fb;border:1px solid #f0d5e4;border-radius:17px;color:#684758}
    .fan-stage-photo{width:50px;height:58px;border-radius:12px;flex:none}
    .fan-stage-copy{min-width:0;flex:1}.fan-stage-copy b{display:block;font-size:13px}.fan-stage-copy p{font-size:12px;line-height:1.5;margin:3px 0}.fan-stage-copy small{display:block;font-size:10px;line-height:1.5;color:#806a7a}
    .fan-none{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 3px;margin:6px 0;color:#806a7a;font-size:12px}
    .fan-overlay{position:fixed;inset:0;z-index:260;display:flex;align-items:center;justify-content:center;padding:18px;background:#30233688;backdrop-filter:blur(5px)}
    .fan-sheet{width:min(100%,540px);max-height:90dvh;overflow:auto;border:1px solid #f5d6e6;border-radius:25px;background:#fffafd;padding:20px;box-shadow:0 24px 80px #38203540;color:#543747}
    .fan-sheet h2{font-size:21px;margin:0}.fan-sheet p{font-size:14px;line-height:1.65}.fan-sheet-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
    .fan-options{display:grid;grid-template-columns:1fr 1fr;gap:12px}.fan-choice{font:inherit;text-align:left;overflow:hidden;padding:0;border:2px solid #ead3e2;border-radius:19px;background:#fff;cursor:pointer;color:#58364b;min-width:0}
    .fan-choice[aria-pressed="true"]{border-color:#b35187;box-shadow:0 0 0 3px #fbe6f2}.fan-choice .fan-photo{height:158px}.fan-choice-copy{display:block;padding:11px;font-size:14px;font-weight:850}.fan-choice-copy small{display:block;font-size:11px;line-height:1.5;font-weight:600;color:#8a6680;margin-top:3px}
    .fan-credit{padding:14px;border:1px solid #ecdce6;border-radius:15px;background:#fff;margin:12px 0;word-break:break-word}.fan-credit h3{display:block;margin:0 0 8px;font-size:15px}.fan-credit p{font-size:12px;margin:5px 0}.fan-credit a{color:#785194;line-height:1.9;font-size:12px}.fan-links{display:flex;gap:8px 14px;flex-wrap:wrap}
    @media(max-width:360px){.fan-welcome{grid-template-columns:76px minmax(0,1fr);padding:11px;gap:10px}.fan-portrait{width:76px;height:112px}.fan-welcome h3{font-size:16px}.fan-btn{font-size:11px;padding:7px 9px}.fan-sheet{padding:15px}.fan-choice .fan-photo{height:132px}}
  `;
  document.head.appendChild(css);
  window.fanGetTheme=function(){return selected;};
  window.fanWelcomeHTML=function(){
    if(parent())return '';
    const t=current();
    if(!t)return `<div class="fan-none" data-fan-host="welcome"><span>오늘은 나만의 속도로 ✨</span><button class="fan-btn" onclick="openFanThemes()">팬 테마 고르기</button></div>`;
    return `<section class="fan-welcome" data-fan-host="welcome" aria-label="${t.name} 팬 테마">${photo(t,'fan-portrait')}<div><span class="fan-kicker">MY FAN THEME · ${t.name}</span><h3>${t.title}</h3><p>좋아하는 무대의 설렘으로<br>한 문제씩 차근차근 풀어 봐.</p><div class="fan-actions"><button class="fan-btn fan-primary" onclick="startFanQuiz('${t.unit}')">퀴즈 시작 ✨</button><button class="fan-btn" onclick="openFanThemes()">테마 바꾸기</button></div></div><p class="fan-note">${note} <button class="fan-credit-link" onclick="openPhotoCredits()">사진 출처</button></p></section>`;
  };
  window.fanStageHTML=function(){
    const t=current();if(!t||parent())return '<div data-fan-host="stage"></div>';
    return `<aside class="fan-stage" data-fan-host="stage">${photo(t,'fan-stage-photo')}<div class="fan-stage-copy"><b>${t.name} 팬 테마 · 앱 선생님의 응원</b><p>한 문제씩 생각해 보는 네 속도를 응원해!</p><small>${note} <button class="fan-credit-link" onclick="openPhotoCredits()">사진 출처</button></small></div></aside>`;
  };
  window.startFanQuiz=function(unitId){
    if(parent())return;
    const unit=typeof UNITS!=='undefined'&&UNITS.find(u=>u.id===unitId);
    if(!unit||typeof MODULES==='undefined'||!MODULES[unitId]||typeof openUnit!=='function'||typeof setStage!=='function')return;
    closeFanThemes();openUnit(unitId);setStage('quiz');
  };
  function refresh(){
    document.querySelectorAll('[data-fan-host="welcome"]').forEach(el=>{el.outerHTML=fanWelcomeHTML();});
    document.querySelectorAll('[data-fan-host="stage"]').forEach(el=>{el.outerHTML=fanStageHTML();});
  }
  function openSheet(title,body){
    const prior=document.getElementById('fan-overlay');if(prior)prior.remove();else returnFocus=document.activeElement;
    const overlay=document.createElement('div');overlay.className='fan-overlay';overlay.id='fan-overlay';
    overlay.innerHTML=`<section class="fan-sheet" role="dialog" aria-modal="true" aria-labelledby="fan-dialog-title"><div class="fan-sheet-top"><h2 id="fan-dialog-title">${title}</h2><button class="fan-btn" onclick="closeFanThemes()" aria-label="닫기">✕</button></div>${body}</section>`;
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeFanThemes();});
    overlay.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();closeFanThemes();return;}
      if(e.key!=='Tab')return;
      const controls=Array.from(overlay.querySelectorAll('button,a[href]')).filter(el=>!el.disabled);if(!controls.length)return;
      const first=controls[0],last=controls[controls.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    });
    document.body.appendChild(overlay);overlay.querySelector('button').focus();
  }
  window.closeFanThemes=function(){const overlay=document.getElementById('fan-overlay');if(overlay)overlay.remove();if(returnFocus&&returnFocus.isConnected&&typeof returnFocus.focus==='function')returnFocus.focus();returnFocus=null;};
  window.setFanTheme=function(id){
    if(id!=='none'&&!Object.prototype.hasOwnProperty.call(themes,id))return;
    selected=id;try{localStorage.setItem(KEY,id);}catch(e){}
    closeFanThemes();refresh();
  };
  window.openFanThemes=function(){
    openSheet('내가 좋아하는 팬 테마',`<p>좋아하는 사진으로 공부 화면을 꾸며 봐. 이 기기에서만 바뀌어.</p><div class="fan-options">${Object.entries(themes).map(([id,t])=>`<button class="fan-choice" aria-pressed="${selected===id}" onclick="setFanTheme('${id}')">${photo(t)}<span class="fan-choice-copy">${t.name}<small>${t.title}${selected===id?' · 선택됨':''}</small></span></button>`).join('')}</div><button class="fan-btn" style="width:100%;margin-top:14px" aria-pressed="${selected==='none'}" onclick="setFanTheme('none')">사진 테마 없이 할래${selected==='none'?' · 선택됨':''}</button><p class="fan-note">${note}</p><button class="fan-credit-link" onclick="openPhotoCredits()">사진 출처와 이용 조건</button>`);
  };
  window.openPhotoCredits=function(){
    openSheet('사진 출처',`<p>사진을 활용한 비공식 팬 테마입니다. 아티스트·작가·소속사가 이 앱을 출제·추천·후원하는 의미가 아닙니다.</p>${Object.values(themes).map(t=>`<article class="fan-credit"><h3>${t.name} · ${escape(t.work)}</h3><p>작가: ${escape(t.author)} · ${t.license}</p><div class="fan-links"><a href="${t.source}" target="_blank" rel="noopener noreferrer">Wikimedia Commons 원본 설명</a><a href="${t.licenseURL}" target="_blank" rel="noopener noreferrer">${t.license} 이용 조건</a>${t.original?`<a href="${t.original}" target="_blank" rel="noopener noreferrer">원본 영상 · 2분 21초</a>`:''}<a href="${t.img}" download>앱에서 쓰는 원본 파일 받기</a></div><p>파일의 화소·크기·형식을 수정하지 않았습니다. 화면에서는 CSS로 화면비에 맞춰 일부 영역을 잘라 표시합니다.${t.license==='CC BY-SA 4.0'?' 사진의 화면상 크롭 표현에도 CC BY-SA 4.0을 적용합니다.':''}</p></article>`).join('')}<button class="fan-btn" onclick="openFanThemes()">팬 테마 선택으로</button>`);
  };
})();
