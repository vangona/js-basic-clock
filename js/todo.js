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
    dateByArchivedBtn = document.querySelector(".js-dateByArchived"),
    modeMatrix = document.querySelector(".js-modeMatrix"),
    matrixCells = document.querySelectorAll(".js-matrixCell"),
    matrixLists = document.querySelectorAll(".js-matrixList"),
    todoNavBar = document.querySelector(".js-todoNavBar"),
    todoNavBack = document.querySelector(".js-todoNavBack"),
    todoNavTitle = document.querySelector(".js-todoNavTitle"),
    modePeople = document.querySelector(".js-modePeople"),
    peopleListDiv = document.querySelector(".js-peopleList"),
    peopleTodosDiv = document.querySelector(".js-peopleTodos"),
    peopleBack = document.querySelector(".js-peopleBack"),
    peopleName = document.querySelector(".js-peopleName"),
    peopleTodoList = document.querySelector(".js-peopleTodoList"),
    modeFocus = document.querySelector(".js-modeFocus"),
    focusList = document.querySelector(".js-focusList"),
    focusEmpty = document.querySelector(".js-focusEmpty");

const TODOS_LS = "toDos";
const ARCHIVE_LS = "toDosArchive";
const MODE_LS = "viewMode";
const BOX_SIZE_LS = "contentBoxSize";

let toDos = [];
let archivedToDos = [];
let draggedItem = null;
let currentParentId = null;

// UUID 생성 함수
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 텍스트 파싱: @MMDD 또는 @YYYYMMDD → 마감일
function parseDueDate(text) {
    var match = text.match(/@(\d{8})\b|@(\d{4})\b/);
    if (!match) return { cleanText: text, dueDate: null };

    var digits = match[1] || match[2];
    var year, month, day;

    if (digits.length === 8) {
        year = parseInt(digits.substring(0, 4), 10);
        month = parseInt(digits.substring(4, 6), 10) - 1;
        day = parseInt(digits.substring(6, 8), 10);
    } else {
        month = parseInt(digits.substring(0, 2), 10) - 1;
        day = parseInt(digits.substring(2, 4), 10);
        year = new Date().getFullYear();
        var candidate = new Date(year, month, day);
        var twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        if (candidate < twoMonthsAgo) year++;
    }

    var date = new Date(year, month, day);
    if (isNaN(date.getTime()) || date.getMonth() !== month) {
        return { cleanText: text, dueDate: null };
    }

    var cleanText = text.replace(match[0], "").replace(/\s{2,}/g, " ").trim();
    return { cleanText: cleanText, dueDate: date.getTime() };
}

// 텍스트 파싱: @이름 → 담당자
function parseAssignees(text) {
    var regex = /@([가-힣a-zA-Z][^\s@]{0,9})/g;
    var assignees = [];
    var m;
    while ((m = regex.exec(text)) !== null) {
        if (assignees.indexOf(m[1]) === -1) assignees.push(m[1]);
    }
    var cleanText = text.replace(/@[가-힣a-zA-Z][^\s@]{0,9}/g, "").replace(/\s{2,}/g, " ").trim();
    return { cleanText: cleanText, assignees: assignees };
}

// 통합 파싱: 날짜 먼저, 그 다음 사람
function parseToDoText(rawText) {
    var dateResult = parseDueDate(rawText);
    var assigneeResult = parseAssignees(dateResult.cleanText);
    return {
        text: assigneeResult.cleanText,
        dueDate: dateResult.dueDate,
        assignees: assigneeResult.assignees
    };
}

// 하위 할일 헬퍼
function getChildCount(parentId) {
    return toDos.filter(function(t) { return t.parentId === parentId; }).length;
}

function getVisibleToDos() {
    if (currentParentId === null) {
        return toDos.filter(function(t) { return !t.parentId; });
    }
    return toDos.filter(function(t) { return t.parentId === currentParentId; });
}

// 드릴다운 네비게이션
function navigateInto(parentId) {
    currentParentId = parentId;
    renderCurrentView();
}

