const toDoForm = document.querySelector(".js-toDoForm"),
    toDoInput = toDoForm.querySelector("input"),
    toDoList = document.querySelector(".js-toDoList"),
    archiveList = document.querySelector(".js-archiveList"),
    archiveToggleBtn = document.querySelector(".js-archiveToggle"),
    archivePanel = document.querySelector(".js-archivePanel"),
    archiveEmpty = document.querySelector(".js-archiveEmpty"),
    modeBtn = document.querySelector(".js-modeBtn"),
    modeIcon = document.querySelector(".js-modeIcon"),
    modeWords = document.querySelector(".js-modeWords"),
    modeTodos = document.querySelector(".js-modeTodos"),
    contentBox = document.querySelector(".js-contentBox");

const TODOS_LS = "toDos";
const ARCHIVE_LS = "toDosArchive";
const MODE_LS = "viewMode";
const BOX_SIZE_LS = "contentBoxSize";

let toDos = [];
let archivedToDos = [];
let draggedItem = null;

// UUID 생성 함수
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// localStorage 저장
function saveToDos() {
    localStorage.setItem(TODOS_LS, JSON.stringify(toDos));
}

function saveArchive() {
    localStorage.setItem(ARCHIVE_LS, JSON.stringify(archivedToDos));
}

// 할 일 삭제
function deleteToDo(event) {
    const btn = event.target;
    const li = btn.closest("li");
    const parentList = li.parentNode;

    parentList.removeChild(li);

    // 활성 목록에서 삭제인지 아카이브에서 삭제인지 확인
    if (parentList === toDoList) {
        toDos = toDos.filter(toDo => toDo.id !== li.id);
        saveToDos();
    } else {
        archivedToDos = archivedToDos.filter(toDo => toDo.id !== li.id);
        saveArchive();
        archiveEmpty.classList.toggle("showing", archivedToDos.length === 0);
    }
}

// 아카이브에서 부활
function restoreFromArchive(event) {
    const btn = event.target;
    const li = btn.closest("li");
    const toDoItem = archivedToDos.find(toDo => toDo.id === li.id);

    if (toDoItem) {
        // 아카이브에서 제거
        archivedToDos = archivedToDos.filter(toDo => toDo.id !== li.id);
        archiveList.removeChild(li);

        // 활성 목록에 추가
        toDoItem.completed = false;
        delete toDoItem.archivedAt;
        toDos.push(toDoItem);
        paintToDo(toDoItem);

        saveToDos();
        saveArchive();
        archiveEmpty.classList.toggle("showing", archivedToDos.length === 0);
    }
}

// 완료 → 즉시 아카이브
function toggleComplete(event) {
    const checkbox = event.target;
    const li = checkbox.closest("li");
    const toDoItem = toDos.find(toDo => toDo.id === li.id);

    if (toDoItem && checkbox.checked) {
        // 활성 목록에서 제거
        toDos = toDos.filter(toDo => toDo.id !== li.id);
        toDoList.removeChild(li);

        // 아카이브로 이동
        toDoItem.completed = true;
        toDoItem.archivedAt = Date.now();
        archivedToDos.push(toDoItem);

        saveToDos();
        saveArchive();
        renderArchive();

        // 햄버거 버튼 흔들림으로 아카이브 알림
        archiveToggleBtn.classList.remove("shake");
        void archiveToggleBtn.offsetWidth;
        archiveToggleBtn.classList.add("shake");
        archiveToggleBtn.addEventListener("animationend", function() {
            archiveToggleBtn.classList.remove("shake");
        }, { once: true });
    }
}

// 드래그앤드롭 핸들러
function handleDragStart(event) {
    draggedItem = event.target;
    event.target.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
}

function handleDragEnd(event) {
    event.target.classList.remove("dragging");
    document.querySelectorAll(".drag-over").forEach(el => el.classList.remove("drag-over"));
    draggedItem = null;
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const li = event.target.closest("li");
    if (li && li !== draggedItem && li.parentNode === toDoList) {
        document.querySelectorAll(".drag-over").forEach(el => el.classList.remove("drag-over"));
        li.classList.add("drag-over");
    }
}

function handleDrop(event) {
    event.preventDefault();
    const li = event.target.closest("li");

    if (li && li !== draggedItem && li.parentNode === toDoList) {
        // DOM 순서 변경
        const allItems = [...toDoList.children];
        const draggedIndex = allItems.indexOf(draggedItem);
        const targetIndex = allItems.indexOf(li);

        if (draggedIndex < targetIndex) {
            li.parentNode.insertBefore(draggedItem, li.nextSibling);
        } else {
            li.parentNode.insertBefore(draggedItem, li);
        }

        // 배열 순서 변경
        const newOrder = [...toDoList.children].map(child => child.id);
        toDos.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
        saveToDos();
    }

    document.querySelectorAll(".drag-over").forEach(el => el.classList.remove("drag-over"));
}

