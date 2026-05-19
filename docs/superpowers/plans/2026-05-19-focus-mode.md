# 몰입 모드 (Focus Mode) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 핀(★)한 할일만 큰 글씨로 표시하는 5번째 모드를 추가한다. 사진/시계/인사말 외 모든 위젯을 숨겨 미니멀한 몰입 화면을 만든다.

**Architecture:** todo 객체에 `focused?: true` 옵션 필드 1개만 추가. 기존 `toDos` 배열이 이미 동기화 대상이므로 핀 상태도 별도 작업 없이 Firestore에 함께 저장된다. 모드 전환은 기존 `setMode()`/`toggleMode()` 사이클에 `"focus"`를 5번째로 끼워넣고, 미니멀 뷰는 `body.focus-mode` 클래스로 위젯들을 일괄 숨긴다.

**Tech Stack:** Vanilla JS (classic `<script>` tags), HTML, CSS. **테스트 프레임워크 없음** — 각 태스크는 코드 변경 + 수동 브라우저 검증 + 커밋으로 구성된다.

**검증 환경:** 프로젝트 루트에서 `npx http-server -p 8080` 실행 후 `http://localhost:8080/` 열기. Firebase 동기화 관련 검증은 로그인 상태에서 진행하되, 핀/모드 전환 자체는 로그아웃 상태로도 검증 가능.

**Spec:** `docs/superpowers/specs/2026-05-19-focus-mode-design.md`

---

## File Structure

| 파일 | 작업 |
|---|---|
| `index.html` | `.mode-people` 다음 위치에 `.mode-focus` 패널 추가 |
| `js/todo.js` | DOM 쿼리 확장, `togglePin`/`renderFocus`/`paintFocusItem` 신설, `setMode`/`toggleMode`/`loadMode`/`paintToDo` 수정, 아카이브/복원 흐름에 `delete focused` 추가, `onRemoteChange` 콜백 확장 |
| `css/index.css` | `.mode-focus`/`.focus-list`/`.focus-item`/`.focus-text`/`.focus-empty`/`.btn-focus`/`.btn-focus--active`, `body.focus-mode` 숨김 규칙 |

각 태스크는 위 파일들 중 한두 곳에 국한된 자체 완결적 변경이다.

---

### Task 1: HTML 패널 추가

**Files:**
- Modify: `index.html:68-78` (`.mode-people` 패널 직후)

- [ ] **Step 1: `.mode-people` 닫는 `</div>` 다음에 `.mode-focus` 패널 추가**

`index.html`의 `<!-- 사람 모드 -->` 블록 닫는 `</div>` (현재 78번 줄) 바로 다음, `</div><!-- .content-box 닫기 -->` 직전에 삽입:

```html
      <!-- 몰입 모드 -->
      <div class="mode-panel mode-focus js-modeFocus">
        <ul class="focus-list js-focusList"></ul>
        <p class="focus-empty js-focusEmpty">몰입할 항목에 ★를 눌러보세요</p>
      </div>
```

- [ ] **Step 2: 브라우저로 확인**

`npx http-server -p 8080` 실행, `http://localhost:8080/` 열기.
Expected: 화면에 변화 없음 (`.showing` 클래스가 없어 패널은 숨김). 콘솔 에러 없음. DevTools에서 `document.querySelector('.js-modeFocus')` 호출 시 요소가 존재함.

- [ ] **Step 3: 커밋**

```bash
git add index.html
git commit -m "feat(focus): 몰입 모드 패널 마크업 추가"
```

---

### Task 2: DOM 쿼리 및 모드 토글 사이클 확장

**Files:**
- Modify: `js/todo.js:1-38` (상단 DOM 쿼리 블록)
- Modify: `js/todo.js:802-846` (`setMode`, `toggleMode`, `loadMode`)

- [ ] **Step 1: DOM 쿼리 추가**