function navigateBack() {
    currentParentId = null;
    renderCurrentView();
}

function renderCurrentView() {
    toDoList.innerHTML = "";
    var visible = getVisibleToDos();
    visible.forEach(function(toDo) { paintToDo(toDo); });

    if (currentParentId) {
        var parent = toDos.find(function(t) { return t.id === currentParentId; });
        todoNavTitle.textContent = parent ? parent.text : "";
        todoNavBar.style.display = "";
        toDoInput.placeholder = "하위 할일 추가...";
    } else {
        todoNavBar.style.display = "none";
        toDoInput.placeholder = "해야 할 일이 있나요?";
    }
}

// 데이터 저장 (localStorage + Firestore 동기화)
function saveToDos() {
    localStorage.setItem("lastLocalModified", String(Date.now()));
    AppStorage.set(TODOS_LS, JSON.stringify(toDos));
}

function saveArchive() {
    localStorage.setItem("lastLocalModified", String(Date.now()));
    AppStorage.set(ARCHIVE_LS, JSON.stringify(archivedToDos));
}

// 할 일 삭제
function deleteToDo(event) {
    const btn = event.target;
    const li = btn.closest("li");
    const parentList = li.parentNode;

    parentList.removeChild(li);

    // 활성 목록에서 삭제인지 아카이브에서 삭제인지 확인
    if (parentList === toDoList) {
        // 하위 할일도 함께 삭제
        toDos = toDos.filter(function(toDo) {
            return toDo.id !== li.id && toDo.parentId !== li.id;
        });
        saveToDos();
        // 삭제된 항목이 현재 보고 있는 부모면 뒤로가기
        if (currentParentId === li.id) {
            navigateBack();
        }
    } else {
        // 아카이브에서 삭제: 하위 할일도 함께 삭제
        archivedToDos = archivedToDos.filter(function(toDo) {
            return toDo.id !== li.id && toDo.parentId !== li.id;
        });
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
        delete toDoItem.focused;
        toDos.push(toDoItem);

        // 하위 할일도 함께 복원
        var children = archivedToDos.filter(function(t) { return t.parentId === toDoItem.id; });
        children.forEach(function(child) {
            child.completed = false;
            delete child.archivedAt;
            delete child.focused;
            toDos.push(child);
        });
        archivedToDos = archivedToDos.filter(function(t) { return t.parentId !== toDoItem.id; });

        // 현재 뷰가 최상위이고 복원 항목이 최상위면 paint
        if (!currentParentId && !toDoItem.parentId) {
            paintToDo(toDoItem);
        }

        saveToDos();
        saveArchive();
        renderArchive();
        archiveEmpty.classList.toggle("showing", archivedToDos.length === 0);
    }
}

