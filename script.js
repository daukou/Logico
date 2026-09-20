const puzzleGrid = document.getElementById("puzzle-grid");
const streakEl = document.getElementById("streak");
const stageLabelEl = document.getElementById("stage-label");
const stageBadgeEl = document.getElementById("stage-badge");
const checkBtn = document.getElementById("check-btn");
const nextBtn = document.getElementById("next-btn");
const feedbackEl = document.getElementById("feedback");
const numpadEl = document.getElementById("numpad");
const numpadKeys = document.getElementById("numpad-keys");
const numpadClose = document.getElementById("numpad-close");
const numpadLabel = document.getElementById("numpad-label");

const streakBtn = document.getElementById("streak-btn");
const calendarModal = document.getElementById("calendar-modal");
const modalClose = document.getElementById("modal-close");
const calendarGrid = document.getElementById("calendar-grid");
const calendarMonthName = document.getElementById("calendar-month-name");

// Stage definície
const STAGES = [
  { name: "1/5 Easy", cls: "stage-easy", hide: 3, minNum: 1, maxNum: 9, ops: ["+", "-"] },
  { name: "2/5 Medium", cls: "stage-medium", hide: 4, minNum: 1, maxNum: 15, ops: ["+", "-", "*"] },
  { name: "3/5 Hard", cls: "stage-hard", hide: 5, minNum: 1, maxNum: 30, ops: ["+", "-", "*", "/"] },
  { name: "4/5 Ultra Hard", cls: "stage-ultrahard", hide: 5, minNum: 10, maxNum: 50, ops: ["+", "-", "*", "/"] },
  { name: "5/5 Extreme", cls: "stage-extreme", hide: 6, minNum: 10, maxNum: 99, ops: ["+", "-", "*", "/"] }
];

// Mriežka 5x5: 3 horizontálne a 3 vertikálne rovnice
const TEMPLATE_GRID = {
  cols: 5,
  rows: 5,
  cells: [
    ["n", "op", "n", "eq", "n"],
    ["op", null, "op", null, "op"],
    ["n", "op", "n", "eq", "n"],
    ["eq", null, "eq", null, "eq"],
    ["n", "op", "n", "eq", "n"],
  ],
  equations: [
    { a: [0, 0], b: [0, 2], c: [0, 4], op: [0, 1] },
    { a: [2, 0], b: [2, 2], c: [2, 4], op: [2, 1] },
    { a: [4, 0], b: [4, 2], c: [4, 4], op: [4, 1] },
    { a: [0, 0], b: [2, 0], c: [4, 0], op: [1, 0] },
    { a: [0, 2], b: [2, 2], c: [4, 2], op: [1, 2] },
    { a: [0, 4], b: [2, 4], c: [4, 4], op: [1, 4] },
  ]
};

let currentStageIndex = 0;
let puzzle = null;
let activeKey = null;
let isFreeplay = false;

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

