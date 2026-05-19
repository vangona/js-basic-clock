# 반응형 레이아웃 전면 개선 (Responsive Overhaul) — Design Spec

**Date:** 2026-05-19
**Author:** vincent
**Status:** Draft

## 목적

세로/가로, 짧은 높이, 좁은 너비, 노치 있는 모바일, 데스크탑 윈도우 분할 등 다양한 viewport에서 앱이 정상적으로 사용 가능하도록 CSS 반응형 인프라를 개선한다. 현재 레이아웃은 데스크탑 가로 모니터 1280×800 부근만을 가정하고 작성되어, 모바일 가로 모드(`height < 500px`) 및 좁은 모바일 세로(`width < 380px`)에서 콘텐츠가 잘리거나 위젯이 겹친다.

## 진단 결과 (Best Practice 대비)

| # | 문제 | 영향 viewport | Best Practice |
|---|------|-----------|---------------|
| 1 | `body { overflow: hidden }` + `min-height: 100vh` | 모든 짧은 화면 | `100svh/100dvh` cascade + 본문 세로 스크롤 허용 |
| 2 | 좁은 viewport meta tag | 모바일 전반 | `width=device-width, initial-scale=1, viewport-fit=cover` |
| 3 | 너비 기반 미디어 쿼리만 존재 (`max-width: ...`) | landscape 모바일 | `max-height: 500px` 트랙 신설 |
| 4 | 고정 px 시계/인사말 (font-size 30px, letter-spacing 10px) | 좁은/짧은 화면 | `clamp()` 기반 fluid |
| 5 | 코너 위젯 4개의 `position: fixed` 고정 좌표 | 모든 작은 화면 | `env(safe-area-inset-*)` + viewport별 크기 조정 |
| 6 | `.content-box { resize: both }` + localStorage 영구 저장 | 데스크탑→모바일 전환 시 | 로드 시 viewport에 맞게 clamp |
| 7 | `.archive-panel { width: 280px }` 고정 | 320px 모바일 | `width: min(280px, calc(100vw - 40px))` |
| 8 | `.matrix-grid` 항상 2열 | < 380px | 1열로 collapse |
| 9 | `.things { padding: 0 50px ... }` 고정 | < 414px | `padding: 0 clamp(8px, 4vw, 50px)` |

## 사용자 결정 사항

1. **인사말 정책**: 어떤 viewport에서도 항상 표시. 짧은 화면(`max-height: 400px`)에서는 폰트/letter-spacing 강하게 축소 + 한 줄로 자르기(`text-overflow: ellipsis`).
2. **Content-box 크기 정책**: 로드 시 viewport에 맞게 자동 축소(viewport의 92% 너비 / 70% 높이 cap). 사용자가 mid-session에 늘린 값은 그대로 유지(저장만 됨).

## 설계 — 4개 레이어

### 레이어 1: Viewport 인프라

**HTML — `index.html`:**

기존: `<meta name="viewport" content="width=device-width" />`

