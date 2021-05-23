const form = document.querySelector(".js-form"),
    input = form.querySelector("input"),
    greeting = document.querySelector(".js-greetings");

const USER_LS = "currentUser",
    SHOWING_CN = "showing"
    
function deleteName() {
    localStorage.removeItem(USER_LS)
    form.classList.add(SHOWING_CN);
    greeting.classList.remove(SHOWING_CN);
}

function saveName(text){
    localStorage.setItem(USER_LS, text)
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
    const currentUser = localStorage.getItem(USER_LS);
    if(currentUser === null){
        askForName();
    } else {
        paintGreeting(currentUser);
    }
}

function init() {
    loadName();
}

init();