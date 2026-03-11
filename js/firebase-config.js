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

    // Firestore에 현재 localStorage 데이터 동기화 (1초 debounce)
    function syncToFirestore() {
        if (!currentUserId) return;

        clearTimeout(syncTimer);
        syncTimer = setTimeout(function () {
            var ts = Date.now();
            lastWriteTimestamp = ts;

            setDoc(doc(db, "users", currentUserId), {
                todos: window.AppStorage.get("toDos") || "[]",
                archivedTodos: window.AppStorage.get("toDosArchive") || "[]",
                viewMode: window.AppStorage.get("viewMode") || "words",
                lastModified: ts
            }).catch(function (e) {
                console.error("[Firebase] 동기화 실패:", e);
            });
        }, 1000);
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

            // localStorage 업데이트
            if (data.todos) localStorage.setItem("toDos", data.todos);
            if (data.archivedTodos) localStorage.setItem("toDosArchive", data.archivedTodos);
            if (data.viewMode) localStorage.setItem("viewMode", data.viewMode);

            // UI 갱신 알림
            window.AppStorage._notifyChange();
        });
    }

    // 최초 로그인 시 데이터 병합
    async function mergeOnFirstConnect() {
        try {
            var remoteDoc = await getDoc(doc(db, "users", currentUserId));
            var localTodos = window.AppStorage.get("toDos");

            if (remoteDoc.exists()) {
                var remote = remoteDoc.data();

                if (!localTodos || localTodos === "[]") {
                    // 로컬이 비어있으면 원격 데이터 가져오기
                    if (remote.todos) localStorage.setItem("toDos", remote.todos);
                    if (remote.archivedTodos) localStorage.setItem("toDosArchive", remote.archivedTodos);
                    if (remote.viewMode) localStorage.setItem("viewMode", remote.viewMode);
                    lastWriteTimestamp = remote.lastModified || 0;
                    window.AppStorage._notifyChange();
                } else {
                    // 로컬에 데이터가 있으면 원격으로 푸시
                    lastWriteTimestamp = remote.lastModified || 0;
                    syncToFirestore();
                }
            } else {
                // 원격 데이터 없음 - 로컬 데이터 푸시
                syncToFirestore();
            }
        } catch (e) {
            console.error("[Firebase] 초기 병합 실패:", e);
        }
    }

    // 인증 상태 변경 리스너
    onAuthStateChanged(auth, function (user) {
        var syncBtn = document.querySelector(".js-syncBtn");

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
