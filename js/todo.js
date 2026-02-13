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
    contentBox = document.querySelector(".js-contentBox"),
    archiveDetailBtn = document.querySelector(".js-archiveDetail"),
    archiveModal = document.querySelector(".js-archiveModal"),
    archiveModalClose = document.querySelector(".js-archiveModalClose"),
    tabTimeline = document.querySelector(".js-tabTimeline"),
    tabCalendar = document.querySelector(".js-tabCalendar"),
    archiveTimelineView = document.querySelector(".js-archiveTimeline"),
    archiveCalendarView = document.querySelector(".js-archiveCalendar"),
    calGrid = document.querySelector(".js-calGrid"),
    calTitle = document.querySelector(".js-calTitle"),
    calPrev = document.querySelector(".js-calPrev"),
    calNext = document.querySelector(".js-calNext"),
    calDayItems = document.querySelector(".js-calDayItems"),
    dateByCreatedBtn = document.querySelector(".js-dateByCreated"),
    dateByArchivedBtn = document.querySelector(".js-dateByArchived");

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

// 날짜 포맷 헬퍼
function formatDate(timestamp) {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    return (d.getMonth() + 1).toString().padStart(2, "0") + "." + d.getDate().toString().padStart(2, "0");
}

function getDaysDiff(from, to) {
    if (!from || !to) return null;
    const diff = Math.floor((to - from) / (1000 * 60 * 60 * 24));
    return diff;
}

// 설명 토글
function toggleDescription(event) {
    const span = event.target;
    const li = span.closest("li");
    const existing = li.querySelector(".todo-description");

    if (existing) {
        existing.remove();
        return;
    }

    const toDoItem = toDos.find(toDo => toDo.id === li.id);
    if (!toDoItem) return;

    const textarea = document.createElement("textarea");
    textarea.className = "todo-description";
    textarea.placeholder = "설명을 입력하세요...";
    textarea.value = toDoItem.description || "";
    textarea.rows = 2;

    textarea.addEventListener("blur", function() {
        toDoItem.description = textarea.value;
        saveToDos();
        // 인디케이터 업데이트
        const indicator = li.querySelector(".todo-desc-indicator");
        if (textarea.value) {
            if (!indicator) {
                const ind = document.createElement("span");
                ind.className = "todo-desc-indicator";
                ind.textContent = "...";
                span.after(ind);
            }
        } else {
            if (indicator) indicator.remove();
        }
    });

    textarea.addEventListener("keydown", function(e) {
        if (e.key === "Escape") {
            textarea.blur();
            existing && existing.remove();
        }
    });

    li.appendChild(textarea);
    textarea.focus();
}