신규: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />`

**CSS — `body`:**

기존:
```css
body {
  ...
  overflow: hidden;
  min-height: 100vh;
}
```

신규:
```css
body {
  ...
  overflow-x: hidden;
  overflow-y: auto;
  min-height: 100vh;       /* fallback */
  min-height: 100svh;      /* small viewport (avoids URL bar) */
  min-height: 100dvh;      /* dynamic, latest */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

**CSS — 코너 위젯 좌표에 safe-area 합산:**
- `.archive-menu { top: calc(20px + env(safe-area-inset-top)); left: calc(20px + env(safe-area-inset-left)); }`
- `.js-weather { top: calc(20px + env(safe-area-inset-top)); right: calc(30px + env(safe-area-inset-right)); }`
- `.sync-status { bottom: calc(20px + env(safe-area-inset-bottom)); left: calc(20px + env(safe-area-inset-left)); }`

### 레이어 2: Fluid Type & Spacing

`clamp(min, preferred, max)` 패턴으로 viewport에 따라 부드럽게 크기 조정. `vmin` 단위는 가로/세로 중 더 작은 쪽 기준이라 두 방향 모두에서 자연스럽게 동작.

```css
.js-clock {
  font-size: clamp(18px, 5vmin, 30px);
  letter-spacing: clamp(2px, 1.5vmin, 10px);
  margin-top: clamp(8px, 4vmin, 60px);    /* 기존 8% → vmin 기반 */
  padding-bottom: clamp(4px, 2vmin, 20px);  /* 기존 3% → vmin 기반 */
}

.greetings {
  font-size: clamp(13px, 3.5vmin, 28px);
  letter-spacing: clamp(2px, 1vmin, 10px);
  margin: clamp(4px, 2vmin, 20px) 0;
  /* 한 줄 강제로 매우 좁은 화면에서 줄바꿈 방지 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90vw;
}

.content-box {
  padding: clamp(12px, 3vmin, 30px);
  margin-top: clamp(8px, 3vmin, 30px);
  max-width: min(560px, 92vw);                  /* 신규 — viewport 가드 */
  max-height: min(70dvh, calc(100dvh - 200px)); /* 신규 — viewport 가드 */
}

.things {
  padding: 0 clamp(8px, 4vw, 50px) 10px;  /* 기존 50px 고정 → fluid */
}
```

기존 `.greetings { font-size: 30px }` 같은 고정 값은 모두 위 clamp 값으로 교체된다.

### 레이어 3: 신규 미디어 쿼리 트랙

**(A) Landscape-short (가로 모드 짧은 모바일) — `max-height: 500px`**

```css
@media (max-height: 500px) {
  .js-clock { margin-top: 6px; padding-bottom: 0; }
  .greetings { font-size: clamp(11px, 2.5vmin, 14px); margin: 2px 0; letter-spacing: 2px; }
  .content-box { margin-top: 6px; padding: 12px; min-height: 100px; }
  .archive-menu, .sync-status { top: 6px; bottom: auto; }
  .sync-status { left: auto; right: 6px; }  /* 상단으로 이동 */
  .js-weather { top: 6px; font-size: 12px; right: 50px; }
}
```

**(B) Landscape short + 매우 짧음 — `max-height: 400px`**

```css
@media (max-height: 400px) {
  .greetings { font-size: 11px; max-width: 50vw; letter-spacing: 1px; }
  .js-form input { width: 90px; }  /* 이름 입력창 축소 */
}
```

**(C) Narrow portrait — `max-width: 380px`**

```css
@media (max-width: 380px) {
  .matrix-grid { grid-template-columns: 1fr; }   /* 1열로 */
  .matrix-cell { min-height: 50px; }
  .greetings { letter-spacing: 4px; }
}
```

**`.archive-panel` 가드는 미디어 쿼리가 아닌 베이스 규칙에 적용:**

기존: `.archive-panel { width: 280px; ... }`
신규: `.archive-panel { width: min(280px, calc(100vw - 40px)); ... }`

이렇게 하면 모든 viewport에서 자동으로 화면을 벗어나지 않는다 (1024px → 280px, 320px → 280px, 300px → 260px).

**(D) 기존 `max-width: 767px` 블록 정리**

현재 블록 안의 `.js-clock { font-size: 18px; margin-top: 20% }` 같은 하드코딩 값은 레이어 2의 clamp가 처리하므로 **삭제**. 남길 것은 `.js-weather` 좌표 같은 width-specific 조정만.

기존:
```css
@media screen and (max-width: 767px) {
  .js-clock { font-size: 18px; margin-top: 20%; }
  .greetings { margin: 5% 0; font-size: 20px; }
  ...
}
```

신규 (간소화):
```css
@media screen and (max-width: 767px) {
  .js-form input { width: 110px; }
  .js-toDoForm input { width: 145px; }
  form input::placeholder { font-size: 15px; }
  .js-toDoList { font-size: 12px; }
  .js-weather { font-size: 15px; right: 20px; }
}
```

### 레이어 4: JS Resize-Persistence 가드

**파일: `js/todo.js`** — `loadBoxSize()` 함수 (현재 871-877번 줄 근처)

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

신규:
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

**저장 시점은 변경 없음** — 사용자가 mid-session에 늘리면 그대로 저장된다(다음 로드에서 clamp). orientation change 발생 시 다시 clamp하려면 추가 작업이 필요하지만 YAGNI로 보류.

## 영향받는 파일

| 파일 | 변경 |
|---|---|
| `index.html` | viewport meta 한 줄 교체 |
| `css/index.css` | `body` 블록 수정 (overflow, dvh, safe-area) / 시계·인사말·content-box·things를 clamp 기반으로 / 신규 미디어 쿼리 3개 (`max-height: 500px`, `max-height: 400px`, `max-width: 380px`) / 코너 위젯 safe-area 추가 / `.archive-panel` 폭 가드 / `max-width: 767px` 블록 간소화 |
| `js/todo.js` | `loadBoxSize()` 함수 viewport-clamp 추가 (5라인) |

## 엣지 케이스

1. **`100dvh` 미지원 브라우저** (iOS Safari < 15.4): cascade fallback이 `100vh` → `100svh` → `100dvh` 순으로 처리. 마지막 지원 값이 적용됨.
2. **`env(safe-area-inset-*)` 미지원**: CSS 변수 미정의 시 기본값 0으로 fallback. `viewport-fit=cover` 메타가 있어야 활성화되므로 안 켜진 브라우저에서는 자동 0.
3. **세로↔가로 전환**: 미디어 쿼리가 즉시 재평가되어 레이아웃 자동 갱신. content-box는 사용자 저장값이 살아있으면 그대로(다음 로드에서 clamp). 즉시 clamp가 필요하면 `orientationchange` 이벤트 리스너 추가가 필요 — YAGNI로 보류.
4. **매우 긴 인사말** (예: "행복한 하루 되세요, 김아무개아무개"): `text-overflow: ellipsis` + `max-width: 90vw` 로 자연스럽게 잘린다.
5. **데스크탑에서 600×400으로 늘린 박스 → 모바일 360×740에서 열기**: `loadBoxSize`가 `min(600, 360*0.92) = 331`, `min(400, 740*0.7) = 400` → 331×400으로 표시.
6. **`.archive-panel`이 모바일에서 화면 우측 벗어남**: `width: min(280px, calc(100vw - 40px))` 로 항상 화면 안에 머무름. 단 `position: absolute` 기준점이 `.archive-menu`(좌측)라 좌측 정렬 유지됨.

## 명시적으로 안 하는 것 (YAGNI)

- `orientationchange` 시 content-box 자동 리사이즈 (수동 새로고침 시 clamp만 적용)
- 컨테이너 쿼리 (`@container`) — `.content-box`가 resizable이지만, 모드 패널들이 이미 flex로 자연스럽게 적응함
- 다크/라이트 테마 분기 (현재 단일 다크 테마, viewport와 무관)
- Touch hit-target 크기 일괄 검사 — 현재 버튼들은 대부분 최소 22px 이상이라 큰 문제 없음
- 가로 모드 짧은 화면에서 시계+인사말 가로 정렬 — 사용자가 "함께 결합" 옵션을 거부, 항상 스택 유지
- 폰트 사이즈를 사용자 환경 설정(브라우저 폰트 크기)에 100% 비례 — `clamp()`은 일정 범위 내에서만 사용자 선호 존중

## 검증 방법

테스트 환경에서 다음 viewport로 Playwright 자동 검증:

| 명칭 | viewport | 확인 항목 |
|---|---|---|
| Mobile portrait | 360×800 | 시계+인사말 한 줄, 위젯 안 겹침, 가로 스크롤 없음 |
| Mobile landscape | 800×360 | 시계 상단 작게, 인사말 보임, content-box 안 짤림 |
| iPhone portrait | 414×896 | 정상 |
| iPhone landscape | 896×414 | landscape-short 미디어 쿼리 동작 확인 |
| iPhone Pro Max landscape | 932×430 | 인사말이 ellipsis로 잘림 |
| Tablet portrait | 768×1024 | 데스크탑과 거의 동일 동작 |
| Tablet landscape | 1024×768 | 정상 |
| Desktop | 1280×800 | 기존과 동일 |
| Windowed-short | 1280×400 | landscape-short 트리거, 모드들 모두 동작 |
| Very narrow | 320×568 | 매트릭스 1열 collapse, archive-panel 안 벗어남 |

Modes(모드)별로 각 viewport에서:
- words: 명언 텍스트 안 짤림
- todos: 입력창 + 리스트 보임, 스크롤 가능
- matrix: 사분면 보임 (좁은 화면에서 1열)
- people: 카드 정렬
- focus: 큰 글씨 항목 + 위젯 숨김

## 성공 기준

- [ ] 모든 viewport에서 시계 + 인사말 + content-box가 동시에 visible
- [ ] 모든 viewport에서 가로 스크롤 없음, 코너 위젯 겹침 없음
- [ ] 데스크탑→모바일 전환 시 content-box가 화면 폭의 92% 이내로 자동 축소
- [ ] iPhone X 이상에서 safe-area-inset이 적용되어 노치/홈 인디케이터 영역과 위젯이 안 겹침
- [ ] 시계/인사말 font-size가 viewport에 따라 clamp 범위 안에서 부드럽게 변함
- [ ] 매우 짧은 화면(`height < 400px`)에서도 인사말이 한 줄로 표시 (ellipsis 가능)
- [ ] 매우 좁은 화면(`width < 380px`)에서 매트릭스가 1열로 collapse
- [ ] 모바일 Safari에서 URL bar 노출 시에도 콘텐츠가 잘리지 않음 (dvh 효과)