// 완료 → 즉시 아카이브
function toggleComplete(event) {
    const checkbox = event.target;
    const li = checkbox.closest("li");
    const toDoItem = toDos.find(toDo => toDo.id === li.id);

    if (toDoItem && checkbox.checked) {
        // 하위 할일도 함께 아카이브
        var children = toDos.filter(function(t) { return t.parentId === toDoItem.id; });
        children.forEach(function(child) {
            child.completed = true;
            child.archivedAt = Date.now();
            delete child.focused;
            archivedToDos.push(child);
        });

        // 활성 목록에서 제거 (본인 + 하위)
        toDos = toDos.filter(function(toDo) {
            return toDo.id !== li.id && toDo.parentId !== toDoItem.id;
        });
        toDoList.removeChild(li);

        // 아카이브로 이동
        toDoItem.completed = true;
        toDoItem.archivedAt = Date.now();
        delete toDoItem.focused;
        archivedToDos.push(toDoItem);

        saveToDos();
        saveArchive();
        renderArchive();

        // 하위 뷰에서 부모가 완료되면 뒤로가기
        if (currentParentId === toDoItem.id) {
            navigateBack();
        }

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

        // 배열 순서 변경 (현재 뷰 레벨 내에서만)
        const newOrder = [...toDoList.children].map(child => child.id);
        const visibleIds = new Set(newOrder);
        const visibleItems = toDos.filter(function(t) { return visibleIds.has(t.id); });
        const otherItems = toDos.filter(function(t) { return !visibleIds.has(t.id); });
        visibleItems.sort(function(a, b) { return newOrder.indexOf(a.id) - newOrder.indexOf(b.id); });
        toDos = visibleItems.concat(otherItems);
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

function getDDayText(dueDate) {
    if (!dueDate) return null;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    var diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
    if (diff > 0) return { label: "D-" + diff, status: "upcoming" };
    if (diff === 0) return { label: "D-Day", status: "today" };
    return { label: "D+" + Math.abs(diff), status: "overdue" };
}

function renderBadges(li, toDoObj) {
    // 기존 배지 및 추가 버튼 제거
    li.querySelectorAll(".dday-badge, .assignee-badge, .btn-add-assignee").forEach(function(el) { el.remove(); });

    var textSpan = li.querySelector(".todo-text");
    if (!textSpan) return;
    var ref = textSpan.nextSibling;

    // D-Day 배지
    var dday = getDDayText(toDoObj.dueDate);
    if (dday) {
        var ddayEl = document.createElement("span");
        ddayEl.className = "dday-badge dday-" + dday.status;
        ddayEl.textContent = dday.label;
        li.insertBefore(ddayEl, ref);
        ref = ddayEl.nextSibling;
    }

    // 담당자 배지 (클릭하면 삭제)
    if (toDoObj.assignees && toDoObj.assignees.length > 0) {
        toDoObj.assignees.forEach(function(name) {
            var badge = document.createElement("span");
            badge.className = "assignee-badge";
            badge.textContent = "@" + name;
            badge.title = "클릭하여 제거";
            badge.style.cursor = "pointer";
            badge.addEventListener("click", function(e) {
                e.stopPropagation();
                toDoObj.assignees = toDoObj.assignees.filter(function(a) { return a !== name; });
                saveToDos();
                renderBadges(li, toDoObj);
            });
            li.insertBefore(badge, ref);
            ref = badge.nextSibling;
        });
    }

    // 담당자 추가 "+" 버튼
    var addBtn = document.createElement("span");
    addBtn.className = "btn-add-assignee";
    addBtn.textContent = "+";
    addBtn.title = "담당자 추가";
    addBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        showAssigneeInput(li, toDoObj, addBtn);
    });
    li.insertBefore(addBtn, ref);
}

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

function showAssigneeInput(li, toDoObj, addBtn) {
    // 이미 입력창이 열려있으면 무시
    if (li.querySelector(".assignee-input")) return;

    var input = document.createElement("input");
    input.type = "text";
    input.className = "assignee-input";
    input.placeholder = "이름";
    input.style.width = "60px";

    addBtn.replaceWith(input);
    input.focus();

    function finish() {
        var name = input.value.trim();
        if (name) {
            if (!toDoObj.assignees) toDoObj.assignees = [];
            if (toDoObj.assignees.indexOf(name) === -1) {
                toDoObj.assignees.push(name);
                saveToDos();
            }
        }
        renderBadges(li, toDoObj);
    }

    input.addEventListener("blur", finish);
    input.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            input.blur();
        }
        if (e.key === "Escape") {
            input.value = "";
            input.blur();
        }
    });
}

function getDaysDiff(from, to) {
    if (!from || !to) return null;
    const diff = Math.floor((to - from) / (1000 * 60 * 60 * 24));
    return diff;
}