// 할 일 항목 렌더링
function paintToDo(toDoObj, isArchived = false, prepend = false) {
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

        // 텍스트 클릭 시 설명 토글
        span.addEventListener("click", toggleDescription);
        span.style.cursor = "pointer";

        // 순서: 체크박스 → 텍스트 → 설명 인디케이터 → 삭제버튼
        label.appendChild(checkbox);
        li.appendChild(label);
        li.appendChild(span);

        // 설명이 있으면 인디케이터 표시
        if (toDoObj.description) {
            const indicator = document.createElement("span");
            indicator.className = "todo-desc-indicator";
            indicator.textContent = "...";
            li.appendChild(indicator);
        }

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
        if (prepend && toDoList.firstChild) {
            toDoList.insertBefore(li, toDoList.firstChild);
        } else {
            toDoList.appendChild(li);
        }
    } else {
        // 아카이브용 UI (날짜 + 부활 버튼 + 삭제 버튼)
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

        // 텍스트 + 날짜 wrapper
        const infoWrapper = document.createElement("div");
        infoWrapper.className = "archive-info";
        infoWrapper.appendChild(span);

        // 날짜 표시
        if (toDoObj.createdAt || toDoObj.archivedAt) {
            const dateSpan = document.createElement("span");
            dateSpan.className = "archive-date";
            const created = formatDate(toDoObj.createdAt);
            const archived = formatDate(toDoObj.archivedAt);
            const days = getDaysDiff(toDoObj.createdAt, toDoObj.archivedAt);

            let dateText = "";
            if (created && archived) {
                dateText = created + " → " + archived;
                if (days !== null) {
                    dateText += days === 0 ? " (당일)" : " (" + days + "일)";
                }
            } else if (archived) {
                dateText = "완료: " + archived;
            } else if (created) {
                dateText = "추가: " + created;
            }
            dateSpan.textContent = dateText;
            infoWrapper.appendChild(dateSpan);
        }

        // 아카이브에서 설명이 있으면 읽기 전용 표시
        if (toDoObj.description) {
            const descSpan = document.createElement("span");
            descSpan.className = "archive-description";
            descSpan.textContent = toDoObj.description;
            infoWrapper.appendChild(descSpan);
        }

        li.appendChild(infoWrapper);
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

    toDos.unshift(toDoObj);
    paintToDo(toDoObj, false, true);
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

// ===== 아카이브 상세 모달 =====
let calendarDate = new Date();
let dateMode = "createdAt"; // "createdAt" or "archivedAt"

function getDateKey(item) {
    const ts = item[dateMode];
    return ts ? new Date(ts).toLocaleDateString("ko-KR") : "날짜 없음";
}

function getTimestamp(item) {
    return item[dateMode] || 0;
}

function switchDateMode(mode) {
    dateMode = mode;
    if (mode === "createdAt") {
        dateByCreatedBtn.classList.add("active");
        dateByArchivedBtn.classList.remove("active");
    } else {
        dateByArchivedBtn.classList.add("active");
        dateByCreatedBtn.classList.remove("active");
    }
    // 현재 활성 탭 다시 렌더링
    if (tabTimeline.classList.contains("active")) {
        renderTimeline();
    } else {
        renderCalendar();
    }
}

function openArchiveModal() {
    archivePanel.classList.remove("showing");
    archiveToggleBtn.classList.remove("active");
    archiveModal.classList.add("showing");
    renderTimeline();
}

function closeArchiveModal() {
    archiveModal.classList.remove("showing");
}

function switchTab(tab) {
    if (tab === "timeline") {
        tabTimeline.classList.add("active");
        tabCalendar.classList.remove("active");
        archiveTimelineView.style.display = "";
        archiveCalendarView.style.display = "none";
        renderTimeline();
    } else {
        tabCalendar.classList.add("active");
        tabTimeline.classList.remove("active");
        archiveCalendarView.style.display = "";
        archiveTimelineView.style.display = "none";
        renderCalendar();
    }
}

// 타임라인 뷰
function renderTimeline() {
    archiveTimelineView.innerHTML = "";

    if (archivedToDos.length === 0) {
        archiveTimelineView.innerHTML = '<p class="timeline-empty">보관된 항목이 없습니다</p>';
        return;
    }

    // 날짜별 그룹핑 (dateMode 기준, 최신순)
    const groups = {};
    archivedToDos.forEach(function(item) {
        const dateKey = getDateKey(item);
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(item);
    });

    // 최신순 정렬
    const sortedKeys = Object.keys(groups).sort(function(a, b) {
        if (a === "날짜 없음") return 1;
        if (b === "날짜 없음") return -1;
        const da = getTimestamp(groups[a][0]);
        const db = getTimestamp(groups[b][0]);
        return db - da;
    });

    sortedKeys.forEach(function(dateKey) {
        const section = document.createElement("div");
        section.className = "timeline-section";

        const header = document.createElement("div");
        header.className = "timeline-date-header";
        header.textContent = dateKey;
        section.appendChild(header);

        groups[dateKey].forEach(function(item) {
            const card = document.createElement("div");
            card.className = "timeline-card";

            const title = document.createElement("div");
            title.className = "timeline-card-title";
            title.textContent = item.text;
            card.appendChild(title);

            // 기간 정보
            if (item.createdAt || item.archivedAt) {
                const meta = document.createElement("div");
                meta.className = "timeline-card-meta";
                const created = formatDate(item.createdAt);
                const archived = formatDate(item.archivedAt);
                const days = getDaysDiff(item.createdAt, item.archivedAt);
                let metaText = "";
                if (created && archived) {
                    metaText = created + " → " + archived;
                    if (days !== null) metaText += days === 0 ? " (당일)" : " (" + days + "일)";
                } else if (created) {
                    metaText = "추가: " + created;
                }
                meta.textContent = metaText;
                card.appendChild(meta);
            }

            // 설명
            if (item.description) {
                const desc = document.createElement("div");
                desc.className = "timeline-card-desc";
                desc.textContent = item.description;
                card.appendChild(desc);
            }

            section.appendChild(card);
        });

        archiveTimelineView.appendChild(section);
    });
}

// 캘린더 뷰
function renderCalendar() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    calTitle.textContent = year + "년 " + (month + 1) + "월";

    // 해당 월의 아카이브 날짜 맵 생성 (dateMode 기준)
    const archiveDays = {};
    archivedToDos.forEach(function(item) {
        const ts = item[dateMode];
        if (!ts) return;
        const d = new Date(ts);
        if (d.getFullYear() === year && d.getMonth() === month) {
            const day = d.getDate();
            if (!archiveDays[day]) archiveDays[day] = [];
            archiveDays[day].push(item);
        }
    });

    // 달력 그리드
    calGrid.innerHTML = "";
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    // 빈 셀 (첫째 주 앞)
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement("div");
        empty.className = "calendar-cell empty";
        calGrid.appendChild(empty);
    }

    // 날짜 셀
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        cell.textContent = d;

        if (archiveDays[d]) {
            cell.classList.add("has-items");
            const dot = document.createElement("span");
            dot.className = "calendar-dot";
            cell.appendChild(dot);
        }

        if (year === today.getFullYear() && month === today.getMonth() && d === today.getDate()) {
            cell.classList.add("today");
        }

        cell.addEventListener("click", function() {
            // 선택 상태 토글
            calGrid.querySelectorAll(".selected").forEach(function(el) { el.classList.remove("selected"); });
            cell.classList.add("selected");
            renderCalendarDayItems(year, month, d);
        });

        calGrid.appendChild(cell);
    }

    calDayItems.innerHTML = "";
}

