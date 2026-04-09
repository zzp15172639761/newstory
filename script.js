const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const TOTAL_QUESTIONS = 5;
const LEFT_PROGRESS_IMAGES = [
  "assets/红1.png",
  "assets/红2.png",
  "assets/红3.png",
  "assets/红4.png",
  "assets/红5.png"
];
const RIGHT_PROGRESS_IMAGES = [
  "assets/蓝1.png",
  "assets/蓝2.png",
  "assets/蓝3.png",
  "assets/蓝4.png",
  "assets/蓝5.png"
];

const questions = [
  {
    type: "picture-word",
    label: "看图选词",
    description: "观察图片，选择最匹配的英文单词。",
    promptImage: "assets/prompt-image.png",
    options: [
      { kind: "text", title: "carousel", note: "旋转木马" },
      { kind: "text", title: "ferris wheel", note: "摩天轮" },
      { kind: "text", title: "clown", note: "小丑" }
    ],
    correct: 0
  },
  {
    type: "audio-word",
    label: "听音选词",
    description: "点击喇叭听单词，再从 3 个选项中选择。",
    speak: "balloon",
    options: [
      { kind: "text", title: "balloon", note: "气球" },
      { kind: "text", title: "platform", note: "站台" },
      { kind: "text", title: "confetti", note: "彩带" }
    ],
    correct: 0
  },
  {
    type: "word-picture",
    label: "看词选图",
    description: "根据单词含义，选出正确的图示卡片。",
    keyword: "roller coaster",
    options: [
      { kind: "picture", title: "roller coaster", note: "过山车", thumb: "thumb-roller", emoji: "🎢" },
      { kind: "picture", title: "carousel", note: "旋转木马", thumb: "thumb-carousel", emoji: "🎠" },
      { kind: "picture", title: "balloon", note: "气球", thumb: "thumb-balloon", emoji: "🎈" }
    ],
    correct: 0
  },
  {
    type: "audio-word",
    label: "听音选词",
    description: "模拟音频题，验证连续作答时的状态表现。",
    speak: "confetti",
    options: [
      { kind: "text", title: "victory", note: "胜利" },
      { kind: "text", title: "confetti", note: "彩带" },
      { kind: "text", title: "teammate", note: "队友" }
    ],
    correct: 1
  },
  {
    type: "picture-word",
    label: "看图选词",
    description: "最后一题答对后会触发气球爆开彩带的胜利表现。",
    promptImage: "assets/prompt-image.png",
    options: [
      { kind: "text", title: "merry-go-round", note: "旋转木马" },
      { kind: "text", title: "rocket ship", note: "火箭飞船" },
      { kind: "text", title: "swing ride", note: "飞椅" }
    ],
    correct: 0
  }
];

const state = {
  mode: "3v3",
  players: 3,
  phase: "ready",
  leftScore: 0,
  rightScore: 0,
  currentQuestion: 0,
  elapsed: 0,
  answerLocked: true,
  timerId: null,
  rivalTimeout: null,
  countdownTimeouts: [],
  toastTimeout: null,
  result: null
};

const els = {
  stageViewport: document.getElementById("stageViewport"),
  stage: document.getElementById("stage"),
  timer: document.getElementById("timer"),
  roundStatus: document.getElementById("roundStatus"),
  leftScore: document.getElementById("leftScore"),
  rightScore: document.getElementById("rightScore"),
  leftFill: document.getElementById("leftFill"),
  rightFill: document.getElementById("rightFill"),
  leftTopSegments: Array.from(document.querySelectorAll("#leftTopTrack .top-progress-segment")),
  rightTopSegments: Array.from(document.querySelectorAll("#rightTopTrack .top-progress-segment")),
  leftBalloon: document.getElementById("leftBalloon"),
  rightBalloon: document.getElementById("rightBalloon"),
  leftBalloonShell: document.getElementById("leftBalloonShell"),
  rightBalloonShell: document.getElementById("rightBalloonShell"),
  leftCharacters: document.getElementById("leftCharacters"),
  rightCharacters: document.getElementById("rightCharacters"),
  leftFlashes: Array.from(document.querySelectorAll("#leftFlashes span")),
  rightFlashes: Array.from(document.querySelectorAll("#rightFlashes span")),
  promptStage: document.getElementById("promptStage"),
  optionStack: document.getElementById("optionStack"),
  questionType: document.getElementById("questionType"),
  questionIndex: document.getElementById("questionIndex"),
  hintText: document.getElementById("hintText"),
  countdown: document.getElementById("countdown"),
  toast: document.getElementById("toast"),
  wrongFeedback: document.getElementById("wrongFeedback"),
  winnerBanner: document.getElementById("winnerBanner"),
  restartBtn: document.getElementById("restartBtn"),
  playBtn: document.getElementById("playBtn"),
  modeBtns: Array.from(document.querySelectorAll(".mode-btn")),
  confettiLayer: document.getElementById("confettiLayer")
};