// 할일 텍스트 인라인 수정
function editToDoText(event) {
    const span = event.target;
    const li = span.closest("li");
    const toDoItem = toDos.find(toDo => toDo.id === li.id);
    if (!toDoItem) return;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "todo-edit-input";
    input.value = toDoItem.text;

    function finishEdit() {
        const newText = input.value.trim();
        if (newText) {
            const parsed = parseToDoText(newText);
            toDoItem.text = parsed.text;
            if (parsed.dueDate) toDoItem.dueDate = parsed.dueDate;
            if (parsed.assignees.length > 0) toDoItem.assignees = parsed.assignees;
            span.innerText = parsed.text;
            renderBadges(li, toDoItem);
            saveToDos();
        }
        input.replaceWith(span);
    }

    input.addEventListener("blur", finishEdit);
    input.addEventListener("keydown", function(e) {
        if (e.key === "Enter") input.blur();
        if (e.key === "Escape") {
            input.removeEventListener("blur", finishEdit);
            input.replaceWith(span);
        }
    });

    span.replaceWith(input);
    input.focus();
    input.select();
}

// 설명 토글 (하위 할일 + 설명)
function toggleDescription(event) {
    const span = event.target;
    const li = span.closest("li");
    const existing = li.querySelector(".todo-expand");

    if (existing) {
        existing.remove();
        return;
    }

    const toDoItem = toDos.find(toDo => toDo.id === li.id);
    if (!toDoItem) return;

    const expandDiv = document.createElement("div");
    expandDiv.className = "todo-expand";

    // 하위 할일 목록 (최상위 할일만)
    if (!toDoItem.parentId) {
        var children = toDos.filter(function(t) { return t.parentId === toDoItem.id; });
        if (children.length > 0) {
            var childList = document.createElement("ul");
            childList.className = "todo-children";
            children.forEach(function(child) {
                var childLi = document.createElement("li");
                childLi.className = "todo-child-item";
                if (child.completed) childLi.classList.add("todo-item--completed");

                var childCheck = document.createElement("input");
                childCheck.type = "checkbox";
                childCheck.className = "todo-checkbox todo-child-checkbox";
                childCheck.checked = child.completed;
                childCheck.addEventListener("change", function() {
                    if (childCheck.checked) {
                        toDos = toDos.filter(function(t) { return t.id !== child.id; });
                        child.completed = true;
                        child.archivedAt = Date.now();
                        archivedToDos.push(child);
                        saveToDos();
                        saveArchive();
                        renderArchive();
                        childLi.remove();
                        // 자식 목록이 비면 목록 제거
                        if (childList.children.length === 0) childList.remove();
                        // 진입 버튼 개수 업데이트
                        updateEnterBtnCount(li, toDoItem.id);
                    }
                });

                var childText = document.createElement("span");
                childText.className = "todo-child-text";
                childText.textContent = child.text;

                childLi.appendChild(childCheck);
                childLi.appendChild(childText);
                childList.appendChild(childLi);
            });
            expandDiv.appendChild(childList);
        }
    }

    // 마감일 입력
    var dateRow = document.createElement("div");
    dateRow.className = "todo-duedate-row";
    var dateLabel = document.createElement("span");
    dateLabel.textContent = "마감일";
    dateLabel.className = "todo-duedate-label";
    var dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.className = "todo-duedate-input";
    if (toDoItem.dueDate) {
        var d = new Date(toDoItem.dueDate);
        dateInput.value = d.getFullYear() + "-" +
            String(d.getMonth() + 1).padStart(2, "0") + "-" +
            String(d.getDate()).padStart(2, "0");
    }
    dateInput.addEventListener("change", function() {
        if (dateInput.value) {
            toDoItem.dueDate = new Date(dateInput.value + "T00:00:00").getTime();
        } else {
            delete toDoItem.dueDate;
        }
        renderBadges(li, toDoItem);
        saveToDos();
    });
    dateRow.appendChild(dateLabel);
    dateRow.appendChild(dateInput);
    expandDiv.appendChild(dateRow);

    // 설명 textarea
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
            expandDiv.remove();
        }
    });

    expandDiv.appendChild(textarea);
    li.appendChild(expandDiv);
    textarea.focus();
}

