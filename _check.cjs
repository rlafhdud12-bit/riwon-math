// 검증: 엔진 문법 + g1.js 문법 + 개인정보 잔존 검사
const fs=require('fs'), vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const m=html.match(/<script>([\s\S]*?)<\/script>/);
try{ new vm.Script(m[1]); console.log('index 엔진 문법 OK'); }catch(e){ console.log('index 문법오류:',e.message); process.exit(1); }
try{ new vm.Script(fs.readFileSync('grades/g1.js','utf8')); console.log('g1.js 문법 OK'); }catch(e){ console.log('g1.js 문법오류:',e.message); process.exit(1); }
const leaks=[];
for(const f of ['index.html','sw.js','manifest.webmanifest','grades/g1.js']){
  const t=fs.readFileSync(f,'utf8');
  for(const w of ['리원','도율','photos/','누나']){ let i=-1; while((i=t.indexOf(w,i+1))>=0){ leaks.push(f+': "'+w+'" @ '+t.slice(Math.max(0,i-30),i+30).replace(/\n/g,' ')); } }
}
console.log('개인정보 잔존:',leaks.length); leaks.forEach(l=>console.log('  -',l));
console.log('photos 폴더:', fs.existsSync('photos')?'있음(삭제 필요)':'없음');
process.exit(leaks.length?1:0);