`js/todo.js` 상단 쿼리 선언부(`peopleTodoList = ...;` 라인 끝) 직전, `,` 뒤에 추가:

```js
    peopleTodoList = document.querySelector(".js-peopleTodoList"),
    modeFocus = document.querySelector(".js-modeFocus"),
    focusList = document.querySelector(".js-focusList"),
    focusEmpty = document.querySelector(".js-focusEmpty");
```

(기존 마지막 라인 `peopleTodoList = ...;` 의 `;` 를 `,` 로 바꾸고, 위 3개 라인 추가, 마지막 라인에 `;` 유지.)

- [ ] **Step 2: `setMode` 함수에 focus 분기 추가**

기존 `setMode` 함수(802번 줄 부근)를 다음으로 교체:

```js
function setMode(mode) {
    modeWords.classList.remove("showing");
    modeTodos.classList.remove("showing");
    modeMatrix.classList.remove("showing");
    modePeople.classList.remove("showing");
    modeFocus.classList.remove("showing");
    document.body.classList.remove("focus-mode");

    if (mode === "todos") {
        modeTodos.classList.add("showing");
        modeIcon.textContent = "✦";
    } else if (mode === "matrix") {
        modeMatrix.classList.add("showing");
        modeIcon.textContent = "⊞";
        renderMatrix();
    } else if (mode === "people") {
        modePeople.classList.add("showing");
        modeIcon.textContent = "👤";
        renderPeopleView();
    } else if (mode === "focus") {
        modeFocus.classList.add("showing");
        document.body.classList.add("focus-mode");
        modeIcon.textContent = "◉";
        renderFocus();
    } else {
        modeWords.classList.add("showing");
        modeIcon.textContent = "☰";
        mode = "words";
    }

    AppStorage.set(MODE_LS, mode);
}
```

- [ ] **Step 3: `toggleMode` 함수에 focus 분기 추가**

기존 `toggleMode` 함수를 다음으로 교체:

```js
function toggleMode() {
    if (modeWords.classList.contains("showing")) {
        setMode("todos");
    } else if (modeTodos.classList.contains("showing")) {
        setMode("matrix");
    } else if (modeMatrix.classList.contains("showing")) {
        setMode("people");
    } else if (modePeople.classList.contains("showing")) {
        setMode("focus");
    } else {
        setMode("words");
    }
}
```

- [ ] **Step 4: `loadMode` 함수에 focus 허용 추가**

기존 `loadMode` 함수를 다음으로 교체:

```js
function loadMode() {
    const savedMode = AppStorage.get(MODE_LS);
    if (savedMode === "todos" || savedMode === "matrix" ||
        savedMode === "people" || savedMode === "focus") {
        setMode(savedMode);
    }
}
```

- [ ] **Step 5: 임시 `renderFocus` 스텁 추가 (Task 4에서 채움)**

`renderPeopleView` 함수 직후, `function init()` 직전에 추가:

```js
// ===== 몰입 모드 (focus) =====
function renderFocus() {
    // Task 4에서 구현
    focusList.innerHTML = "";
    focusEmpty.classList.add("showing");
}
```

또한 `css/index.css`에 임시 규칙 1개 추가 (스텁용, Task 5에서 본격 교체):

```css
.focus-empty.showing { display: block; }
```

`css/index.css` 어디에 넣어도 되지만 파일 끝에 추가하는 게 후속 작업과 충돌이 적다.

- [ ] **Step 6: 브라우저로 확인**

`http://localhost:8080/` 새로고침. 모드 버튼을 5번 눌러 `☰ → ✦ → ⊞ → 👤 → ◉ → ☰` 순환을 확인.
- ◉ 표시 시: `.content-box` 안에 "몰입할 항목에 ★를 눌러보세요" 텍스트 표시 (스타일 미적용 상태로 OK)
- 페이지 새로고침해도 ◉ 상태 유지 (viewMode localStorage)
- 콘솔 에러 없음

