// Storage 추상화 레이어 - localStorage 우선, Firestore 백그라운드 동기화
(function () {
    var SYNC_KEYS = ["toDos", "toDosArchive", "viewMode"];
    var syncFn = null;
    var changeCallback = null;

    window.AppStorage = {
        get: function (key) {
            return localStorage.getItem(key);
        },

        set: function (key, value) {
            localStorage.setItem(key, value);
            if (syncFn && SYNC_KEYS.indexOf(key) !== -1) {
                syncFn();
            }
        },

        remove: function (key) {
            localStorage.removeItem(key);
            if (syncFn && SYNC_KEYS.indexOf(key) !== -1) {
                syncFn();
            }
        },

        // firebase-config.js가 호출 - Firestore 동기화 함수 등록
        _setSyncFn: function (fn) {
            syncFn = fn;
        },

        // todo.js가 호출 - 원격 변경 시 UI 갱신 콜백 등록
        onRemoteChange: function (callback) {
            changeCallback = callback;
        },

        // firebase-config.js가 호출 - 원격 데이터 도착 시 UI에 알림
        _notifyChange: function () {
            if (changeCallback) changeCallback();
        }
    };
})();
