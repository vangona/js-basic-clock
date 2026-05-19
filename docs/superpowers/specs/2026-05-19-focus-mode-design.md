# 몰입 모드 (Focus Mode) — Design Spec

**Date:** 2026-05-19
**Author:** vincent
**Status:** Draft

## 목적

핀(★)한 할일만 큰 글씨로 보여주는 미니멀 뷰. 사용자가 "지금 집중할 것"을 선언적으로 정의하고, 나머지 UI 노이즈(인사말은 제외 — 분위기 유지)를 숨겨 화면을 비운다.

기존 4개 모드(`words` / `todos` / `matrix` / `people`)에 5번째 모드로 추가한다.

## 사용자 시나리오

1. 사용자가 일반 todo 뷰에서 오늘 집중할 항목 옆의 별(☆)을 누른다 → 별이 채워진다(★) → `focused: true` 플래그가 저장된다.
2. 모드 토글 버튼을 ◉가 나올 때까지 누른다 → 화면이 비워지고 핀된 항목만 큰 글씨로 표시된다.
3. 항목을 완료하면 체크 → 즉시 아카이브로 이동, 포커스 목록에서 사라진다.
4. 모든 항목 완료 시 빈 상태 안내문이 표시된다.
5. 다른 기기에서 같은 계정으로 접속하면 핀 상태와 포커스 모드가 그대로 동기화된다 (기존 Firestore 동기화 흐름 활용).

## 데이터 모델

`todo` 객체에 옵션 필드 1개 추가:

```js
{
  id, text, completed, createdAt,   // 기존
  parentId?, urgent?, important?,    // 기존
  assignees?, dueDate?, description?,// 기존
  focused?: true                     // 신규 — true일 때만 존재, 해제 시 delete
}
```

설계 결정:
- **신규 동기화 키 없음.** `toDos`가 이미 `SYNC_KEYS`에 있으므로 `focused` 플래그는 별도 작업 없이 Firestore에 함께 저장/복원된다.
- **하위 할일은 핀 불가.** 핀 버튼은 최상위 할일 paint 분기(`!toDoObj.parentId`)에만 추가한다. 단순화 우선.
- **아카이브 시 `focused` 보존하지 않음.** `toggleComplete` / `completeFromMatrix` 안에서 `delete toDoItem.focused` 호출. 복원(`restoreFromArchive`) 시에도 false 유지 — 복원 후 다시 핀하는 게 자연스럽다.

## UI 변경

### 1. 모드 토글 사이클 확장 (`todo.js:setMode`, `toggleMode`)

```
words → todos → matrix → people → focus → words
☰      → ✦    → ⊞      → 👤    → ◉    → ☰
```

`viewMode` localStorage 값에 `"focus"` 추가. 이미 `viewMode`는 동기화되므로 별도 작업 불필요.

### 2. 포커스 패널 (`index.html`)

`mode-people` 뒤에 추가:

```html
<div class="mode-panel mode-focus js-modeFocus">
  <ul class="focus-list js-focusList"></ul>
  <p class="focus-empty js-focusEmpty">몰입할 항목에 ★를 눌러보세요</p>
</div>
```

### 3. 핀 버튼 (todo 항목 내부)

`paintToDo` 안, 최상위 할일에만, `btn-add-assignee` 와 `btn-delete` 사이에 추가:

```html
<button class="btn-focus" title="몰입 모드에 추가">☆</button>
```

핀된 상태일 때:
- 버튼 텍스트 `★`
- `btn-focus--active` 클래스 부여 (CSS로 색상 강조)

클릭 시 `toDoItem.focused = true` 또는 `delete toDoItem.focused` 토글 → `saveToDos()` → 버튼 시각 상태 갱신.

### 4. 포커스 리스트 렌더링 (`renderFocus()` 신설)

체크박스 + 텍스트만 (배지, 담당자, D-Day, 진입버튼, 삭제버튼, 핀버튼 모두 생략):

```html
<li class="focus-item" id="...">
  <label class="todo-label">
    <input type="checkbox" class="todo-checkbox">
  </label>
  <span class="focus-text">분기 보고서 마무리</span>
</li>
```

체크 → `toggleComplete`와 동일 흐름(아카이브 이동) + 포커스 목록에서 즉시 제거.

빈 상태 (핀된 항목이 0개): `.js-focusEmpty` 노출.

### 5. CSS — 미니멀 뷰

`body.focus-mode` 클래스를 `setMode("focus")`에서 토글. 다음 요소들을 숨김:

