# 초등노트 (riwon-math) — 딸 전용 "전담 과외" 학습 PWA

초3 딸을 위한 학습 PWA. 단일 `index.html`(외부 라이브러리 없음) + `sw.js` + `manifest.webmanifest` + `grades/gN.js`(추가 학년).
**2026-09-21 방향 전환**: 오픈소스/제품이 아니라 **내 아이 한 명을 위한 과외 앱**. 3학년 수학 취약 부분을 데이터로 찾아 집중 훈련.

- **라이브 URL**: https://rlafhdud12-bit.github.io/riwon-math/ (GitHub Pages, main root). `git push` 하면 1~2분 뒤 반영. 빌드 없음.
- **백엔드**: `C:\Users\김로영\projects\chodeung-tutor-api` → https://chodeung-tutor.netlify.app (Netlify 사이트 `chodeung-tutor`)
  - `POST /api/sync` — 세트가 끝날 때마다 앱이 학습기록(DB, `fam` 제외)을 자동 전송 → Blobs store `learning` → `${id}/latest`, `${id}/days/${날짜}`
  - `POST /api/tutor` — 앱 안 "선생님한테 물어보기" 채팅 → Claude(`claude-opus-5`, effort low, 시스템 프롬프트 캐시). 하루 60회 한도(store `limits`).
  - 배포 규칙: 검증은 `netlify deploy`(프리뷰, 0크레딧) → 확정만 `netlify deploy --prod`(15크레딧).
- **작업 전 `git pull`, 후 `git push`** (여러 PC).

## 🚫 절대 규칙 (2026-09 개인정보 규칙)
1. **아이 이름·사진을 코드·저장소·백업·서버에 넣지 않는다.** 공개 저장소다. 응원 문구는 "너"로. 가족 사진 카드(`DB.fam`)는 기기 안에만, `/api/sync`에서 제외.
2. 채팅 시스템 프롬프트는 이름을 묻지도 부르지도 않게 고정. 프롬프트에 날짜·이름 같은 변하는 값 넣지 않기(캐시).
3. 콘텐츠 저작권: 교과서 문장 복제 금지. 전부 직접 작성.

## 교육 철학 (모든 콘텐츠·튜터 대사의 기준)
점수·반복암기보다 **개념 이해 → 스스로 발견 → 사고 확장**. 점수·속도 경쟁 금지. 보상은 끈기와 이해에.
- 틀리면 "틀렸어"가 아니라 **"아, 이렇게 생각했구나"** — 아이가 쓴 답에서 원인을 추측해 짚어 준다.
- 같은 개념을 여러 길(묶음 그림·수직선·배열·쪼개기·실생활)로. "모르겠어"면 방법을 바꾼다.

## 구조 (index.html)
- **UNITS/MODULES/DISCOVER/INSIGHT/TALK** — 단원·콘텐츠. `grades/g1.js`는 같은 전역에 추가 등록(id는 `g1` 접두).
- **학년 선택**: `DB.grade`(기본 3), `home()`에서 `(u.grade||3)===DB.grade` 필터.
- **플레이 엔진**: `startMaster`(퀴즈/think/deep), `startBank`(약점 유형 가중), `startReview`. 오답 시 `c.given`에 **아이가 쓴 답** 저장 → `addWrong()`이 `DB.wrong[].given[]`·`DB.miss[]`(최근 300개 오답 로그: 문제·정답·아이 답·유형키 `tk`)에 기록. **이게 오답 원인 분석의 원천 데이터.**
- **튜터(도와주세요)**: `TUTOR[k]` 유형별 대본(mul·mulTens·mul2·div*·frac*·conv·compound·unitOp). 없는 유형은 힌트+정답 폴백. 덧셈뺄셈·도형·원·소수·그래프는 아직 대본 없음.
- **과외 모듈**(`saveDB` 아래): `learnerId()`(기기 익명 ID `DB.lid`), `syncSoon/syncNow`, `openChat(ctx)/sendChat`, `askAboutCurrent()`(오답 화면의 "선생님, 왜 틀렸어?"). 채팅은 `TUTOR_API` 상수.
- **저장**: localStorage `riwon_math_v2`. 스키마 `freshDB()`, 마이그레이션 `loadDB()`.

## 검증 (필수, push 전)
`node _check.cjs` — 엔진·g1 문법 + **개인정보 잔존 검사(리원/도율/photos/누나 = 0이어야 함)**. 이 파일은 저장소에 둔다.
+ 생성기 스모크(모든 gens 수십 회: choices 4·중복 없음·a 유효). sw.js는 HTML·.js·manifest 모두 **네트워크 우선**(v18~)이라 배포 뒤 새로고침 한 번이면 새 코드. CACHE 버전은 새 정적 파일(아이콘 등) 추가 시만 올리고 ASSETS에 등록.

## 클로드가 기록을 읽는 법 (전담 과외 루프)
`cd chodeung-tutor-api; netlify blobs:get learning <id>/latest` (id는 앱 부모화면/백업 JSON의 `lid`). 오답 로그 `db.miss`로 원인 분석 → 주간 진단 메모는 `AI컨텍스트\90_개인\산출물\`에 파일로. 이름·사진 없음.

## 남은 로드맵 (2026-09-21 계획서 기준)
1. 오답 원인 진단 엔진(앱 안 즉시 진단: 더하기로 풀음/구구단 옆칸/자릿수/받아올림 누락/단위 그대로 등) — 데이터는 이미 `DB.miss`에 쌓임
2. 다관점 튜터 + 덧셈뺄셈 튜터 대본 신설
3. 🎯 오늘의 약점 훈련(전 단원 횡단) + 부모화면 "왜 틀리나" 표
4. 재미: 포기 안 함 배지, 하루 10분 미션, 캐릭터 이름 아이가 짓기