function renderCalendarDayItems(year, month, day) {
    calDayItems.innerHTML = "";

    const items = archivedToDos.filter(function(item) {
        const ts = item[dateMode];
        if (!ts) return false;
        const d = new Date(ts);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

    if (items.length === 0) {
        calDayItems.innerHTML = '<p class="cal-day-empty">이 날의 항목이 없습니다</p>';
        return;
    }

    const header = document.createElement("div");
    header.className = "cal-day-header";
    header.textContent = (month + 1) + "월 " + day + "일 (" + items.length + "건)";
    calDayItems.appendChild(header);

    items.forEach(function(item) {
        const card = document.createElement("div");
        card.className = "timeline-card";

        const title = document.createElement("div");
        title.className = "timeline-card-title";
        title.textContent = item.text;
        card.appendChild(title);

        if (item.createdAt) {
            const meta = document.createElement("div");
            meta.className = "timeline-card-meta";
            const days = getDaysDiff(item.createdAt, item.archivedAt);
            let metaText = "추가: " + formatDate(item.createdAt);
            if (days !== null) metaText += days === 0 ? " (당일 완료)" : " (" + days + "일 소요)";
            meta.textContent = metaText;
            card.appendChild(meta);
        }

        if (item.description) {
            const desc = document.createElement("div");
            desc.className = "timeline-card-desc";
            desc.textContent = item.description;
            card.appendChild(desc);
        }

        calDayItems.appendChild(card);
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

    // 아카이브 모달 이벤트
    archiveDetailBtn.addEventListener("click", openArchiveModal);
    archiveModalClose.addEventListener("click", closeArchiveModal);
    archiveModal.addEventListener("click", function(e) {
        if (e.target === archiveModal) closeArchiveModal();
    });
    tabTimeline.addEventListener("click", function() { switchTab("timeline"); });
    tabCalendar.addEventListener("click", function() { switchTab("calendar"); });
    calPrev.addEventListener("click", function() {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        renderCalendar();
    });
    calNext.addEventListener("click", function() {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        renderCalendar();
    });
    dateByCreatedBtn.addEventListener("click", function() { switchDateMode("createdAt"); });
    dateByArchivedBtn.addEventListener("click", function() { switchDateMode("archivedAt"); });
}

init();
