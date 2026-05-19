# 반응형 레이아웃 전면 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 세로/가로, 짧은 높이, 좁은 너비, 노치 모바일 등 다양한 viewport에서 앱이 정상 사용되도록 4-layer 개선(viewport 인프라, fluid type, landscape-short 미디어 쿼리, JS resize 가드)을 적용한다.

**Architecture:** CSS-heavy 리팩토링. 외부 의존성 추가 없음. `100dvh/100svh/100vh` cascade fallback, `clamp()` 기반 fluid type, `env(safe-area-inset-*)`로 노치 대응, 신규 `@media (max-height: 500/400px)` + `@media (max-width: 380px)` 트랙. `js/todo.js` 의 `loadBoxSize()` 5-라인 viewport 가드. 기존 4개 모드(words/todos/matrix/people/focus) 동작은 그대로 유지.

**Tech Stack:** Vanilla HTML / CSS / JS. **테스트 프레임워크 없음** — 각 태스크는 코드 변경 + 수동 또는 Playwright 검증 + 커밋.

**검증 환경:** 프로젝트 루트에서 `npx http-server -p 8080` 실행 후 `http://localhost:8080/`. DevTools의 Responsive Mode로 viewport 조정. 마지막 Task 8은 Playwright MCP로 자동 검증.

**Spec:** `docs/superpowers/specs/2026-05-19-responsive-overhaul-design.md`

---

## File Structure

| 파일 | 작업 |
|---|---|
| `index.html` | Task 1 — viewport meta 한 줄 교체 |
| `css/index.css` | Task 1, 2, 3, 4, 5, 6 — body, 위젯, fluid type/spacing, 신규 미디어 쿼리 |
| `js/todo.js` | Task 7 — `loadBoxSize()` 5라인 가드 |

각 태스크는 독립 커밋. 차례로 적용해도, 단독 cherry-pick 해도 의미 있도록 분리.

---

### Task 1: Viewport 인프라 — meta tag + body cascade

**Files:**
- Modify: `C:\Users\rlarh\Desktop\flying-doctor\code\js-basic-clock\index.html` (viewport meta, line 5)
- Modify: `C:\Users\rlarh\Desktop\flying-doctor\code\js-basic-clock\css\index.css` (body block, lines 7-16)

- [ ] **Step 1: viewport meta 교체**

`index.html` line 5의:
```html
<meta name="viewport" content="width=device-width" />
```
를 다음으로 교체:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

- [ ] **Step 2: body 블록 재작성**

`css/index.css` lines 7-16의:
```css
body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  font-family: "Nanum Myeongjo", serif;
  overflow: hidden;
  min-height: 100vh;
}
```
를 다음으로 교체:
```css
body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  font-family: "Nanum Myeongjo", serif;
  overflow-x: hidden;
  overflow-y: auto;
  min-height: 100vh;       /* fallback */
  min-height: 100svh;      /* small viewport */
  min-height: 100dvh;      /* dynamic viewport */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

- [ ] **Step 3: 브라우저 확인**

`http://localhost:8080/` 열기. DevTools Responsive Mode에서:
- 1280×800 (desktop): 기존과 동일하게 정상 렌더링
- 360×640 (mobile portrait): 정상 렌더링
- 800×360 (mobile landscape): 콘텐츠가 화면 밖으로 밀려나면 스크롤 가능해짐 (이전엔 잘림)

콘솔 에러 없음 확인.

- [ ] **Step 4: 커밋**

```bash
git add index.html css/index.css
git commit -m "feat(layout): viewport meta + body dvh/safe-area 인프라"
```

---

### Task 2: 코너 위젯 safe-area + archive-panel 너비 가드

**Files:**
- Modify: `css/index.css` — `.archive-menu` (line 457), `.archive-panel` (line 511), `.js-weather` (line 286), `.sync-status` (line 1066)

- [ ] **Step 1: `.archive-menu` 좌표에 safe-area 더하기**

`css/index.css` 의 `.archive-menu` 블록(현재):
```css
.archive-menu {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 100;
}
```
을 다음으로 교체:
```css
.archive-menu {
  position: fixed;
  top: calc(20px + env(safe-area-inset-top));
  left: calc(20px + env(safe-area-inset-left));
  z-index: 100;
}
```

- [ ] **Step 2: `.archive-panel` 너비 가드 추가**

`.archive-panel` 블록(현재):
```css
.archive-panel {
  position: absolute;
  top: 40px;
  left: 0;
  width: 280px;
  max-height: 300px;
  ...
}
```
의 `width: 280px;` 라인을 다음으로 교체:
```css
  width: min(280px, calc(100vw - 40px));
```

