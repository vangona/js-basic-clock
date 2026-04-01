// Firebase Firestore + Auth 초기화 (ES Module)
//
// === 설정 방법 ===
// 1. https://console.firebase.google.com/ 에서 프로젝트 생성
// 2. Firestore Database 활성화 (프로덕션 모드)
// 3. Authentication > Sign-in method > Google 활성화
// 4. 프로젝트 설정 > 웹 앱 추가 > config 값 복사
// 5. 아래 firebaseConfig 객체에 붙여넣기
// 6. Firestore 규칙 설정:
//    rules_version = '2';
//    service cloud.firestore {
//      match /databases/{database}/documents {
//        match /users/{userId} {
//          allow read, write: if request.auth != null && request.auth.uid == userId;
//          match /backups/{backupId} {
//            allow read, write: if request.auth != null && request.auth.uid == userId;
//          }
//        }
//      }
//    }

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
    getFirestore, doc, setDoc, getDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
    getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCfwDeXrOPNXed6G4DIt8aTpSeUYc8GLGc",
  authDomain: "vincent-basic-clock-todo.firebaseapp.com",
  projectId: "vincent-basic-clock-todo",
  storageBucket: "vincent-basic-clock-todo.firebasestorage.app",
  messagingSenderId: "276812580921",
  appId: "1:276812580921:web:f89dc79e0bd1721241a5e8"
};

