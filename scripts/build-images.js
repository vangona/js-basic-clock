const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'images');
const OUTPUT_FILE = path.join(__dirname, '..', 'images.json');

// 지원하는 이미지 확장자
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

function buildImageList() {
    const files = fs.readdirSync(IMAGES_DIR);

    const images = files
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return IMAGE_EXTENSIONS.includes(ext);
        })
        .map(file => `./images/${file}`);

    const output = {
        images: images,
        count: images.length,
        generatedAt: new Date().toISOString()
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

    console.log(`✓ ${images.length}개의 이미지를 찾았습니다.`);
    console.log(`✓ images.json 생성 완료`);
}

buildImageList();