(다른 속성은 그대로 유지)

- [ ] **Step 3: `.js-weather` 좌표에 safe-area 더하기**

`.js-weather` 블록(현재):
```css
.js-weather {
  font-size: 20px;
  position: absolute;
  top: 20px;
  right: 30px;
}
```
을 다음으로 교체:
```css
.js-weather {
  font-size: 20px;
  position: absolute;
  top: calc(20px + env(safe-area-inset-top));
  right: calc(30px + env(safe-area-inset-right));
}
```

- [ ] **Step 4: `.sync-status` 좌표에 safe-area 더하기**

`.sync-status` 블록(현재):
```css
.sync-status {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 100;
}
```
을 다음으로 교체:
```css
.sync-status {
  position: fixed;
  bottom: calc(20px + env(safe-area-inset-bottom));
  left: calc(20px + env(safe-area-inset-left));
  z-index: 100;
}
```

- [ ] **Step 5: 브라우저 확인**

DevTools Responsive Mode에서 iPhone 14 Pro (393×852) 시뮬레이션. 노치 시뮬레이션이 활성화된 환경이면 위젯들이 노치 영역 밖에 배치됨. 일반 데스크탑(1280×800)에서는 기존과 좌표 동일.

DevTools 320×568로 변경. archive-menu 아이콘 클릭하여 패널 열기 → 패널이 우측 화면 밖을 벗어나지 않는지 확인 (`width: min(280, 280) = 280px` 정도).

- [ ] **Step 6: 커밋**

```bash
git add css/index.css
git commit -m "feat(layout): 코너 위젯 safe-area + archive-panel 너비 가드"
```

---

### Task 3: Fluid Type — 시계 & 인사말

**Files:**
- Modify: `css/index.css` — `.js-clock` (line 33), `.greetings` (line 84)

- [ ] **Step 1: `.js-clock` clamp 적용**

`.js-clock` 블록(현재):
```css
.js-clock {
  margin-top: 8%;
  letter-spacing: 10px;
  font-size: 30px;
  padding-bottom: 3%;
}
```
을 다음으로 교체:
```css
.js-clock {
  margin-top: clamp(8px, 4vmin, 60px);
  letter-spacing: clamp(2px, 1.5vmin, 10px);
  font-size: clamp(18px, 5vmin, 30px);
  padding-bottom: clamp(4px, 2vmin, 20px);
}
```

- [ ] **Step 2: `.greetings` clamp + ellipsis 적용**

`.greetings` 블록(현재):
```css
.greetings {
  font-size: 30px;
  letter-spacing: 10px;
}
```
을 다음으로 교체:
```css
.greetings {
  font-size: clamp(13px, 3.5vmin, 28px);
  letter-spacing: clamp(2px, 1vmin, 10px);
  margin: clamp(4px, 2vmin, 20px) 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90vw;
}
```

- [ ] **Step 3: 브라우저 확인**

서버 새로고침. DevTools Responsive Mode에서 viewport 변경:
- 1280×800: 시계 30px (또는 매우 근접), 인사말 28px 부근 — 기존과 거의 동일
- 360×640: 시계 작아져 18px 근접, 인사말도 13~16px 부근
- 800×360: vmin이 360 기준이라 시계 18px 근접, 인사말 13~14px
- 매우 긴 이름으로 테스트 (이름 prompt에 "테스트사용자김아무개" 입력) → 인사말이 화면 폭의 90% 이내에서 "..." 으로 잘림

콘솔 에러 없음 확인.

- [ ] **Step 4: 커밋**

```bash
git add css/index.css
git commit -m "feat(layout): 시계와 인사말 clamp 기반 fluid 사이즈"
```

---

### Task 4: Fluid Spacing — content-box & things

**Files:**
- Modify: `css/index.css` — `.content-box` (line 151), `.things` (line 130 — 또는 357)

- [ ] **Step 1: `.content-box` 에 fluid padding/margin + viewport 가드 추가**

`.content-box` 블록(현재):
```css
.content-box {
  position: relative;
  margin-top: 30px;
  padding: 30px;
  background-color: rgba(0, 0, 0, 0.35);
  border-radius: 8px;
  min-width: 280px;
  min-height: 150px;
  resize: both;
  overflow: hidden;
  animation: fadeIn 1s linear;
  display: flex;
  flex-direction: column;
}
```
을 다음으로 교체:
```css
.content-box {
  position: relative;
  margin-top: clamp(8px, 3vmin, 30px);
  padding: clamp(12px, 3vmin, 30px);
  background-color: rgba(0, 0, 0, 0.35);
  border-radius: 8px;
  min-width: 280px;
  min-height: 150px;
  max-width: min(560px, 92vw);
  max-height: min(70dvh, calc(100dvh - 200px));
  resize: both;
  overflow: hidden;
  animation: fadeIn 1s linear;
  display: flex;
  flex-direction: column;
}
```