if (!firebaseConfig.apiKey) {
    console.warn(
        "[Firebase] config가 비어있습니다.\n" +
        "Firebase Console(https://console.firebase.google.com/)에서 프로젝트를 생성하고\n" +
        "js/firebase-config.js의 firebaseConfig 객체를 채워주세요."
    );
} else {
    var app = initializeApp(firebaseConfig);
    var db = getFirestore(app);
    var auth = getAuth(app);
    var provider = new GoogleAuthProvider();

    var currentUserId = null;
    var unsubscribeSnapshot = null;
    var syncTimer = null;
    var lastWriteTimestamp = 0;
    var BACKUP_INTERVAL = 60 * 60 * 1000; // 1시간

    // 1시간 이내 백업이 없으면 현재 Firestore 데이터를 백업
    async function backupIfNeeded() {
        if (!currentUserId) return;

        var lastBackup = parseInt(localStorage.getItem("lastBackupTimestamp") || "0", 10);
        if (Date.now() - lastBackup < BACKUP_INTERVAL) return;

        try {
            var currentDoc = await getDoc(doc(db, "users", currentUserId));
            if (!currentDoc.exists()) return;

            var data = currentDoc.data();
            // 빈 데이터는 백업할 필요 없음
            if (!data.todos || data.todos === "[]") return;

            var backupTs = Date.now();
            await setDoc(doc(db, "users", currentUserId, "backups", String(backupTs)), {
                todos: data.todos,
                archivedTodos: data.archivedTodos || "[]",
                viewMode: data.viewMode || "words",
                currentUser: data.currentUser || "",
                backedUpAt: backupTs,
                originalLastModified: data.lastModified || 0
            });

            localStorage.setItem("lastBackupTimestamp", String(backupTs));
            console.log("[Firebase] 백업 완료:", new Date(backupTs).toLocaleString());
        } catch (e) {
            console.error("[Firebase] 백업 실패:", e);
        }
    }

    // Firestore에 현재 localStorage 데이터 동기화 (1초 debounce)
    function syncToFirestore() {
        if (!currentUserId) return;

        clearTimeout(syncTimer);
        syncTimer = setTimeout(async function () {
            // 쓰기 전 백업 확인
            await backupIfNeeded();

            var ts = Date.now();
            lastWriteTimestamp = ts;

            // 로컬 수정 타임스탬프도 함께 저장
            localStorage.setItem("lastLocalModified", String(ts));

            setDoc(doc(db, "users", currentUserId), {
                todos: window.AppStorage.get("toDos") || "[]",
                archivedTodos: window.AppStorage.get("toDosArchive") || "[]",
                viewMode: window.AppStorage.get("viewMode") || "words",
                currentUser: window.AppStorage.get("currentUser") || "",
                lastModified: ts
            }).catch(function (e) {
                console.error("[Firebase] 동기화 실패:", e);
            });
        }, 1000);
    }

    // 원격 데이터가 빈 배열이고 로컬에 데이터가 있으면 덮어쓰지 않음
    function safeSetTodos(key, remoteValue) {
        if (!remoteValue) return;
        var localValue = localStorage.getItem(key);
        try {
            var remoteArr = JSON.parse(remoteValue);
            var localArr = localValue ? JSON.parse(localValue) : [];
            if (Array.isArray(remoteArr) && remoteArr.length === 0 && localArr.length > 0) {
                console.log("[Firebase] 원격 " + key + " 비어있음, 로컬 데이터(" + localArr.length + "개) 보존");
                return false;
            }
        } catch (e) { /* JSON 파싱 실패 시 그냥 덮어쓰기 */ }
        localStorage.setItem(key, remoteValue);
        return true;
    }

    // Firestore 실시간 리스너 - 다른 기기의 변경 감지
    function startListening() {
        if (unsubscribeSnapshot) unsubscribeSnapshot();

        unsubscribeSnapshot = onSnapshot(doc(db, "users", currentUserId), function (snapshot) {
            if (!snapshot.exists()) return;

            var data = snapshot.data();

            // 내가 방금 쓴 데이터면 무시 (자기 자신의 write 반영 방지)
            if (data.lastModified <= lastWriteTimestamp) return;

            lastWriteTimestamp = data.lastModified;

            // localStorage 업데이트 (빈 배열로 로컬 데이터 덮어쓰기 방지)
            safeSetTodos("toDos", data.todos);
            safeSetTodos("toDosArchive", data.archivedTodos);
            if (data.viewMode) localStorage.setItem("viewMode", data.viewMode);
            if (data.currentUser) localStorage.setItem("currentUser", data.currentUser);

            // 이름이 변경되었으면 인사말 UI 갱신
            if (data.currentUser && window.onFirebaseUser) {
                window.onFirebaseUser({ displayName: data.currentUser });
            }

            // UI 갱신 알림
            window.AppStorage._notifyChange();
        });
    }

    // 최초 로그인 시 데이터 병합 (타임스탬프 비교로 최신 데이터 보존)
    async function mergeOnFirstConnect() {
        try {
            var remoteDoc = await getDoc(doc(db, "users", currentUserId));
            var localTodos = window.AppStorage.get("toDos");
            var localModified = parseInt(localStorage.getItem("lastLocalModified") || "0", 10);

            if (remoteDoc.exists()) {
                var remote = remoteDoc.data();
                var remoteModified = remote.lastModified || 0;

                if (!localTodos || localTodos === "[]") {
                    // 로컬이 비어있으면 원격 데이터 가져오기
                    console.log("[Firebase] 로컬 비어있음 → 원격 데이터 가져오기");
                    safeSetTodos("toDos", remote.todos);
                    safeSetTodos("toDosArchive", remote.archivedTodos);
                    if (remote.viewMode) localStorage.setItem("viewMode", remote.viewMode);
                    if (remote.currentUser) localStorage.setItem("currentUser", remote.currentUser);
                    localStorage.setItem("lastLocalModified", String(remoteModified));
                    lastWriteTimestamp = remoteModified;
                    window.AppStorage._notifyChange();
                } else if (remoteModified > localModified) {
                    // 원격이 더 최신 → 원격 데이터로 교체
                    console.log("[Firebase] 원격이 더 최신 (" + new Date(remoteModified).toLocaleString() + " > " + new Date(localModified).toLocaleString() + ") → 원격 데이터 가져오기");
                    safeSetTodos("toDos", remote.todos);
                    safeSetTodos("toDosArchive", remote.archivedTodos);
                    if (remote.viewMode) localStorage.setItem("viewMode", remote.viewMode);
                    if (remote.currentUser) localStorage.setItem("currentUser", remote.currentUser);
                    localStorage.setItem("lastLocalModified", String(remoteModified));
                    lastWriteTimestamp = remoteModified;
                    window.AppStorage._notifyChange();
                } else {
                    // 로컬이 더 최신 (또는 동일) → 로컬 데이터를 원격에 푸시
                    console.log("[Firebase] 로컬이 더 최신 (" + new Date(localModified).toLocaleString() + " >= " + new Date(remoteModified).toLocaleString() + ") → 로컬 데이터 푸시");
                    lastWriteTimestamp = remoteModified;
                    syncToFirestore();
                }
            } else {
                // 원격 데이터 없음 - 로컬 데이터 푸시
                console.log("[Firebase] 원격 데이터 없음 → 로컬 데이터 푸시");
                syncToFirestore();
            }
        } catch (e) {
            console.error("[Firebase] 초기 병합 실패:", e);
        }
    }

    // 인증 상태 변경 리스너
    onAuthStateChanged(auth, function (user) {
        var syncBtn = document.querySelector(".js-syncBtn");

        var syncLabel = document.querySelector(".js-syncLabel");

        if (user) {
            currentUserId = user.uid;
            window.AppStorage._setSyncFn(syncToFirestore);

            // 인사말 업데이트
            if (user.displayName && window.onFirebaseUser) {
                window.onFirebaseUser(user);
            }

            // 동기화 버튼 상태 업데이트
            if (syncBtn) {
                syncBtn.classList.add("connected");
                syncBtn.title = user.displayName + " (동기화 중)";
            }

            // 로그인 라벨 표시
            if (syncLabel) {
                syncLabel.textContent = user.displayName || user.email || "";
            }

            // 데이터 병합 후 실시간 리스너 시작
            mergeOnFirstConnect().then(function () {
                startListening();
            });
        } else {
            currentUserId = null;
            window.AppStorage._setSyncFn(null);

            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }

            if (syncBtn) {
                syncBtn.classList.remove("connected");
                syncBtn.title = "Google 로그인으로 동기화";
            }

            if (syncLabel) {
                syncLabel.textContent = "";
            }

            if (window.onFirebaseUser) {
                window.onFirebaseUser(null);
            }
        }
    });

    // 동기화 버튼 클릭 핸들러
    var syncBtn = document.querySelector(".js-syncBtn");
    if (syncBtn) {
        syncBtn.addEventListener("click", function () {
            if (auth.currentUser) {
                signOut(auth).catch(function (e) {
                    console.error("[Firebase] 로그아웃 실패:", e);
                });
            } else {
                signInWithPopup(auth, provider).catch(function (e) {
                    if (e.code !== "auth/popup-closed-by-user") {
                        console.error("[Firebase] 로그인 실패:", e);
                    }
                });
            }
        });
    }
}