- [ ] **Step 7: 커밋**

```bash
git add js/todo.js css/index.css
git commit -m "feat(focus): 모드 토글 사이클에 몰입 모드 추가"
```

---

### Task 3: todo 항목에 핀 버튼 + 데이터 토글

**Files:**
- Modify: `js/todo.js:609-692` (`paintToDo` 함수의 활성 목록 분기, 최상위 할일에만)
- Modify: `js/todo.js` (`renderBadges` 다음 위치에 `togglePin` 신설)

- [ ] **Step 1: `togglePin` 함수 신설**

`renderBadges` 함수 다음, `showAssigneeInput` 함수 위에 추가:

```js
// 핀 토글 (몰입 모드 대상 마킹)
function togglePin(toDoItem, btn) {
    if (toDoItem.focused) {
        delete toDoItem.focused;
        btn.textContent = "☆";
        btn.classList.remove("btn-focus--active");
    } else {
        toDoItem.focused = true;
        btn.textContent = "★";
        btn.classList.add("btn-focus--active");
    }
    saveToDos();
    // 현재 몰입 모드를 보고 있으면 즉시 재렌더링
    if (modeFocus.classList.contains("showing")) {
        renderFocus();
    }
}
```

- [ ] **Step 2: `paintToDo`에 핀 버튼 추가 (최상위 할일에만)**

`paintToDo` 함수 안, 활성 목록(`!isArchived`) 분기 내부, "하위 할일 진입 버튼" 블록(`if (!toDoObj.parentId) { ... var enterBtn = ...` 부분) **직전**에 다음 블록을 삽입:

```js
        // 핀 버튼 (최상위 할일만)
        if (!toDoObj.parentId) {
            const pinBtn = document.createElement("button");
            pinBtn.className = "btn-focus";
            pinBtn.textContent = toDoObj.focused ? "★" : "☆";
            if (toDoObj.focused) pinBtn.classList.add("btn-focus--active");
            pinBtn.title = "몰입 모드에 추가/제거";
            pinBtn.addEventListener("click", function(e) {
                e.stopPropagation();
                togglePin(toDoObj, pinBtn);
            });
            li.appendChild(pinBtn);
        }
```

(현재 코드 흐름: `li.appendChild(deleteBtn);` 다음에 `if (!toDoObj.parentId) { ... enterBtn ... }`. 위 블록은 그 if 블록 **바로 앞**에 삽입한다.)

- [ ] **Step 3: 임시 CSS — 핀 버튼 최소 가시성**

`css/index.css` 파일 끝에 추가:

```css
.btn-focus {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    font-size: 1rem;
    padding: 0 4px;
}
.btn-focus--active {
    color: rgba(255, 215, 0, 0.95);
}
```

(Task 5에서 전체 스타일과 함께 다듬을 예정.)

- [ ] **Step 4: 브라우저로 확인**

새로고침. 할일 모드(✦)에서:
1. 임의의 최상위 할일에 ☆ 버튼이 표시됨 (삭제 버튼과 진입 버튼 사이)
2. ☆ 클릭 → ★ 로 변하고 노란 색상으로 강조됨
3. 페이지 새로고침 → ★ 상태 유지됨
4. ★ 다시 클릭 → ☆ 로 돌아옴, 새로고침 후에도 유지
5. DevTools 콘솔에서 `JSON.parse(localStorage.toDos).find(t => t.focused)` 호출 시 핀된 항목 객체 반환 (★ 상태일 때) / `undefined` (☆ 상태일 때)
6. 하위 할일(드릴다운 진입 후 추가한 항목)에는 핀 버튼이 표시되지 **않음**

- [ ] **Step 5: 커밋**

```bash
git add js/todo.js css/index.css
git commit -m "feat(focus): todo 항목에 ★ 핀 토글 버튼 추가"
```

---

### Task 4: 포커스 리스트 렌더링 (실제 구현)