// Generátor seedovania pre "Wordle" rovnaké puzzle pre všetkých v daný deň
function createPRNG(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function getDailySeed(stageIdx) {
  const dateStr = getTodayString().replace(/-/g, "");
  return parseInt(dateStr, 10) * 100 + stageIdx + 7;
}

function loadDailyProgress() {
  const today = getTodayString();
  const lastPlayed = localStorage.getItem("logico_last_completed_date");
  let streak = parseInt(localStorage.getItem("logico_daily_streak") || "0", 10);

  if (lastPlayed) {
    const lastDate = new Date(lastPlayed);
    const currentDate = new Date(today);
    const diffDays = Math.round((currentDate - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
      streak = 0;
      localStorage.setItem("logico_daily_streak", "0");
    }
  }

  streakEl.textContent = String(streak);

  if (lastPlayed === today) {
    isFreeplay = true;
    enableFreeplayMode();
    return true;
  }
  return false;
}

function enableFreeplayMode() {
  stageLabelEl.textContent = "Freeplay ♾️";
  stageBadgeEl.className = "stat stage-extreme";
  setFeedback("You solved today's challenge! Enjoy endless Freeplay mode.", "good");
  nextBtn.textContent = "Next Freeplay";
  nextBtn.disabled = false;
  generateFreeplayPuzzle();
}

function completeDailyChallenge() {
  const today = getTodayString();
  let streak = parseInt(localStorage.getItem("logico_daily_streak") || "0", 10) + 1;
  const completedDays = JSON.parse(localStorage.getItem("logico_completed_days") || "[]");

  if (!completedDays.includes(today)) {
    completedDays.push(today);
  }

  localStorage.setItem("logico_daily_streak", String(streak));
  localStorage.setItem("logico_last_completed_date", today);
  localStorage.setItem("logico_completed_days", JSON.stringify(completedDays));

  streakEl.textContent = String(streak);
  isFreeplay = true;

  nextBtn.textContent = "Freeplay ♾️";
  nextBtn.disabled = false;
  checkBtn.disabled = true;
  setFeedback("Awesome! You completed today's challenge. Click 'Freeplay' to play infinite puzzles!", "good");
}

function applyOp(a, op, b) {
  if (op === "+") return a + b;
  if (op === "−") return a - b;
  if (op === "×") return a * b;
  if (op === "÷") return b !== 0 && a % b === 0 ? a / b : null;
  return null;
}

function keyOf(r, c) { return `${r},${c}`; }

function generatePuzzleData(stageIndex, isFreeplayMode = false) {
  const stage = STAGES[stageIndex];
  const template = TEMPLATE_GRID;
  const rng = isFreeplayMode ? Math.random : createPRNG(getDailySeed(stageIndex));
  const opMap = { "+": "+", "-": "−", "*": "×", "/": "÷" };

  for (let attempt = 0; attempt < 1000; attempt++) {
    const values = {};
    const ops = [];
    let success = true;

    // Horizontálne rovnice
    for (let eqIdx = 0; eqIdx < 3; eqIdx++) {
      const opChoice = opMap[stage.ops[Math.floor(rng() * stage.ops.length)]];
      ops.push(opChoice);

      let a = Math.floor(rng() * (stage.maxNum - stage.minNum + 1)) + stage.minNum;
      let b = Math.floor(rng() * (stage.maxNum - stage.minNum + 1)) + stage.minNum;

      if (opChoice === "−" && a < b) [a, b] = [b, a];
      if (opChoice === "÷") {
        let mult = Math.floor(rng() * 4) + 1;
        b = Math.floor(rng() * (Math.min(10, stage.maxNum) - stage.minNum + 1)) + stage.minNum;
        a = b * mult;
      }

      let c = applyOp(a, opChoice, b);
      if (c === null || c < stage.minNum || c > stage.maxNum) {
        success = false; break;
      }

      const eq = template.equations[eqIdx];
      values[keyOf(eq.a[0], eq.a[1])] = a;
      values[keyOf(eq.b[0], eq.b[1])] = b;
      values[keyOf(eq.c[0], eq.c[1])] = c;
    }

    if (!success) continue;

    // Vertikálne rovnice
    for (let eqIdx = 3; eqIdx < 6; eqIdx++) {
      const eq = template.equations[eqIdx];
      const a = values[keyOf(eq.a[0], eq.a[1])];
      const b = values[keyOf(eq.b[0], eq.b[1])];

      const validOps = stage.ops.map(o => opMap[o]).filter(op => {
        const res = applyOp(a, op, b);
        return res !== null && res >= stage.minNum && res <= stage.maxNum;
      });

      if (validOps.length === 0) { success = false; break; }

      const opChoice = validOps[Math.floor(rng() * validOps.length)];
      ops.push(opChoice);
      values[keyOf(eq.c[0], eq.c[1])] = applyOp(a, opChoice, b);
    }

    if (!success) continue;

    // Výber skrytých políčok
    const blanks = new Set();
    const numberKeys = Object.keys(values);
    numberKeys.sort(() => rng() - 0.5);

    numberKeys.slice(0, stage.hide).forEach(k => blanks.add(k));

    return { template, ops, values, blanks };
  }

  return {
    template,
    ops: ["+", "+", "+", "+", "+", "+"],
    values: { "0,0": 10, "0,2": 15, "0,4": 25, "2,0": 20, "2,2": 30, "2,4": 50, "4,0": 30, "4,2": 45, "4,4": 75 },
    blanks: new Set(["0,0", "0,2", "2,0"])
  };
}

function renderPuzzle() {
  const { template, ops, values, blanks } = puzzle;
  puzzleGrid.style.gridTemplateColumns = `repeat(${template.cols}, minmax(0, 1fr))`;
  puzzleGrid.replaceChildren();

  template.cells.forEach((row, r) => {
    row.forEach((type, c) => {
      const el = document.createElement(type === "n" && blanks.has(keyOf(r, c)) ? "button" : "div");
      el.className = "cell";
      el.style.gridColumn = String(c + 1);
      el.style.gridRow = String(r + 1);

      if (!type) {
        el.classList.add("blocked");
      } else if (type === "op") {
        el.classList.add("op");
        const eqIndex = template.equations.findIndex((eq) => eq.op[0] === r && eq.op[1] === c);
        el.textContent = ops[eqIndex] ?? "";
      } else if (type === "eq") {
        el.classList.add("eq");
        el.textContent = "=";
      } else if (blanks.has(keyOf(r, c))) {
        el.classList.add("blank");
        el.type = "button";
        el.dataset.key = keyOf(r, c);
        el.addEventListener("click", () => selectCell(el));
      } else {
        el.classList.add("given");
        el.textContent = String(values[keyOf(r, c)]);
        el.dataset.key = keyOf(r, c);
        el.dataset.given = "true";
      }
      puzzleGrid.appendChild(el);
    });
  });
}

function blankButtons() { return [...puzzleGrid.querySelectorAll(".blank")]; }

function selectCell(el) {
  blankButtons().forEach((btn) => btn.classList.remove("active"));
  el.classList.add("active");
  activeKey = el.dataset.key;
  numpadLabel.textContent = el.textContent ? `Editing ${el.textContent}` : "Enter a number";
  numpadEl.hidden = false;
}

function closeNumpad() {
  numpadEl.hidden = true;
  blankButtons().forEach((btn) => btn.classList.remove("active"));
  activeKey = null;
}

function activeCell() { return blankButtons().find((btn) => btn.dataset.key === activeKey) || null; }

function fillActive(digit) {
  const cell = activeCell();
  if (!cell) return;

  if (cell.textContent.length < 2) {
    cell.textContent += digit;
  } else {
    cell.textContent = digit;
  }

  cell.classList.remove("correct", "incorrect");
}

function clearActive() {
  const cell = activeCell();
  if (!cell) return;
  cell.textContent = "";
  cell.classList.remove("correct", "incorrect");
}

function buildNumpad() {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "Next"];
  numpadKeys.replaceChildren();
  keys.forEach((label) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    if (label === "⌫" || label === "Next") btn.classList.add("key-action");
    btn.addEventListener("click", () => {
      if (label === "⌫") clearActive();
      else if (label === "Next") {
        const remaining = blankButtons().filter((b) => b.textContent === "" || b.dataset.key !== activeKey);
        const current = activeCell();
        const nextEmpty = blankButtons().find((b) => b.textContent === "" && b !== current);
        if (nextEmpty) selectCell(nextEmpty);
        else if (remaining[0]) selectCell(remaining[0]);
      } else fillActive(label);
    });
    numpadKeys.appendChild(btn);
  });
}