- [ ] **Step 2: 활성 todo 목록의 `.things` padding fluid화**

`css/index.css` 의 `.things` 블록(line 130 부근, 첫 번째 정의):
```css
.things {
  padding: 0 50px 10px 50px;
}
```
을 다음으로 교체:
```css
.things {
  padding: 0 clamp(8px, 4vw, 50px) 10px;
}
```

**중요:** 같은 파일 line 357 부근에 두 번째 `.things` 정의 (`display: flex; align-items: center; gap: 10px; ...`)가 있다 — **그 정의는 건드리지 않는다**. 첫 번째 정의(padding-only)만 수정.

- [ ] **Step 3: 브라우저 확인**

새로고침. DevTools에서:
- 1280×800: content-box max-width는 min(560, 1178) = 560px. 기존과 거의 동일.
- 360×640: max-width는 min(560, 331) = 331px. 화면을 다 안 채우고 92% 정도.
- 800×360: max-height는 min(252, 160) = 160px (또는 dvh 계산 결과). content-box 너무 안 큼.
- `.things` 항목의 좌우 여백이 viewport에 따라 8~50px 사이에서 변화.

데스크탑에서 todo 항목 5개 추가 후 viewport를 360×640으로 줄여서 항목들이 잘리지 않고 좌우 패딩이 적절히 축소되는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add css/index.css
git commit -m "feat(layout): content-box viewport 가드 + things fluid 패딩"
```

---

### Task 5: Landscape-Short 미디어 쿼리 — `max-height: 500px`

**Files:**
- Modify: `css/index.css` — 파일 끝에 새 미디어 쿼리 블록 추가

- [ ] **Step 1: 파일 끝(현재 마지막 블록 `body.focus-mode ...` 다음)에 신규 블록 추가**

```css

/* ===== 가로 모드 짧은 모바일 (height ≤ 500px) ===== */
@media (max-height: 500px) {
  .js-clock { margin-top: 6px; padding-bottom: 0; }
  .greetings { font-size: clamp(11px, 2.5vmin, 14px); margin: 2px 0; letter-spacing: 2px; }
  .content-box { margin-top: 6px; padding: 12px; min-height: 100px; }
  .archive-menu { top: calc(6px + env(safe-area-inset-top)); }
  .sync-status {
    top: calc(6px + env(safe-area-inset-top));
    left: auto;
    right: calc(6px + env(safe-area-inset-right));
    bottom: auto;
  }
  .js-weather {
    top: calc(6px + env(safe-area-inset-top));
    right: calc(50px + env(safe-area-inset-right));
    font-size: 12px;
  }
}
```

- [ ] **Step 2: 브라우저 확인**

새로고침. DevTools에서 viewport를 **800×360** 으로 설정. 다음 검증:
- 시계의 margin-top이 6px로 축소
- 인사말 font-size 11~14px, letter-spacing 2px로 축소
- content-box margin-top 6px, padding 12px
- sync-status 가 좌하단이 아닌 **우상단** 으로 이동 (weather 오른쪽에 작게 자리)
- archive-menu (좌상단 햄버거), weather, sync-btn 셋이 한 줄로 상단에 정렬되어 겹치지 않음

768×400 (windowed short)에서도 동일 동작 확인.

화면이 1024×800으로 돌아가면 모든 위젯이 다시 원래 좌표로 (archive 좌상단, weather 우상단, sync 좌하단).

- [ ] **Step 3: 커밋**

```bash
git add css/index.css
git commit -m "feat(layout): max-height:500px landscape-short 미디어 쿼리"
```

---

### Task 6: Extra 미디어 쿼리 — `max-height: 400px` + `max-width: 380px` + `max-width: 767px` 블록 간소화

**Files:**
- Modify: `css/index.css` — Task 5의 블록 다음에 추가 미디어 쿼리 2개 추가, 그리고 기존 `max-width: 767px` 블록(line 321~348) 간소화

- [ ] **Step 1: 매우 짧은 화면 미디어 쿼리 추가 (Task 5 블록 다음에)**

```css

/* ===== 매우 짧은 화면 (height ≤ 400px) ===== */
@media (max-height: 400px) {
  .greetings { font-size: 11px; max-width: 50vw; letter-spacing: 1px; }
  .js-form input { width: 90px; }
}
```

- [ ] **Step 2: 매우 좁은 세로 화면 미디어 쿼리 추가 (위 블록 다음에)**

```css