**Files:**
- Modify: `js/todo.js` (Task 2에서 만든 `renderFocus` 스텁을 본 구현으로 교체, `paintFocusItem` 신설)

- [ ] **Step 1: `paintFocusItem` 함수 신설**

Task 2에서 만든 `renderFocus` 스텁 **위에** 추가:

```js
// 포커스 항목 렌더링 (체크박스 + 텍스트만, 큰 글씨)
function paintFocusItem(toDoObj) {
    const li = document.createElement("li");
    li.className = "focus-item";
    li.id = toDoObj.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "todo-checkbox";
    checkbox.addEventListener("change", function() {
        if (!checkbox.checked) return;

        // 하위 할일도 함께 아카이브 (toggleComplete와 동일)
        var children = toDos.filter(function(t) { return t.parentId === toDoObj.id; });
        children.forEach(function(child) {
            child.completed = true;
            child.archivedAt = Date.now();
            delete child.focused;
            archivedToDos.push(child);
        });

        toDos = toDos.filter(function(t) {
            return t.id !== toDoObj.id && t.parentId !== toDoObj.id;
        });

        toDoObj.completed = true;
        toDoObj.archivedAt = Date.now();
        delete toDoObj.focused;
        archivedToDos.push(toDoObj);

        saveToDos();
        saveArchive();
        renderArchive();
        renderFocus();

        // 일반 뷰 DOM도 정리
        const normalLi = toDoList.querySelector("#" + CSS.escape(toDoObj.id));
        if (normalLi) normalLi.remove();

        // 아카이브 햄버거 흔들림 알림
        archiveToggleBtn.classList.remove("shake");
        void archiveToggleBtn.offsetWidth;
        archiveToggleBtn.classList.add("shake");
        archiveToggleBtn.addEventListener("animationend", function() {
            archiveToggleBtn.classList.remove("shake");
        }, { once: true });
    });

    const label = document.createElement("label");
    label.className = "todo-label";
    label.appendChild(checkbox);

    const text = document.createElement("span");
    text.className = "focus-text";
    text.textContent = toDoObj.text;

    li.appendChild(label);
    li.appendChild(text);
    focusList.appendChild(li);
}
```

- [ ] **Step 2: `renderFocus` 본 구현으로 교체**

Task 2에서 만든 스텁을 다음으로 교체:

```js
function renderFocus() {
    focusList.innerHTML = "";

    var focused = toDos.filter(function(t) {
        return t.focused && !t.parentId;
    });

    if (focused.length === 0) {
        focusEmpty.classList.add("showing");
        return;
    }

    focusEmpty.classList.remove("showing");
    focused.forEach(paintFocusItem);
}
```

- [ ] **Step 3: 브라우저로 확인**

새로고침. 절차:
1. 할일 모드에서 항목 2~3개 ★ 핀 표시
2. 모드 토글로 ◉ (몰입 모드) 진입
3. **Expected**: 핀된 항목들만 표시됨. 체크박스 + 텍스트만. 배지/담당자/삭제버튼/진입버튼 없음.
4. 항목 체크 → 즉시 목록에서 사라지고, 햄버거 아카이브 메뉴가 흔들리는 애니메이션. localStorage에서 해당 항목이 `toDosArchive` 로 이동됨.
5. 모든 핀 항목 체크 후 → "몰입할 항목에 ★를 눌러보세요" 빈 상태 메시지 표시.
6. 할일 모드로 돌아가서 → 체크된 항목이 아카이브에 있고, 활성 목록에는 없음.

- [ ] **Step 4: 커밋**

```bash
git add js/todo.js
git commit -m "feat(focus): 핀된 항목만 표시하는 포커스 리스트 렌더링"
```

---

### Task 5: 미니멀 뷰 CSS — 위젯 일괄 숨김 + 큰 글씨 스타일

**Files:**
- Modify: `css/index.css` (파일 끝에 새 블록 추가)