```css
body.focus-mode .js-form,          /* 이름 폼 */
body.focus-mode .archive-menu,     /* 좌상단 아카이브 햄버거 */
body.focus-mode .js-weather,       /* 우상단 날씨 */
body.focus-mode .sync-status       /* 좌하단 동기화 버튼 */
{ display: none; }
```

유지되는 요소: 배경 사진, 시계, **인사말**, 모드 토글 버튼, `.mode-focus` 패널.

포커스 리스트 스타일은 큰 글씨(예: 1.5rem) + 중앙 정렬 + 항목 사이 넉넉한 간격 — `.goodwords` 의 미감을 차용한다. `.content-box`는 폭이 좁고 리사이즈 가능하므로 그 안에 맞게 줄바꿈/스크롤되어야 한다.

## 데이터 흐름

```
[사용자가 ★ 클릭]
    → toDoItem.focused = true
    → saveToDos()                    // localStorage + AppStorage.set
    → AppStorage.set                 // SYNC_KEYS 매치 → syncTimer 시작
    → 1초 debounce 후 Firestore 쓰기

[다른 기기에서 onSnapshot 발화]
    → safeSetTodos("toDos", ...)
    → AppStorage._notifyChange()
    → todo.js의 onRemoteChange 콜백
    → renderCurrentView() / renderMatrix() / renderPeopleView()
    → ★ 추가: renderFocus() 도 호출되도록 콜백 확장
```

## 영향받는 파일

| 파일 | 변경 |
|---|---|
| `index.html` | `.mode-focus` 패널 추가 (4번 위치) |
| `js/todo.js` | `setMode`/`toggleMode`/`loadMode` 확장, `paintToDo`에 핀 버튼 추가, `togglePin()`, `renderFocus()`, `paintFocusItem()` 신설, `toggleComplete`/`completeFromMatrix`/`restoreFromArchive`에 `delete focused`, `onRemoteChange` 콜백에 포커스 렌더 추가 |
| `css/index.css` | `.mode-focus`, `.focus-list`, `.focus-item`, `.focus-text`, `.focus-empty`, `.btn-focus`, `.btn-focus--active`, `body.focus-mode .X { display:none }` 규칙 추가 |

## 엣지 케이스

1. **핀된 항목이 0개인 상태로 모드 진입** → 빈 상태 안내문만 표시. 모드는 유지(사용자가 다시 todo 모드로 가서 핀할 수 있도록).
2. **핀된 항목을 아카이브에서 복원** → `focused` 보존하지 않음 (위 설계 결정 참조).
3. **핀된 항목을 todo 모드에서 직접 삭제** → 자동으로 포커스 목록에서도 사라짐 (재렌더링 시 자연스럽게 처리).
4. **하위 할일** → 핀 버튼 노출 안 함. 최상위만 가능.
5. **포커스 모드에서 새 todo 추가** → 입력 폼 자체가 `.mode-focus` 패널 밖이고 패널 안에는 입력 폼이 없음. 추가는 todo 모드에서만.
6. **다른 기기와 동시 핀/해제 충돌** → 마지막 쓰기 승. 기존 `lastModified` 타임스탬프 흐름 그대로.

## 명시적으로 안 하는 것 (YAGNI)

- 핀 항목 순서 정렬 (드래그앤드롭) — 기존 `toDos` 배열 순서를 그대로 사용.
- 포커스 모드 전용 키보드 단축키.
- 포커스 모드에서 todo 편집/설명 펼치기.
- 자동 핀 (예: 마감일 D-Day인 항목 자동 표시).
- "원샷 모드" (한 번에 하나씩 슬라이드쇼) — 사용자가 리스트 방식 선택.
- 시계/인사말 흐림 처리 — 우선 그대로 두고, 시각적으로 부담되면 후속 작업.

## 성공 기준

- [ ] 일반 todo 항목 옆 ☆/★ 버튼이 보이고 클릭 시 토글된다.
- [ ] 모드 토글 5번째 위치에서 포커스 모드로 진입 가능하다.
- [ ] 포커스 모드 진입 시 인사말/위젯/메뉴가 모두 숨겨지고 시계와 인사말만 남는다.
- [ ] 핀된 항목만 큰 글씨로 표시된다.
- [ ] 체크 시 즉시 아카이브로 이동하고 포커스 목록에서 사라진다.
- [ ] 핀 상태가 새로고침/재접속 후에도 유지된다.
- [ ] 다른 기기 로그인 시 핀 상태와 `viewMode=focus`가 동기화된다.
- [ ] 핀된 항목이 0개일 때 빈 상태 안내문이 표시된다.