function setFeedback(message, kind) {
  feedbackEl.textContent = message;
  feedbackEl.className = `feedback ${kind}`;
}

function checkAnswers() {
  if (!puzzle) return;
  const blanks = blankButtons();
  let correctCount = 0;

  blanks.forEach((btn) => {
    const k = btn.dataset.key;
    const userVal = Number(btn.textContent);
    const expectedVal = puzzle.values[k];

    btn.classList.remove("correct", "incorrect");
    if (btn.textContent !== "" && userVal === expectedVal) {
      btn.classList.add("correct");
      correctCount++;
    } else {
      btn.classList.add("incorrect");
    }
  });

  const allCorrect = correctCount === blanks.length;

  if (allCorrect) {
    checkBtn.disabled = true;

    if (isFreeplay) {
      nextBtn.disabled = false;
      setFeedback("Great job! Puzzle solved.", "good");
    } else if (currentStageIndex === STAGES.length - 1) {
      completeDailyChallenge();
    } else {
      nextBtn.disabled = false;
      setFeedback('Stage completed! Click "Next Puzzle" to proceed.', "good");
    }
  } else {
    setFeedback("Some numbers are incorrect. Check the red boxes!", "bad");
  }
  closeNumpad();
}

function nextStage() {
  if (isFreeplay) {
    generateFreeplayPuzzle();
  } else if (currentStageIndex < STAGES.length - 1) {
    currentStageIndex++;
    generatePuzzle();
  } else {
    enableFreeplayMode();
  }
}