- [ ] **Step 1: Task 2/3에서 추가한 임시 규칙 제거**

`css/index.css` 파일 끝에서 Task 2 Step 5의 임시 규칙(`.focus-empty.showing { display: block; }`) 과 Task 3 Step 3의 `.btn-focus` 임시 규칙을 삭제한다. (다음 스텝에서 본격 블록으로 다시 추가됨.)

- [ ] **Step 2: 포커스 모드 전체 CSS 블록 추가**

`css/index.css` 파일 끝에 추가:

```css
/* ===== 몰입 모드 (focus) ===== */

/* 핀 버튼 (todo 항목 내) */
.btn-focus {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    font-size: 1rem;
    padding: 0 4px;
    transition: color 0.2s, transform 0.1s;
}
.btn-focus:hover {
    color: rgba(255, 255, 255, 0.85);
    transform: scale(1.15);
}
.btn-focus--active {
    color: rgba(255, 215, 0, 0.95);
}
.btn-focus--active:hover {
    color: rgba(255, 215, 0, 1);
}

/* 포커스 패널 */
.mode-focus {
    width: 100%;
    padding: 20px 0;
}

.focus-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
}

.focus-item {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 16px;
    padding: 14px 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    font-size: 1.4rem;
    letter-spacing: 1px;
}
.focus-item:last-child {
    border-bottom: none;
}

.focus-item .todo-checkbox {
    transform: scale(1.4);
    cursor: pointer;
}

.focus-text {
    flex: 1;
    color: white;
    word-break: keep-all;
    line-height: 1.4;
}

.focus-empty {
    text-align: center;
    color: rgba(255, 255, 255, 0.55);
    font-style: italic;
    padding: 40px 20px;
    display: none;
}
.focus-empty.showing {
    display: block;
}

/* 몰입 모드 진입 시 부가 위젯 숨김 */
body.focus-mode .js-form,
body.focus-mode .archive-menu,
body.focus-mode .js-weather,
body.focus-mode .sync-status {
    display: none !important;
}
```

- [ ] **Step 3: 브라우저로 확인**

새로고침. 절차:
1. ★ 핀이 1개 이상 있는 상태로 ◉ 몰입 모드 진입
2. **Expected — 보임**: 배경 사진, 상단 시계 (`14:32:07`), "행복한 하루 되세요 NAME." 인사말, 컨텐츠 박스 안의 핀된 항목 리스트, 모드 토글 버튼(◉)
3. **Expected — 숨김**: 좌상단 햄버거(아카이브 메뉴), 우상단 날씨 텍스트, 좌하단 ☁ 동기화 버튼
4. 항목 텍스트가 기존 todo 모드보다 명확히 크고 라인 간격이 넉넉함
5. 모드를 ☰로 다시 돌리면 숨겨졌던 위젯들이 모두 복원됨

- [ ] **Step 4: 커밋**

```bash
git add css/index.css
git commit -m "style(focus): 미니멀 뷰 CSS — 위젯 숨김 + 큰 글씨 리스트"
```

---

### Task 6: 아카이브/복원 흐름에서 `focused` 정리

**Files:**
- Modify: `js/todo.js` `toggleComplete` 함수 (228~268번 줄 부근)
- Modify: `js/todo.js` `completeFromMatrix` 함수 (1180~1218번 줄 부근)
- Modify: `js/todo.js` `restoreFromArchive` 함수 (189~223번 줄 부근)
- Modify: `js/todo.js` `deleteToDo` 함수 (160~186번 줄 부근)

> **참고:** Task 4의 `paintFocusItem` 내부 체크박스 핸들러는 이미 `delete child.focused` / `delete toDoObj.focused` 를 호출한다. 이 태스크는 **나머지 진입점**(일반 체크박스, 매트릭스 체크박스, 아카이브 복원, 삭제) 에서도 같은 정리가 일어나도록 한다.