function resizeStage() {
  const width = els.stageViewport.clientWidth;
  const height = els.stageViewport.clientHeight;
  const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
  const scaledWidth = DESIGN_WIDTH * scale;
  const scaledHeight = DESIGN_HEIGHT * scale;

  els.stage.style.transform = `scale(${scale})`;
  els.stage.style.left = `${(width - scaledWidth) / 2}px`;
  els.stage.style.top = `${(height - scaledHeight) / 2}px`;
}

function formatTime(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function setStatus(text) {
  if (els.roundStatus) {
    els.roundStatus.textContent = text;
  }
}

function showToast(text, variant = "good") {
  clearTimeout(state.toastTimeout);
  els.toast.textContent = text;
  els.toast.dataset.variant = variant;
  els.toast.classList.remove("show");
  void els.toast.offsetWidth;
  els.toast.classList.add("show");
  state.toastTimeout = window.setTimeout(() => {
    els.toast.classList.remove("show");
  }, 1200);
}

function setMode(mode, restart = true) {
  state.mode = mode;
  state.players = Number(mode.charAt(0));
  els.stage.dataset.mode = mode;
  updateFlashPositions();

  els.modeBtns.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  if (restart) {
    startRound();
  }
}

function updateFlashPositions() {
  const presets = {
    1: [124],
    2: [110, 272],
    3: [78, 236, 402]
  };
  const positions = presets[state.players];

  [els.leftFlashes, els.rightFlashes].forEach((group) => {
    group.forEach((flash, index) => {
      flash.style.left = `${positions[Math.min(index, positions.length - 1)]}px`;
      flash.style.display = index < state.players ? "block" : "none";
    });
  });
}

function clearTimers() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
  if (state.rivalTimeout) {
    window.clearTimeout(state.rivalTimeout);
    state.rivalTimeout = null;
  }
  state.countdownTimeouts.forEach((timerId) => window.clearTimeout(timerId));
  state.countdownTimeouts = [];
}

function resetVisualState() {
  els.stage.dataset.phase = "ready";
  delete els.stage.dataset.result;
  els.leftBalloon.classList.remove("is-burst", "is-pumping", "is-leaking");
  els.rightBalloon.classList.remove("is-burst", "is-pumping", "is-leaking");
  els.leftBalloonShell.classList.remove("is-critical", "is-burst", "is-celebrating");
  els.rightBalloonShell.classList.remove("is-critical", "is-burst", "is-celebrating");
  els.leftCharacters.classList.remove("is-pumping", "is-slip", "is-celebrating", "is-applauding");
  els.rightCharacters.classList.remove("is-pumping", "is-slip", "is-celebrating", "is-applauding");
  els.countdown.classList.remove("show");
  els.winnerBanner.classList.remove("show");
  els.winnerBanner.textContent = "";
  els.confettiLayer.innerHTML = "";
  if (els.wrongFeedback) {
    els.wrongFeedback.classList.remove("show");
  }
}

function updateTimer() {
  els.timer.textContent = formatTime(state.elapsed);
}

function paintTopSegments(segments, score, imageList) {
  segments.forEach((segment, index) => {
    const isActive = index < score;
    segment.classList.toggle("is-active", isActive);

    if (isActive) {
      segment.style.backgroundImage = `url("${imageList[index]}")`;
      segment.style.backgroundSize = "cover";
      segment.style.backgroundPosition = "center";
      segment.style.backgroundRepeat = "no-repeat";
      segment.style.boxShadow = "none";
    } else {
      segment.style.backgroundImage = "";
      segment.style.backgroundSize = "";
      segment.style.backgroundPosition = "";
      segment.style.backgroundRepeat = "";
      segment.style.boxShadow = "";
    }
  });
}

function updateScoreboard() {
  els.leftScore.textContent = `${state.leftScore}/${TOTAL_QUESTIONS}`;
  els.rightScore.textContent = `${state.rightScore}/${TOTAL_QUESTIONS}`;
  els.leftFill.style.width = `${(state.leftScore / TOTAL_QUESTIONS) * 100}%`;
  els.rightFill.style.width = `${(state.rightScore / TOTAL_QUESTIONS) * 100}%`;
  paintTopSegments(els.leftTopSegments, state.leftScore, LEFT_PROGRESS_IMAGES);
  paintTopSegments(els.rightTopSegments, state.rightScore, RIGHT_PROGRESS_IMAGES);
}