// 할 일 항목 렌더링
function paintToDo(toDoObj, isArchived = false) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.innerText = toDoObj.text;
    span.className = "todo-text";

    li.className = "things";
    li.id = toDoObj.id;

    if (!isArchived) {
        // 활성 목록용 UI
        const checkbox = document.createElement("input");
        const label = document.createElement("label");
        const deleteBtn = document.createElement("button");

        // 체크박스
        checkbox.type = "checkbox";
        checkbox.className = "todo-checkbox";
        checkbox.id = "check-" + toDoObj.id;
        checkbox.checked = toDoObj.completed;
        checkbox.addEventListener("change", toggleComplete);

        // 라벨 (checkbox가 label 내부에 있으므로 htmlFor 불필요)
        label.className = "todo-label";

        // 삭제 버튼
        deleteBtn.innerText = "🗑";
        deleteBtn.className = "btn-delete";
        deleteBtn.title = "삭제";
        deleteBtn.addEventListener("click", deleteToDo);

        // 순서: 체크박스 → 텍스트 → 삭제버튼
        label.appendChild(checkbox);
        li.appendChild(label);
        li.appendChild(span);
        li.appendChild(deleteBtn);

        // 완료 상태 반영
        if (toDoObj.completed) {
            li.classList.add("todo-item--completed");
        }

        // 드래그 가능
        li.draggable = true;
        li.addEventListener("dragstart", handleDragStart);
        li.addEventListener("dragend", handleDragEnd);
        li.addEventListener("dragover", handleDragOver);
        li.addEventListener("drop", handleDrop);
        toDoList.appendChild(li);
    } else {
        // 아카이브용 UI (부활 버튼 + 삭제 버튼)
        const restoreBtn = document.createElement("button");
        const deleteBtn = document.createElement("button");

        restoreBtn.innerText = "↩";
        restoreBtn.className = "btn-restore";
        restoreBtn.title = "할일 목록으로 복원";
        restoreBtn.addEventListener("click", restoreFromArchive);

        deleteBtn.innerText = "🗑";
        deleteBtn.className = "btn-delete";
        deleteBtn.title = "완전 삭제";
        deleteBtn.addEventListener("click", deleteToDo);

        li.appendChild(span);
        li.appendChild(restoreBtn);
        li.appendChild(deleteBtn);
        li.classList.add("todo-item--completed");
        archiveList.appendChild(li);
    }
}

// 새 할 일 추가
function handleSubmit(event) {
    event.preventDefault();
    const currentValue = toDoInput.value.trim();

    if (currentValue === "") return;

    const toDoObj = {
        text: currentValue,
        id: generateId(),
        completed: false,
        createdAt: Date.now()
    };

    toDos.push(toDoObj);
    paintToDo(toDoObj);
    saveToDos();
    toDoInput.value = "";
}

// 아카이브 리스트 비우기 (안전한 방법)
function clearArchiveList() {
    while (archiveList.firstChild) {
        archiveList.removeChild(archiveList.firstChild);
    }
}

// 아카이브 렌더링
function renderArchive() {
    clearArchiveList();
    archivedToDos.forEach(toDo => paintToDo(toDo, true));

    // 비어있으면 메시지 표시
    archiveEmpty.classList.toggle("showing", archivedToDos.length === 0);
}

// 아카이브 패널 토글
function toggleArchivePanel() {
    archivePanel.classList.toggle("showing");
    archiveToggleBtn.classList.toggle("active");
}

// 모드 전환 (명언 ↔ 할일)
function toggleMode() {
    const isWordsMode = modeWords.classList.contains("showing");

    if (isWordsMode) {
        // 할일 모드로 전환
        modeWords.classList.remove("showing");
        modeTodos.classList.add("showing");
        modeIcon.textContent = "✦";
        localStorage.setItem(MODE_LS, "todos");
    } else {
        // 명언 모드로 전환
        modeTodos.classList.remove("showing");
        modeWords.classList.add("showing");
        modeIcon.textContent = "☰";
        localStorage.setItem(MODE_LS, "words");
    }
}

// 저장된 모드 로드
function loadMode() {
    const savedMode = localStorage.getItem(MODE_LS);
    if (savedMode === "todos") {
        modeWords.classList.remove("showing");
        modeTodos.classList.add("showing");
        modeIcon.textContent = "✦";
    }
}

// 초기 로드
function loadToDos() {
    const loadedToDos = localStorage.getItem(TODOS_LS);
    const loadedArchive = localStorage.getItem(ARCHIVE_LS);

    if (loadedToDos !== null) {
        toDos = JSON.parse(loadedToDos);
        toDos.forEach(toDo => paintToDo(toDo));
    }

    if (loadedArchive !== null) {
        archivedToDos = JSON.parse(loadedArchive);
        renderArchive();
    }
}

// 컨텐츠 박스 크기 저장/복원
function loadBoxSize() {
    const saved = localStorage.getItem(BOX_SIZE_LS);
    if (saved) {
        const { width, height } = JSON.parse(saved);
        contentBox.style.width = width + "px";
        contentBox.style.height = height + "px";
    }
}

function initBoxResize() {
    let resizeTimer;
    const observer = new ResizeObserver(function(entries) {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            const { width, height } = entries[0].contentRect;
            localStorage.setItem(BOX_SIZE_LS, JSON.stringify({ width, height }));
        }, 300);
    });
    observer.observe(contentBox);
}

// 아카이브 패널 외부 클릭 시 닫기
function initArchiveOutsideClick() {
    document.addEventListener("click", function(event) {
        const isInsideArchive = event.target.closest(".archive-menu");
        if (!isInsideArchive && archivePanel.classList.contains("showing")) {
            archivePanel.classList.remove("showing");
            archiveToggleBtn.classList.remove("active");
        }
    });
}

function init() {
    loadToDos();
    loadMode();
    loadBoxSize();
    initBoxResize();
    initArchiveOutsideClick();
    toDoForm.addEventListener("submit", handleSubmit);
    archiveToggleBtn.addEventListener("click", toggleArchivePanel);
    modeBtn.addEventListener("click", toggleMode);
}

init();