- [ ] **Step 1: `toggleComplete`에 `delete focused` 추가**

`toggleComplete` 함수 안, 다음 두 곳에 추가:

기존 코드:
```js
        children.forEach(function(child) {
            child.completed = true;
            child.archivedAt = Date.now();
            archivedToDos.push(child);
        });
```
변경 후:
```js
        children.forEach(function(child) {
            child.completed = true;
            child.archivedAt = Date.now();
            delete child.focused;
            archivedToDos.push(child);
        });
```

기존 코드 (조금 아래):
```js
        toDoItem.completed = true;
        toDoItem.archivedAt = Date.now();
        archivedToDos.push(toDoItem);
```
변경 후:
```js
        toDoItem.completed = true;
        toDoItem.archivedAt = Date.now();
        delete toDoItem.focused;
        archivedToDos.push(toDoItem);
```

- [ ] **Step 2: `completeFromMatrix`에 동일하게 적용**

`completeFromMatrix` 함수 안 두 곳 수정:

기존 (children 루프):
```js
        children.forEach(function(child) {
            child.completed = true;
            child.archivedAt = Date.now();
            archivedToDos.push(child);
        });
```
변경 후:
```js
        children.forEach(function(child) {
            child.completed = true;
            child.archivedAt = Date.now();
            delete child.focused;
            archivedToDos.push(child);
        });
```

기존 (본 항목):
```js
        toDoItem.completed = true;
        toDoItem.archivedAt = Date.now();
        archivedToDos.push(toDoItem);
```
변경 후:
```js
        toDoItem.completed = true;
        toDoItem.archivedAt = Date.now();
        delete toDoItem.focused;
        archivedToDos.push(toDoItem);
```

- [ ] **Step 3: `restoreFromArchive`에서도 안전을 위해 정리**

`restoreFromArchive` 함수, `toDoItem.completed = false; delete toDoItem.archivedAt;` 두 줄 다음에 추가:

```js
        toDoItem.completed = false;
        delete toDoItem.archivedAt;
        delete toDoItem.focused;  // 추가
        toDos.push(toDoItem);
```

children 루프에도 동일하게:

```js
        children.forEach(function(child) {
            child.completed = false;
            delete child.archivedAt;
            delete child.focused;  // 추가
            toDos.push(child);
        });
```

- [ ] **Step 4: `deleteToDo`는 변경 없음 (확인만)**

`deleteToDo`는 `toDos.filter(...)` 로 항목 자체를 배열에서 제거하므로 `focused` 플래그도 자연히 사라진다. **변경 불필요**, 확인 후 다음 단계로.

- [ ] **Step 5: 브라우저로 확인**

새로고침. 절차:
1. 할일 모드에서 항목 A를 ★ 핀 → 일반 체크박스 클릭 (아카이브로 이동)
2. ◉ 몰입 모드 진입 → A가 보이지 않음 (체크 시 정리 동작)
3. 아카이브에서 A를 ↩ 복원 → 다시 ◉ 모드로 가도 A는 표시 **안 됨** (복원 시 핀 해제 확인)
4. 매트릭스 모드 활용: 항목 B를 ★ 핀 + 매트릭스 모드의 q1/q2/q3/q4 사분면 안의 B 체크박스 클릭 → 아카이브로 이동 → 다시 ◉ 모드에서 B 안 보임
5. 항목 C ★ 핀 후 todo 모드에서 🗑 삭제 → ◉ 모드에서도 C 없음 (이건 자동 동작 확인용)

- [ ] **Step 6: 커밋**

```bash
git add js/todo.js
git commit -m "feat(focus): 아카이브/복원 시 focused 플래그 정리"
```

---

### Task 7: 크로스 디바이스 동기화 시 포커스 재렌더링

**Files:**
- Modify: `js/todo.js:1414-1460` (`init()` 함수 안의 `AppStorage.onRemoteChange` 콜백)