function updateBalloons() {
  const leftScale = 0.82 + (state.leftScore / TOTAL_QUESTIONS) * 0.14;
  const rightScale = 0.82 + (state.rightScore / TOTAL_QUESTIONS) * 0.14;

  els.leftBalloon.style.setProperty("--inflate-scale", leftScale.toFixed(3));
  els.rightBalloon.style.setProperty("--inflate-scale", rightScale.toFixed(3));

  const leftCritical = state.phase === "playing" && state.leftScore === TOTAL_QUESTIONS - 1;
  const rightCritical = state.phase === "playing" && state.rightScore === TOTAL_QUESTIONS - 1;
  els.leftBalloonShell.classList.toggle("is-critical", leftCritical);
  els.rightBalloonShell.classList.toggle("is-critical", rightCritical);
}

function renderPrompt(question) {
  if (question.type === "picture-word") {
    return `
      <img class="prompt-image-direct" src="${question.promptImage}" alt="题目图片">
    `;
  }

  if (question.type === "audio-word") {
    return `
      <div class="prompt-card audio-card">
        <button class="speaker-btn" id="speakerBtn" type="button" aria-label="播放音频">🔊</button>
        <span class="prompt-badge">听音题</span>
        <h2>${question.speak}</h2>
        <p>${question.description}</p>
        <div class="wave-row" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>
    `;
  }

  return `
    <div class="prompt-card word-card">
      <span class="prompt-badge">目标单词</span>
      <div class="word-accent">
        <h2>${question.keyword}</h2>
      </div>
      <p>${question.description}</p>
    </div>
  `;
}

function renderOptions(question) {
  return question.options.map((option, index) => {
    const content = option.kind === "picture"
      ? `
          <div class="option-inner">
            <div class="option-meta">
              <strong>${option.title}</strong>
              <span>${option.note}</span>
            </div>
            <div class="option-thumb ${option.thumb}">${option.emoji}</div>
          </div>
        `
      : `
          <div class="option-inner">
            <div class="option-meta">
              <strong>${option.title}</strong>
              <span>${option.note}</span>
            </div>
          </div>
        `;

    return `
      <button class="option-button" type="button" data-index="${index}">
        ${content}
      </button>
    `;
  }).join("");
}

function bindPromptEvents(question) {
  if (question.type !== "audio-word") {
    return;
  }

  const speakerBtn = document.getElementById("speakerBtn");
  if (!speakerBtn) {
    return;
  }

  speakerBtn.addEventListener("click", () => speakWord(question.speak, speakerBtn));
}

function speakWord(word, button) {
  if (!("speechSynthesis" in window)) {
    showToast("当前浏览器不支持语音播放，已保留交互入口。", "bad");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  utterance.pitch = 1.05;
  utterance.onstart = () => button.classList.add("is-speaking");
  utterance.onend = () => button.classList.remove("is-speaking");
  utterance.onerror = () => button.classList.remove("is-speaking");
  window.speechSynthesis.speak(utterance);
}

function renderQuestion() {
  const question = questions[state.currentQuestion];
  els.questionType.textContent = question.label;
  els.questionIndex.textContent = `${String(state.currentQuestion + 1).padStart(2, "0")} / ${String(TOTAL_QUESTIONS).padStart(2, "0")}`;
  els.hintText.textContent = question.description;
  els.promptStage.innerHTML = renderPrompt(question);
  els.optionStack.innerHTML = renderOptions(question);

  bindPromptEvents(question);

  els.optionStack.querySelectorAll(".option-button").forEach((button) => {
    button.addEventListener("click", () => handleAnswer(Number(button.dataset.index)));
  });
}

function pulseElement(element, className, duration = 700) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => element.classList.remove(className), duration);
}

function flashPump(side, playerIndex) {
  const flashes = side === "left" ? els.leftFlashes : els.rightFlashes;
  const flash = flashes[playerIndex];
  if (!flash) {
    return;
  }
  flash.classList.remove("active");
  void flash.offsetWidth;
  flash.classList.add("active");
  window.setTimeout(() => flash.classList.remove("active"), 650);
}

