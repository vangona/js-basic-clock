const body = document.querySelector("body")

const IMG_NUMBER = 24;

function paintImage(imgNumber){
    const image = new Image();
    image.src = `./images/${imgNumber + 5}.jpg`;
    image.classList.add("bgImage");

    image.onload = function() {
        // 이미지가 가로형인지 확인 (가로가 세로보다 큰 경우)
        const isLandscapeImage = image.naturalWidth > image.naturalHeight;
        // 화면이 세로형인지 확인 (세로가 가로보다 큰 경우)
        const isPortraitScreen = window.innerHeight > window.innerWidth;

        if (isLandscapeImage && isPortraitScreen) {
            image.classList.add("bgImage--panning");
        }
    };

    body.prepend(image);
}

function genRandom(){
    const number = Math.floor(Math.random() * IMG_NUMBER);
    return number;
}

function init(){
    const randomNumber = genRandom();
    paintImage(randomNumber);
}

init();