function updateStageBadge(stage) {
  stageLabelEl.textContent = stage.name;
  stageBadgeEl.className = `stat ${stage.cls}`;
}

function generatePuzzle() {
  const stage = STAGES[currentStageIndex];
  updateStageBadge(stage);

  puzzle = generatePuzzleData(currentStageIndex, false);
  checkBtn.disabled = false;
  nextBtn.disabled = true;
  nextBtn.textContent = "Next Puzzle";
  closeNumpad();
  renderPuzzle();
  setFeedback(`Solve stage: ${stage.name}`, "neutral");
}

function generateFreeplayPuzzle() {
  updateStageBadge(STAGES[4]);
  stageLabelEl.textContent = "Freeplay ♾️";

  puzzle = generatePuzzleData(4, true);
  checkBtn.disabled = false;
  nextBtn.disabled = true;
  closeNumpad();
  renderPuzzle();
  setFeedback("Freeplay mode: Solve the puzzle!", "neutral");
}

function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const completedDays = JSON.parse(localStorage.getItem("logico_completed_days") || "[]");

  const monthNames = ["Január", "Február", "Marec", "Apríl", "Máj", "Jún", "Júl", "August", "September", "Október", "November", "December"];
  calendarMonthName.textContent = `${monthNames[month]} ${year}`;

  calendarGrid.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7;

  for (let i = 0; i < startOffset; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "day-cell empty";
    calendarGrid.appendChild(emptyCell);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dayCell = document.createElement("div");
    dayCell.className = "day-cell";
    dayCell.textContent = d;

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (completedDays.includes(dateStr)) {
      dayCell.classList.add("completed");
    }
    calendarGrid.appendChild(dayCell);
  }
}

streakBtn.addEventListener("click", () => {
  renderCalendar();
  calendarModal.hidden = false;
});

modalClose.addEventListener("click", () => calendarModal.hidden = true);
checkBtn.addEventListener("click", checkAnswers);
nextBtn.addEventListener("click", nextStage);
numpadClose.addEventListener("click", closeNumpad);

document.addEventListener("keydown", (event) => {
  if (numpadEl.hidden && !activeKey) return;
  if (event.key >= "0" && event.key <= "9") {
    event.preventDefault();
    fillActive(event.key);
  } else if (event.key === "Backspace") {
    event.preventDefault();
    clearActive();
  } else if (event.key === "Escape") {
    closeNumpad();
  }
});

buildNumpad();
if (!loadDailyProgress()) {
  generatePuzzle();
}