function animateTeam(side, type, playerIndex) {
  const balloon = side === "left" ? els.leftBalloon : els.rightBalloon;
  const characters = side === "left" ? els.leftCharacters : els.rightCharacters;
  const actionClass = type === "correct" ? "is-pumping" : "is-slip";
  const balloonClass = type === "correct" ? "is-pumping" : "is-leaking";

  pulseElement(characters, actionClass, 620);
  pulseElement(balloon, balloonClass, 720);

  if (type === "correct") {
    flashPump(side, playerIndex);
  }
}

function highlightOptions(selectedIndex, correctIndex) {
  const buttons = Array.from(els.optionStack.querySelectorAll(".option-button"));
  buttons.forEach((button, index) => {
    button.disabled = true;
    if (index === correctIndex) {
      button.classList.add("is-correct");
    }
    if (index === selectedIndex && selectedIndex !== correctIndex) {
      button.classList.add("is-wrong");
    }
  });
}

function unlockOptions() {
  els.optionStack.querySelectorAll(".option-button").forEach((button) => {
    button.disabled = false;
    button.classList.remove("is-correct", "is-wrong");
  });
}

function handleAnswer(index) {
  if (state.phase !== "playing" || state.answerLocked) {
    return;
  }

  state.answerLocked = true;
  const question = questions[state.currentQuestion];
  highlightOptions(index, question.correct);

  const activePlayer = Math.floor(Math.random() * state.players);
  if (index === question.correct) {
    state.leftScore += 1;
    animateTeam("left", "correct", activePlayer);
    updateScoreboard();
    updateBalloons();
    showToast("答对了，红方打气成功。", "good");

    if (state.leftScore >= TOTAL_QUESTIONS) {
      endGame("left");
      return;
    }

    state.currentQuestion = state.leftScore;
    window.setTimeout(() => {
      renderQuestion();
      unlockOptions();
      state.answerLocked = false;
      const nextQuestion = questions[state.currentQuestion];
      setStatus(`第 ${state.currentQuestion + 1} 题已就位，当前题型：${nextQuestion.label}`);
      if (nextQuestion.type === "audio-word") {
        const speakerBtn = document.getElementById("speakerBtn");
        if (speakerBtn) {
          speakWord(nextQuestion.speak, speakerBtn);
        }
      }
    }, 760);
  } else {
    animateTeam("left", "wrong", activePlayer);
    updateBalloons();
    showToast("答错了，气球轻微漏气。", "bad");
    window.setTimeout(() => {
      unlockOptions();
      state.answerLocked = false;
      setStatus(`继续作答，第 ${state.currentQuestion + 1} 题仍在进行中。`);
    }, 820);
  }
}

function scheduleRivalTurn() {
  if (state.phase !== "playing") {
    return;
  }

  const baseDelay = 1700 + (4 - state.players) * 220;
  const delay = baseDelay + Math.random() * 1200;

  state.rivalTimeout = window.setTimeout(() => {
    if (state.phase !== "playing") {
      return;
    }

    const activePlayer = Math.floor(Math.random() * state.players);
    const isCorrect = Math.random() < (0.62 + state.players * 0.06);

    if (isCorrect) {
      state.rightScore = Math.min(TOTAL_QUESTIONS, state.rightScore + 1);
      animateTeam("right", "correct", activePlayer);
      updateScoreboard();
      updateBalloons();

      if (state.rightScore >= TOTAL_QUESTIONS) {
        endGame("right");
        return;
      }

      setStatus(`蓝方答对一题，当前比分 ${state.leftScore}:${state.rightScore}。`);
    } else {
      animateTeam("right", "wrong", activePlayer);
      setStatus("蓝方这次漏气了，红方还有机会反超。");
    }

    scheduleRivalTurn();
  }, delay);
}

function spawnConfetti(side, intensity = 26) {
  const colors = side === "left"
    ? ["#ff6c52", "#ffd34e", "#ffffff", "#ff96a8"]
    : ["#24a9ff", "#6fe1ff", "#ffffff", "#ffd84d"];

  for (let index = 0; index < intensity; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.background = colors[index % colors.length];
    piece.style.left = `${side === "left" ? 320 : 1560}px`;
    piece.style.top = `${240 + Math.random() * 180}px`;
    piece.style.setProperty("--drop", `${280 + Math.random() * 380}px`);
    piece.style.setProperty("--drift", `${-240 + Math.random() * 480}px`);
    piece.style.setProperty("--spin", `${180 + Math.random() * 420}deg`);
    piece.style.setProperty("--fall-duration", `${1.2 + Math.random() * 1.1}s`);
    els.confettiLayer.appendChild(piece);

    window.setTimeout(() => piece.remove(), 2600);
  }
}

