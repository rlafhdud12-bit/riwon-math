# 리원이 공부 놀이터 (riwon-math)

초3 딸 "리원이"를 위한 학습 PWA. 단일 `index.html`(외부 라이브러리 없음) + `sw.js` + `manifest.webmanifest`.

- **라이브 URL**: https://rlafhdud12-bit.github.io/riwon-math/ (GitHub Pages, main 브랜치 root)
- **배포 방법**: `git push` 하면 약 1~2분 뒤 자동 반영. 별도 빌드 없음.
- **두 노트북 운영**: 사무실 세컨 노트북 + 이동용 메인 노트북. **작업 시작 전 반드시 `git pull`, 작업 후 `git push`** (이 저장소가 유일한 동기화 통로).

## 교육 철학 (모든 콘텐츠 추가의 기준)
점수·반복암기보다 **개념 이해 → 스스로 발견 → 사고 확장**이 우선.
- 새 단원은 "발견(패턴 관찰→규칙 스스로 고르기)"이 개념 설명보다 먼저
- "왜 그럴까?" 이유 고르기, 오개념 찾기, 거꾸로 문제 선호
- 점수·속도 경쟁 요소 추가 금지. 보상은 끈기와 이해에.

## 구조 (index.html 안의 큰 덩어리들)
- **UNITS**: 19단원 (수학 10: mul div frac len cap add shape circle deci graph / 국어 kor1~3 / 영어 eng1~2 / 과학 sci1~2 / 사회 soc1~2). 각 단원 `subj`, `gname`(게임 단계 이름) 필드.
- **단계**: `unitStages()` — 발견→개념→게임→퀴즈→생각→문제은행→복습·분석→심화 (8단계, DB.stages 토글로 켜고 끄면 번호 자동 재배열. 개념·퀴즈는 고정).
- **MODULES[unitId]**: `concept()` HTML, `games[]`(빌더 함수), `gens[]`(퀴즈/문제은행), `thinkGens[]`(생각), `deepGens[]`(심화).
- **DISCOVER / INSIGHT / TALK [unitId]**: 발견 시나리오, 클리어 화면 "오늘의 핵심" 한 줄, 부모 대화 질문.
- **플레이 엔진**: `startMaster(unitId, body, variant)` — variant 없음=퀴즈, 'think', 'deep'. `startBank`(무한, 약점 유형 가중 출제), `startReview`(틀린문제 풀). 객관식은 `c.choices`(4지선다, 정답 인덱스 `c.a`), 숫자형은 키패드.
- **공용 게임 컴포넌트**: `matchGame`(짝맞추기), `sortGame`(2분류), `alphaOrderGame`, 수학 전용 빌더들(buildPlaceGame, buildRadiusGame, buildDeciGame, buildGraphGame 등).
- **저장**: localStorage 키 `riwon_math_v2`. DB 스키마는 `freshDB()` 참고. 마이그레이션은 `loadDB()`에서.
- **보상**: 퀴즈 첫 클리어 스티커 10→8→6→4→2→1(반복 억제), 심화 +2, 생각 +1, 발견 첫회 +2. 스티커로 포토카드 12장 잠금해제(ROSTER).

## 반드시 지킬 동작 규칙
1. **틀린 문제**: 자동으로 안 넘어감. 정답·힌트 보여주고 멈춤 → "다음 문제로 ▶" 버튼. 그 문제는 큐 맨 뒤로 가서 재출제, 다 맞혀야 끝. (정답은 1초 후 자동 진행)
2. **튜터(도와주세요)**: 문제은행·복습에만. 단계별 설명+중간 미니문제, 틀려도 안 막고 재설명.
3. **소수 등 소수점 답**: 키패드에 '.' 없음 → 반드시 객관식으로.
4. **동적 객관식 생성기**: 두 난수가 같으면 보기 중복 발생(예: 7.7) — `while`로 회피 필수.
5. **사진**: photos/ 의 아이들 실사진은 부모가 공개 게시를 명시 승인함. 새 인물 사진 추가는 반드시 사용자 확인 후. 다른 아이들이 나온 사진은 크롭으로 배제.
6. **콘텐츠 저작권**: 교과서 문장 복제 금지. 모든 문제·설명은 직접 작성.

## 수정 후 검증 (필수)
```bash
node -e "const m=require('fs').readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/); require('fs').writeFileSync('_c.js',m[1]);" && node --check _c.js && rm _c.js
```
+ 가능하면 DOM 스텁 스모크 테스트(모든 gens 수십 회 돌려 choices 길이 4·중복 없음·a 유효 확인 — 이전 커밋 메시지의 검증 패턴 참고).
- `sw.js`의 CACHE 버전은 **새 정적 파일(사진 등) 추가 시** 올리고 ASSETS에 등록. HTML은 네트워크 우선이라 코드 수정만이면 안 올려도 됨(올려도 무해).

## 남은 로드맵 (사용자와 합의된 순서)
1. ✅ 수학 1년치 완성 (v8)
2. 🔬 과학: 물질의 성질, 물질의 상태(고체·액체·기체), 소리의 성질, 지구의 모습/지표의 변화, 동물의 생활
3. 📖 국어: 국어사전 찾기(기본형), 문단(중심문장), 감각적 표현, 인물의 마음, 원인과 결과
4. 🏘️ 사회: 고장의 문화유산·옛이야기, 환경에 따라 다른 삶, 가족의 모습과 역할 변화
5. 🔤 영어: 회화 패턴 (I like ~ / Can you ~? / How many? / Do you have ~? 등)
