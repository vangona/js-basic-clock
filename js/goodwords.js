const TODOS_FORWORDS = localStorage.getItem("toDos");
const container = document.querySelector(".goodwords-container")
const words = document.querySelector(".js-goodwords")
const bgImage = document.querySelector(".bgImage")

const GOOD_WORDS = [
    "사람들은 삶의 의무 또는 \n현재의 불행과 따분함에서 벗어나고자 \n갖가지 핑계를 대며 대중운동에 휩쓸린다. \n- 에릭 호퍼", 
    "우리 인생은 \n우리가 무엇을 부족하다고 여기는지에 따라 달라진다. \n- 알프레드 아들러", 
    "고통이나 운명을 의식적으로 받아들이는 것은 \n인간의 가장 큰 능력 중 하나가 될 수 있다. \n- 빅토로 프랑클",
    "군중이 대중운동에 매혹되고 빠지는 것은\n 그것이 제공하는 약속과 교리 때문이 아니다. \n개인의 무력한 존재감과 두려움, 공허함을 피할 수 있는 \n피난처를 제공하기 때문이다. \n- 에릭 호퍼",
    "다른 동물과 마찬가지로 인간도 환경으로 형성된다. \n하지만 인간에게는 새로운 환경에 적응하거나 새로운 환경을 창조해내는 능력이 있다. \n- B.F. 스키너",
    "감정은 사실이 아니다. 생각을 바꾸면 감정도 바뀐다. \n- 데이비드 D. 번스",
    "만약 진실이 위험하지 않다면, \n거짓말이 존재할 이유는 없을겁니다. \n- 알프레드 애들러",
    "성격이란 끝나지 않는 과정입니다. \n조금은 영속성이 있을지 모르나 끊임없이 바뀝니다. \n- 고든 알포드",
    "자신의 인생을 제어할 수 있는 사람들은 \n그렇지 못하다고 믿는 사람들보다 건강하고 효과적이며 더 성공적이기 마련입니다. \n- 알버트 반두라",
    "인간의 투쟁이야 말로 그가 진정으로 누구인지를 보여줍니다. \n- 에릭 에릭슨",
    "정신이란 빙산과 같습니다. \n정작 보이는건 1/7도 안됩니다. \n- 지그문트 프로이트",
    "우리를 불편하게 하는 것들이야말로 \n자신을 이해하기 위한 지름길입니다. \n- 카를 융",
    "가능성을 실현하는것, \n그것이야 말로 자아실현이라고 할 수 있습니다. \n- 에이브러험 매슬로우",
    "교육받은 인간이란 \n배우는 방법과 변화하는 방법을 배운 사람. \n- 칼 로저스",
    "진정한 인간관계나 상호작용을 이루려면 \n그 상호작용 안에서 나 자신이 편하고, \n상대방이 나의 잠재력을 뚜렷이 볼 수 있어야 한다. \n- 칼 로져스",
    "인생은 짧아. 가만히 앉아서 우리가 하는 일에 대해\n 쓰레기 같은 이야기를 하는 대신에, 진짜 일을 해.\n 신께서 재능을 주셨지만 살날은 많지 않으니까. \n - 스티븐 킹",
    "한현욱의 춥다와 박태훈의 덥다는 믿을 수 없다. \n- 김관경",
    "그렇게 입고 나가면 얼어뒤져요. \n- 한현욱",
    "아 개덥다 (반팔, 겨울) \n- 박태훈",
    "조오오오온맛탱 \n- 박태훈"]

const WORDS_NUMBERS = GOOD_WORDS.length;

function paintWord(){
    const randomNumber = Math.floor(Math.random() * WORDS_NUMBERS);
    if (toDoList.innerText === "") {
        container.classList.add(SHOWING_CN);
        words.innerText = GOOD_WORDS[randomNumber];
    } 
}


function init (){
    bgImage.onload = paintWord();
}

init();