function celebrate(winnerSide) {
  const loserSide = winnerSide === "left" ? "right" : "left";
  const winnerCharacters = winnerSide === "left" ? els.leftCharacters : els.rightCharacters;
  const loserCharacters = loserSide === "left" ? els.leftCharacters : els.rightCharacters;
  const winnerShell = winnerSide === "left" ? els.leftBalloonShell : els.rightBalloonShell;
  const loserShell = loserSide === "left" ? els.leftBalloonShell : els.rightBalloonShell;
  const winnerBalloon = winnerSide === "left" ? els.leftBalloon : els.rightBalloon;
  const loserBalloon = loserSide === "left" ? els.leftBalloon : els.rightBalloon;

  winnerCharacters.classList.add("is-celebrating");
  loserCharacters.classList.add("is-applauding");
  winnerShell.classList.add("is-celebrating", "is-burst");
  loserShell.classList.remove("is-critical");
  winnerBalloon.classList.add("is-burst");
  loserBalloon.classList.add("is-burst");
}

function endGame(winnerSide) {
  clearTimers();
  state.phase = "ended";
  state.answerLocked = true;
  state.result = winnerSide;
  els.stage.dataset.phase = "ended";
  els.stage.dataset.result = winnerSide;

  celebrate(winnerSide);
  spawnConfetti(winnerSide, winnerSide === "left" ? 34 : 24);
  spawnConfetti(winnerSide === "left" ? "right" : "left", winnerSide === "left" ? 14 : 10);

  const winnerText = winnerSide === "left" ? "红队 Victory!" : "蓝队 Winner!";
  els.winnerBanner.textContent = winnerText;
  els.winnerBanner.classList.add("show");

  setStatus(winnerSide === "left" ? "红方率先完成全部题目，拿下本局胜利。" : "蓝方率先完成全部题目，进入胜负结算。");
  showToast(winnerSide === "left" ? "红方获胜，进入庆祝动画！" : "蓝方获胜，红方为胜者鼓掌。", "result");
}

function runCountdown() {
  state.phase = "countdown";
  state.answerLocked = true;
  els.stage.dataset.phase = "countdown";

  const steps = ["3", "2", "1", "GO!"];
  steps.forEach((step, index) => {
    const timerId = window.setTimeout(() => {
      els.countdown.textContent = step;
      els.countdown.classList.remove("show");
      void els.countdown.offsetWidth;
      els.countdown.classList.add("show");
      if (step !== "GO!") {
        setStatus(`倒计时 ${step}，双方小队准备打气。`);
      } else {
        setStatus("开局成功，开始连续作答。");
      }
    }, index * 760);

    state.countdownTimeouts.push(timerId);
  });

  const startPlayTimer = window.setTimeout(() => {
    beginPlay();
  }, steps.length * 760);

  state.countdownTimeouts.push(startPlayTimer);
}

function beginPlay() {
  state.phase = "playing";
  state.answerLocked = false;
  els.stage.dataset.phase = "playing";
  updateBalloons();
  renderQuestion();
  unlockOptions();

  setStatus(`比赛开始，当前题型：${questions[state.currentQuestion].label}`);

  state.timerId = window.setInterval(() => {
    state.elapsed += 1;
    updateTimer();
  }, 1000);

  if (questions[state.currentQuestion].type === "audio-word") {
    const speakerBtn = document.getElementById("speakerBtn");
    if (speakerBtn) {
      speakWord(questions[state.currentQuestion].speak, speakerBtn);
    }
  }

  scheduleRivalTurn();
}

function startRound() {
  clearTimers();
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  state.phase = "ready";
  state.leftScore = 0;
  state.rightScore = 0;
  state.currentQuestion = 0;
  state.elapsed = 0;
  state.answerLocked = true;
  state.result = null;

  resetVisualState();
  updateTimer();
  updateScoreboard();
  updateBalloons();
  renderQuestion();
  unlockOptions();
  setStatus(`匹配完成，${state.mode} 模式角色已落位，准备开始。`);
  runCountdown();
}

function bindEvents() {
  window.addEventListener("resize", resizeStage);

  els.modeBtns.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  els.restartBtn.addEventListener("click", startRound);
  els.playBtn.addEventListener("click", startRound);
}

function init() {
  resizeStage();
  bindEvents();
  updateFlashPositions();
  updateTimer();
  updateScoreboard();
  updateBalloons();
  renderQuestion();
  startRound();
}

init();