- [ ] **Step 1: 콜백 안의 모드 분기에 focus 추가**

`init()` 함수 안에서 `AppStorage.onRemoteChange(function() { ... })` 블록 내부의 모드 재로드 영역을 다음으로 교체:

기존:
```js
        // 모드 다시 로드 (sync 트리거 없이 UI만 갱신)
        var savedMode = AppStorage.get(MODE_LS);
        modeWords.classList.remove("showing");
        modeTodos.classList.remove("showing");
        modeMatrix.classList.remove("showing");
        modePeople.classList.remove("showing");
        if (savedMode === "todos") {
            modeTodos.classList.add("showing");
            modeIcon.textContent = "✦";
        } else if (savedMode === "matrix") {
            modeMatrix.classList.add("showing");
            modeIcon.textContent = "⊞";
            renderMatrix();
        } else if (savedMode === "people") {
            modePeople.classList.add("showing");
            modeIcon.textContent = "👤";
            renderPeopleView();
        } else {
            modeWords.classList.add("showing");
            modeIcon.textContent = "☰";
        }
```

변경 후:
```js
        // 모드 다시 로드 (sync 트리거 없이 UI만 갱신)
        var savedMode = AppStorage.get(MODE_LS);
        modeWords.classList.remove("showing");
        modeTodos.classList.remove("showing");
        modeMatrix.classList.remove("showing");
        modePeople.classList.remove("showing");
        modeFocus.classList.remove("showing");
        document.body.classList.remove("focus-mode");
        if (savedMode === "todos") {
            modeTodos.classList.add("showing");
            modeIcon.textContent = "✦";
        } else if (savedMode === "matrix") {
            modeMatrix.classList.add("showing");
            modeIcon.textContent = "⊞";
            renderMatrix();
        } else if (savedMode === "people") {
            modePeople.classList.add("showing");
            modeIcon.textContent = "👤";
            renderPeopleView();
        } else if (savedMode === "focus") {
            modeFocus.classList.add("showing");
            document.body.classList.add("focus-mode");
            modeIcon.textContent = "◉";
            renderFocus();
        } else {
            modeWords.classList.add("showing");
            modeIcon.textContent = "☰";
        }
```

- [ ] **Step 2: 동일 콜백에서 모드와 별개로 포커스 모드일 때 재렌더 보장**

위 `if/else` 체인이 `savedMode === "focus"` 분기에서 이미 `renderFocus()` 를 호출하므로 추가 작업 불필요. **단**, 매트릭스/사람 모드와 비슷한 패턴으로 콜백 상단 부근 (`renderMatrix()` 호출 직후)에 다음을 추가하여 모드 진입 직전에 데이터가 변하더라도 안전하게 한다:

기존 콜백 상단부에 있는:
```js
        // 매트릭스 모드면 다시 렌더링
        if (modeMatrix.classList.contains("showing")) {
            renderMatrix();
        }

        // 사람 모드면 다시 렌더링
        if (modePeople.classList.contains("showing")) {
            renderPeopleView();
        }
```

직후에 추가:
```js
        // 포커스 모드면 다시 렌더링
        if (modeFocus.classList.contains("showing")) {
            renderFocus();
        }
```

- [ ] **Step 3: 브라우저로 확인 — 로그인 상태에서 2개 탭 사용**

Firebase 로그인이 되어있어야 검증 가능. 절차:
1. 탭 A를 `http://localhost:8080/` 에 열고 Google 로그인 (☁ 클릭)
2. 탭 B를 같은 URL로 추가로 열기 (자동 로그인 됨)
3. 탭 A: 할일 모드에서 항목 D를 ★ 핀
4. 약 1~2초 후 탭 B를 보면 같은 D 항목에 ★ 표시가 자동으로 들어옴
5. 탭 A: ◉ 모드로 전환
6. 약 1~2초 후 탭 B도 자동으로 ◉ 모드로 전환되며 D가 큰 글씨로 표시됨
7. 탭 B: D 체크 → 아카이브 이동
8. 약 1~2초 후 탭 A에서도 D가 포커스 리스트에서 사라짐