// 진입 버튼 자식 개수 업데이트
function updateEnterBtnCount(li, parentId) {
    var enterBtn = li.querySelector(".btn-enter");
    if (enterBtn) {
        var count = getChildCount(parentId);
        enterBtn.innerHTML = count > 0 ? "<span class='todo-child-count'>" + count + "</span> ›" : "›";
    }
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

        // 텍스트 더블클릭 시 수정, 단일클릭 시 설명 토글
        span.addEventListener("dblclick", editToDoText);
        span.addEventListener("click", toggleDescription);
        span.style.cursor = "pointer";

        // 순서: 체크박스 → 텍스트 → 설명 인디케이터 → 삭제버튼
        label.appendChild(checkbox);
        li.appendChild(label);
        li.appendChild(span);

        // D-Day + 담당자 배지
        renderBadges(li, toDoObj);

        // 설명이 있으면 인디케이터 표시
        if (toDoObj.description) {
            const indicator = document.createElement("span");
            indicator.className = "todo-desc-indicator";
            indicator.textContent = "...";
            li.appendChild(indicator);
        }

        li.appendChild(deleteBtn);

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

        // 하위 할일 진입 버튼 (최상위 할일만, 하위 할일에는 표시 안함)
        if (!toDoObj.parentId) {
            var childCount = getChildCount(toDoObj.id);
            var enterBtn = document.createElement("button");
            enterBtn.className = "btn-enter";
            enterBtn.title = "하위 할일";
            enterBtn.innerHTML = childCount > 0 ? "<span class='todo-child-count'>" + childCount + "</span> ›" : "›";
            enterBtn.addEventListener("click", function(e) {
                e.stopPropagation();
                navigateInto(toDoObj.id);
            });
            li.appendChild(enterBtn);
        }

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

    const parsed = parseToDoText(currentValue);
    const toDoObj = {
        text: parsed.text,
        id: generateId(),
        completed: false,
        createdAt: Date.now()
    };
    if (parsed.dueDate) toDoObj.dueDate = parsed.dueDate;
    if (parsed.assignees.length > 0) toDoObj.assignees = parsed.assignees;

    if (currentParentId) {
        toDoObj.parentId = currentParentId;
    }

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

// 모드 전환 (명언 → 할일 → 매트릭스 → 명언)
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

// 저장된 모드 로드
function loadMode() {
    const savedMode = AppStorage.get(MODE_LS);
    if (savedMode === "todos" || savedMode === "matrix" ||
        savedMode === "people" || savedMode === "focus") {
        setMode(savedMode);
    }
}

// 초기 로드
function loadToDos() {
    const loadedToDos = AppStorage.get(TODOS_LS);
    const loadedArchive = AppStorage.get(ARCHIVE_LS);

    if (loadedToDos !== null) {
        toDos = JSON.parse(loadedToDos);
        // 고아 하위 할일 정리
        toDos = toDos.filter(function(t) {
            return !t.parentId || toDos.some(function(p) { return p.id === t.parentId; });
        });
        // 최상위 할일만 paint (하위 할일은 드릴다운 시 표시)
        toDos.filter(function(t) { return !t.parentId; }).forEach(function(toDo) { paintToDo(toDo); });
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

// ===== 아이젠하워 매트릭스 =====

// todo의 urgent/important 값으로 사분면 결정
function getQuadrant(todo) {
    if (todo.urgent == null && todo.important == null) return "backlog";
    if (todo.urgent && todo.important) return "q1";
    if (!todo.urgent && todo.important) return "q2";
    if (todo.urgent && !todo.important) return "q3";
    return "q4"; // urgent=false, important=false
}

// 사분면에 따라 urgent/important 값 설정
function setQuadrantProps(todo, quadrant) {
    if (quadrant === "backlog") {
        delete todo.urgent;
        delete todo.important;
    } else if (quadrant === "q1") {
        todo.urgent = true;
        todo.important = true;
    } else if (quadrant === "q2") {
        todo.urgent = false;
        todo.important = true;
    } else if (quadrant === "q3") {
        todo.urgent = true;
        todo.important = false;
    } else if (quadrant === "q4") {
        todo.urgent = false;
        todo.important = false;
    }
}

// 매트릭스 항목 체크 (완료 → 아카이브)
function completeFromMatrix(event) {
    const checkbox = event.target;
    const li = checkbox.closest("li");
    const toDoItem = toDos.find(toDo => toDo.id === li.id);

    if (toDoItem && checkbox.checked) {
        // 하위 할일도 함께 아카이브
        var children = toDos.filter(function(t) { return t.parentId === toDoItem.id; });
        children.forEach(function(child) {
            child.completed = true;
            child.archivedAt = Date.now();
            delete child.focused;
            archivedToDos.push(child);
        });

        toDos = toDos.filter(function(toDo) {
            return toDo.id !== li.id && toDo.parentId !== toDoItem.id;
        });
        li.remove();

        toDoItem.completed = true;
        toDoItem.archivedAt = Date.now();
        delete toDoItem.focused;
        archivedToDos.push(toDoItem);

        saveToDos();
        saveArchive();
        renderArchive();

        // 일반 뷰의 DOM도 갱신
        const normalLi = toDoList.querySelector("#" + CSS.escape(toDoItem.id));
        if (normalLi) normalLi.remove();

        archiveToggleBtn.classList.remove("shake");
        void archiveToggleBtn.offsetWidth;
        archiveToggleBtn.classList.add("shake");
        archiveToggleBtn.addEventListener("animationend", function() {
            archiveToggleBtn.classList.remove("shake");
        }, { once: true });
    }
}

// 매트릭스 항목 렌더링 (컴팩트)
function paintMatrixItem(toDoObj, targetList) {
    const li = document.createElement("li");
    li.className = "things matrix-item";
    li.id = toDoObj.id;
    li.draggable = true;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "todo-checkbox";
    checkbox.addEventListener("change", completeFromMatrix);

    const span = document.createElement("span");
    span.className = "todo-text";
    span.innerText = toDoObj.text;

    const label = document.createElement("label");
    label.className = "todo-label";
    label.appendChild(checkbox);

    li.appendChild(label);
    li.appendChild(span);

    // D-Day + 담당자 배지
    renderBadges(li, toDoObj);

    // 매트릭스 드래그 이벤트
    li.addEventListener("dragstart", function(e) {
        draggedItem = li;
        li.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", toDoObj.id);
    });
    li.addEventListener("dragend", function() {
        li.classList.remove("dragging");
        matrixCells.forEach(function(cell) { cell.classList.remove("drag-over"); });
        draggedItem = null;
    });

    targetList.appendChild(li);
}

// 매트릭스 렌더링
function renderMatrix() {
    // 모든 매트릭스 리스트 비우기
    matrixLists.forEach(function(list) { list.innerHTML = ""; });

    // 최상위 할일만 사분면별로 분류하여 렌더링 (하위 할일 제외)
    toDos.filter(function(t) { return !t.parentId; }).forEach(function(todo) {
        const quadrant = getQuadrant(todo);
        const targetList = modeMatrix.querySelector('.js-matrixList[data-quadrant="' + quadrant + '"]');
        if (targetList) {
            paintMatrixItem(todo, targetList);
        }
    });
}

// 매트릭스 셀 드래그앤드롭 (사분면 간 이동)
function initMatrixDragDrop() {
    matrixCells.forEach(function(cell) {
        cell.addEventListener("dragover", function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            cell.classList.add("drag-over");
        });

        cell.addEventListener("dragleave", function(e) {
            // 자식으로 이동할 때 dragleave 무시
            if (!cell.contains(e.relatedTarget)) {
                cell.classList.remove("drag-over");
            }
        });

        cell.addEventListener("drop", function(e) {
            e.preventDefault();
            cell.classList.remove("drag-over");

            const todoId = e.dataTransfer.getData("text/plain");
            if (!todoId) return;

            const targetQuadrant = cell.dataset.quadrant;
            if (!targetQuadrant) return;

            const toDoItem = toDos.find(function(t) { return t.id === todoId; });
            if (!toDoItem) return;

            const currentQuadrant = getQuadrant(toDoItem);
            if (currentQuadrant === targetQuadrant) return;

            setQuadrantProps(toDoItem, targetQuadrant);
            saveToDos();
            renderMatrix();
        });
    });
}

// ===== 사람 뷰 =====
function getAllAssignees() {
    var names = [];
    toDos.forEach(function(t) {
        if (t.assignees) {
            t.assignees.forEach(function(a) {
                if (names.indexOf(a) === -1) names.push(a);
            });
        }
    });
    return names.sort();
}

function renderPeopleView() {
    peopleTodosDiv.style.display = "none";
    peopleListDiv.style.display = "";
    peopleListDiv.innerHTML = "";

    var assignees = getAllAssignees();
    if (assignees.length === 0) {
        var empty = document.createElement("p");
        empty.className = "people-empty";
        empty.textContent = "할일에 @이름을 입력하면 여기에 표시됩니다";
        peopleListDiv.appendChild(empty);
        return;
    }

    assignees.forEach(function(name) {
        var count = toDos.filter(function(t) {
            return t.assignees && t.assignees.indexOf(name) !== -1;
        }).length;

        var card = document.createElement("div");
        card.className = "people-card";

        var nameSpan = document.createElement("span");
        nameSpan.className = "people-card-name";
        nameSpan.textContent = name;

        var countSpan = document.createElement("span");
        countSpan.className = "people-card-count";
        countSpan.textContent = count + "건";

        card.appendChild(nameSpan);
        card.appendChild(countSpan);
        card.addEventListener("click", function() { showPersonTodos(name); });
        peopleListDiv.appendChild(card);
    });
}

function showPersonTodos(name) {
    peopleListDiv.style.display = "none";
    peopleTodosDiv.style.display = "";
    peopleName.textContent = name;
    peopleTodoList.innerHTML = "";

    var todos = toDos.filter(function(t) {
        return t.assignees && t.assignees.indexOf(name) !== -1;
    });

    todos.forEach(function(todo) {
        paintMatrixItem(todo, peopleTodoList);
    });
}

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

        // 다른 뷰가 이 항목으로 드릴다운 중이면 뒤로가기
        if (currentParentId === toDoObj.id) {
            navigateBack();
        }

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

// ===== 몰입 모드 (focus) =====
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

function init() {
    loadToDos();
    loadMode();
    loadBoxSize();
    initBoxResize();
    initArchiveOutsideClick();
    toDoForm.addEventListener("submit", handleSubmit);
    archiveToggleBtn.addEventListener("click", toggleArchivePanel);
    modeBtn.addEventListener("click", toggleMode);
    todoNavBack.addEventListener("click", navigateBack);
    peopleBack.addEventListener("click", renderPeopleView);
    initMatrixDragDrop();

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

    // 다른 기기에서 데이터 변경 시 UI 전체 갱신
    AppStorage.onRemoteChange(function() {
        toDos = JSON.parse(AppStorage.get(TODOS_LS) || "[]");

        // currentParentId가 더 이상 유효하지 않으면 최상위로 복귀
        if (currentParentId && !toDos.some(function(t) { return t.id === currentParentId; })) {
            currentParentId = null;
        }

        // 현재 뷰 다시 그리기
        renderCurrentView();

        // 아카이브 다시 그리기
        archivedToDos = JSON.parse(AppStorage.get(ARCHIVE_LS) || "[]");
        renderArchive();

        // 매트릭스 모드면 다시 렌더링
        if (modeMatrix.classList.contains("showing")) {
            renderMatrix();
        }

        // 사람 모드면 다시 렌더링
        if (modePeople.classList.contains("showing")) {
            renderPeopleView();
        }

        // 포커스 모드면 다시 렌더링
        if (modeFocus.classList.contains("showing")) {
            renderFocus();
        }

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
    });
}

init();