/* ===== 매우 좁은 세로 화면 (width ≤ 380px) ===== */
@media (max-width: 380px) {
  .matrix-grid { grid-template-columns: 1fr; }
  .matrix-cell { min-height: 50px; }
  .greetings { letter-spacing: 4px; }
}
```

- [ ] **Step 3: 기존 `max-width: 767px` 블록 간소화**

`css/index.css` 의 기존 블록(line 321~348 부근):
```css
@media screen and (max-width: 767px) {
  .js-clock {
    font-size: 18px;
    margin-top: 20%;
  }
  .greetings {
    margin: 5% 0;
    font-size: 20px;
  }
  .js-form input {
    width: 110px;
  }
  .js-toDoForm input {
    width: 145px;
  }
  form input::placeholder {
    font-size: 15px;
  }
  .js-toDoList {
    font-size: 12px;
  }
  .js-weather {
    font-size: 15px;
    position: absolute;
    top: 10px;
    right: 20px;
  }
}
```
을 다음으로 교체 (`.js-clock`, `.greetings`, `.js-weather`의 size/position은 Task 3, 2에서 처리되므로 제거):
```css
@media screen and (max-width: 767px) {
  .js-form input { width: 110px; }
  .js-toDoForm input { width: 145px; }
  form input::placeholder { font-size: 15px; }
  .js-toDoList { font-size: 12px; }
  .js-weather { font-size: 15px; }
}
```

(주의: `.js-weather` 의 `top`/`right` 좌표는 이미 베이스 + safe-area 조합이므로 여기서 제거)

- [ ] **Step 4: 브라우저 확인**

- DevTools 360×800으로 설정 (mobile portrait): 매트릭스 모드 진입 → 사분면이 1열로 collapse 확인. 인사말 letter-spacing 4px.
- DevTools 800×400으로 설정 (landscape short): max-height:400px 트리거 → 인사말이 11px로 더 축소, max-width 50vw로 제한.
- DevTools 1280×800: 변화 없음 (기존과 동일).

- [ ] **Step 5: 커밋**

```bash
git add css/index.css
git commit -m "feat(layout): max-height:400 + max-width:380 미디어 쿼리, 767px 블록 정리"
```

---

### Task 7: JS Resize-Persistence 가드

**Files:**
- Modify: `js/todo.js` — `loadBoxSize()` 함수 (현재 871-877번 줄 근처)

- [ ] **Step 1: `loadBoxSize` 함수 본문 교체**

기존:
```js
function loadBoxSize() {
    const saved = localStorage.getItem(BOX_SIZE_LS);
    if (saved) {
        const { width, height } = JSON.parse(saved);
        contentBox.style.width = width + "px";
        contentBox.style.height = height + "px";
    }
}
```
을 다음으로 교체:
```js
function loadBoxSize() {
    const saved = localStorage.getItem(BOX_SIZE_LS);
    if (!saved) return;
    const { width, height } = JSON.parse(saved);
    // viewport에 맞게 clamp — 데스크탑에서 늘린 값이 모바일에서 넘치지 않도록
    const maxW = window.innerWidth * 0.92;
    const maxH = window.innerHeight * 0.70;
    contentBox.style.width = Math.min(width, maxW) + "px";
    contentBox.style.height = Math.min(height, maxH) + "px";
}
```

- [ ] **Step 2: 브라우저 확인**

1. 1280×800 viewport에서 content-box를 손으로 600×400 정도로 drag-resize. 새로고침 → 600×400 복원.
2. DevTools에서 360×800으로 변경. 새로고침 → content-box 가 `min(600, 360*0.92) = 331px` 폭, `min(400, 800*0.70) = 400px` 높이로 자동 축소.
3. 다시 1280×800으로 돌리고 새로고침 → 600×400 그대로 복원 (사용자 데스크탑 입력값이 모바일에서만 임시 clamp되고 localStorage는 600×400 그대로).
4. DevTools 콘솔에서 `JSON.parse(localStorage.contentBoxSize)` 호출 → `{width: 600, height: 400}` 유지 (저장 자체는 안 바뀜).

- [ ] **Step 3: 커밋**

```bash
git add js/todo.js
git commit -m "feat(layout): content-box 크기를 viewport에 맞게 자동 clamp"
```

---

### Task 8: Playwright 다중 viewport 회귀 검증

**Files:** 변경 없음. 검증 전용.

- [ ] **Step 1: HTTP 서버 시작 (백그라운드)**

```bash
npx http-server -p 8080 c:/Users/rlarh/Desktop/flying-doctor/code/js-basic-clock
```

(이 명령은 `.claude/settings.local.json` 의 허용 목록에 포함됨)

- [ ] **Step 2: Playwright로 viewport 8종 자동 검증**

Playwright MCP 도구를 사용하여 다음 viewport마다 페이지를 열고 검증:

| 명칭 | viewport | 핵심 체크 |
|---|---|---|
| Desktop | 1280×800 | 시계 30px 근접, content-box 정상 |
| Mobile portrait | 360×800 | 시계 작게, 위젯 안 겹침, 가로 스크롤 없음 |
| Mobile landscape | 800×360 | landscape-short 트리거: sync-btn 우상단, weather 작아짐 |
| iPhone portrait | 414×896 | 정상 렌더링 |
| iPhone landscape | 896×414 | landscape-short 트리거 확인 |
| Tablet portrait | 768×1024 | 정상 |
| Tablet landscape | 1024×768 | 정상 |
| Very short windowed | 1280×400 | landscape-short 트리거, 모든 모드 동작 |
| Very narrow | 320×568 | 매트릭스 1열 collapse, archive-panel 화면 안 |

각 viewport에서:
1. `browser_resize` 로 크기 변경
2. localStorage 클리어 후 새로고침
3. 이름 prompt 처리: "T" 입력 후 Enter (인사말 짧게)
4. `browser_evaluate` 로 다음 확인:
   - `document.documentElement.scrollWidth <= window.innerWidth + 1` (가로 스크롤 없음 — `+1` 은 브라우저 반올림 오차 허용)
   - 시계, 인사말, content-box 모두 `getBoundingClientRect()` 로 viewport 안에 있는지
   - landscape-short 트리거 viewport에서는 `document.querySelector('.sync-status')` 의 `getComputedStyle().left === 'auto'` 확인
   - 매우 좁은 viewport에서는 `.matrix-grid` 가 `gridTemplateColumns === '1fr'` (또는 단일 컬럼 값) 인지 확인 (todos→matrix 모드 진입 후)
5. 필요 시 `browser_take_screenshot` 으로 스크린샷 저장 (`.playwright-mcp/` 폴더에 자동 저장됨)

- [ ] **Step 3: 모드별 회귀 검증 (1개 viewport에서 충분)**

DevTools 360×800 (mobile portrait) 또는 1280×800 (desktop) 하나에서:
1. todos 모드: 항목 3개 추가, D-Day/담당자 배지 정상
2. matrix 모드 진입: 사분면 보이고 백로그도 보임 (좁은 화면이면 1열)
3. people 모드: 담당자 카드 보임
4. focus 모드: 핀된 항목만, 위젯 숨김 정상
5. words 모드: 명언 정상

- [ ] **Step 4: 발견된 이슈가 있으면 수정 후 별도 커밋**

회귀나 깨진 화면이 발견되면 root cause 분석 후 최소 수정. 별도 커밋:
```bash
git add <fixed-files>
git commit -m "fix(layout): <발견된 이슈 한 줄 설명>"
```

이슈가 없으면 이 단계는 건너뛴다.

- [ ] **Step 5: 정리 — 서버/브라우저 종료**

Playwright `browser_close`. 백그라운드 HTTP 서버 KillShell.

---

## 완료 후 체크리스트 (스펙 성공 기준 매핑)

스펙의 8개 성공 기준이 모두 통과되어야 한다:

- [ ] 모든 viewport에서 시계 + 인사말 + content-box가 동시에 visible. (Task 1, 3, 4, 5)
- [ ] 모든 viewport에서 가로 스크롤 없음, 코너 위젯 겹침 없음. (Task 1, 2, 5)
- [ ] 데스크탑→모바일 전환 시 content-box가 화면 폭의 92% 이내로 자동 축소. (Task 4, 7)
- [ ] iPhone X 이상에서 safe-area-inset이 적용되어 노치/홈 인디케이터 영역과 위젯이 안 겹침. (Task 1, 2)
- [ ] 시계/인사말 font-size가 viewport에 따라 clamp 범위 안에서 부드럽게 변함. (Task 3)
- [ ] 매우 짧은 화면(`height < 400px`)에서도 인사말이 한 줄로 표시 (ellipsis 가능). (Task 3, 6)
- [ ] 매우 좁은 화면(`width < 380px`)에서 매트릭스가 1열로 collapse. (Task 6)
- [ ] 모바일 Safari에서 URL bar 노출 시에도 콘텐츠가 잘리지 않음 (dvh 효과). (Task 1)