로그인 없이 검증하려면 DevTools 콘솔에서 `localStorage.setItem('toDos', '...')` 후 `window.AppStorage._notifyChange()` 호출하여 콜백을 강제 실행할 수 있다.

- [ ] **Step 4: 커밋**

```bash
git add js/todo.js
git commit -m "feat(focus): 크로스 디바이스 동기화 시 포커스 뷰 재렌더링"
```

---

### Task 8: 전체 시나리오 회귀 검증 + 빈 상태 회귀

**Files:** 변경 없음 — 통합 검증만.

- [ ] **Step 1: 신선한 localStorage로 빈 상태 검증**

브라우저 DevTools → Application → Local Storage → `localhost:8080` 의 `toDos`, `toDosArchive`, `viewMode` 키 삭제 후 새로고침.
1. 이름 입력 → 인사말 표시
2. 모드 토글 5번 눌러 ◉ 진입
3. **Expected**: "몰입할 항목에 ★를 눌러보세요" 빈 상태 메시지 + 인사말 + 시계만 표시. 위젯(햄버거/날씨/동기화)은 모두 숨김.
4. 모드 토글 1번 더 → ☰ 로 복귀, 위젯들 다시 표시

- [ ] **Step 2: 회귀 검증 — 기존 4개 모드가 망가지지 않았는지 확인**

신규 localStorage 상태에서 항목 3개 추가 (그중 1개는 `@0520 미팅 @영희` 같은 마감일+담당자 포함).
1. ☰ 모드 → 명언이 표시됨
2. ✦ 모드 → 할일 목록 정상, D-Day 배지와 담당자 배지 정상
3. ⊞ 모드 → 매트릭스 4분면 + 백로그에 항목들 분포
4. 👤 모드 → @영희 카드 표시, 클릭 시 영희의 할일 표시
5. ◉ 모드 → 핀된 항목만 표시 (이전 단계에서 1개 ★ 핀했다면 1개만)

- [ ] **Step 3: 회귀 검증 — Firebase 동기화 (선택, 로그인 가능한 경우)**

탭 A 로그인 → 항목 + 핀 + 모드 변경 → 시크릿창 탭 B 같은 계정 로그인 → 모든 상태가 자동 복원되는지 확인. 핀 상태 / `viewMode=focus` 모두 동기화되어야 함.

- [ ] **Step 4: 최종 커밋 — 회귀 검증 통과 표식**

만약 회귀 검증 중 작은 수정이 발생했다면:

```bash
git add -A
git commit -m "fix(focus): 회귀 검증에서 발견된 이슈 수정"
```

수정 사항이 없으면 이 단계는 건너뛴다.

---

## 완료 후 체크리스트 (스펙 성공 기준 매핑)

스펙의 8개 성공 기준이 모두 통과되어야 한다:

- [ ] 일반 todo 항목 옆 ☆/★ 버튼이 보이고 클릭 시 토글된다. (Task 3)
- [ ] 모드 토글 5번째 위치에서 포커스 모드로 진입 가능하다. (Task 2)
- [ ] 포커스 모드 진입 시 인사말/위젯/메뉴가 모두 숨겨지고 시계와 인사말만 남는다. (Task 5)
- [ ] 핀된 항목만 큰 글씨로 표시된다. (Task 4, 5)
- [ ] 체크 시 즉시 아카이브로 이동하고 포커스 목록에서 사라진다. (Task 4)
- [ ] 핀 상태가 새로고침/재접속 후에도 유지된다. (Task 3)
- [ ] 다른 기기 로그인 시 핀 상태와 `viewMode=focus`가 동기화된다. (Task 7)
- [ ] 핀된 항목이 0개일 때 빈 상태 안내문이 표시된다. (Task 4, 5)
