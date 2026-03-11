const form = document.querySelector(".js-form"),
    input = form.querySelector("input"),
    greeting = document.querySelector(".js-greetings");

const USER_LS = "currentUser",
    SHOWING_CN = "showing"
    
function deleteName() {
    localStorage.removeItem(USER_LS)
    form.classList.add(SHOWING_CN);
    greeting.classList.remove(SHOWING_CN);
    // Firebase 로그인 상태면 로그아웃
    if (window.firebaseSignOut) {
        window.firebaseSignOut();
    }
}

function saveName(text){
    AppStorage.set(USER_LS, text)
}

function handleSubmit(event) {
    event.preventDefault();
    const currentValue = input.value;
    paintGreeting(currentValue);
    saveName(currentValue);
    input.value = "";
}

function askForName(){
    form.classList.add(SHOWING_CN);
    form.addEventListener("submit", handleSubmit);
}

function paintGreeting(text){
    form.classList.remove(SHOWING_CN);
    greeting.classList.add(SHOWING_CN);
    greeting.innerHTML = 
    `행복한 하루 되세요. <a class="deleteBtn__name">${text}</a>.`;
    const deleteBtnName = document.querySelector(".deleteBtn__name")
    deleteBtnName.addEventListener("click", deleteName)
}

function loadName(){
    const currentUser = AppStorage.get(USER_LS);
    if(currentUser === null){
        askForName();
    } else {
        paintGreeting(currentUser);
    }
}

// Firebase Auth 로그인 시 호출됨 (firebase-config.js에서)
window.onFirebaseUser = function(user) {
    if (user && user.displayName) {
        paintGreeting(user.displayName);
        saveName(user.displayName);
    }
};

function init() {
    loadName();
}

init();