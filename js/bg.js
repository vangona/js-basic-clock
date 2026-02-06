const body = document.querySelector("body")

function paintImage(imagePath) {
    const image = new Image();
    image.src = imagePath;
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

async function init() {
    try {
        const response = await fetch('./images.json');
        const data = await response.json();
        const images = data.images;

        if (images.length > 0) {
            const randomIndex = Math.floor(Math.random() * images.length);
            paintImage(images[randomIndex]);
        }
    } catch (error) {
        console.error('이미지 목록을 불러올 수 없습니다:', error);
    }
}

init();
