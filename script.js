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

// Definícia obtiažností podľa číselných rozsahov (1 alebo 2-ciferné čísla)
const STAGES = [
  { name: "1/5 Easy", cls: "stage-easy", hide: 4, minNum: 1, maxNum: 9, ops: ["+", "-"] },
  { name: "2/5 Medium", cls: "stage-medium", hide: 4, minNum: 1, maxNum: 20, ops: ["+", "-", "*"] },
  { name: "3/5 Hard", cls: "stage-hard", hide: 5, minNum: 5, maxNum: 50, ops: ["+", "-", "*", "/"] },
  { name: "4/5 Ultra Hard", cls: "stage-ultrahard", hide: 5, minNum: 10, maxNum: 99, ops: ["+", "-", "*", "/"] },
  { name: "5/5 Extreme", cls: "stage-extreme", hide: 6, minNum: 10, maxNum: 99, ops: ["+", "-", "*", "/"] }
];

const TEMPLATES = [
  {
    rows: 5,
    cols: 5,
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
    ],
  }
];

let currentStageIndex = 0;
let puzzle = null;
let activeKey = null;
let isFreeplay = false;

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

// Pseudo-náhodný generátor pre fixný denný Seed
function seededRandom(seed) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function getDailySeed(stageIdx) {
  const dateStr = getTodayString().replace(/-/g, "");
  return parseInt(dateStr, 10) * 10 + stageIdx;
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
  setFeedback("Dnešnú výzvu si už úspešne dokončil! Hráš neobmedzený Freeplay módu.", "good");
  nextBtn.textContent = "Next Puzzle (Freeplay)";
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

function randIntSeeded(min, max, seedState) {
  const rng = seededRandom(seedState.seed++);
  return Math.floor(rng * (max - min + 1)) + min;
}

function pickSeeded(arr, seedState) {
  return arr[randIntSeeded(0, arr.length - 1, seedState)];
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function keyOf(r, c) { return `${r},${c}`; }

function applyOp(a, op, b) {
  if (op === "+") return a + b;
  if (op === "−") return a - b;
  if (op === "×") return a * b;
  if (op === "÷") return b !== 0 && a % b === 0 ? a / b : null;
  return null;
}

function isValidNumber(n, min, max) { return Number.isInteger(n) && n >= min && n <= max; }

function invertForB(a, op, c) {
  if (op === "+") return c - a;
  if (op === "−") return a - c;
  if (op === "×") return a !== 0 && c % a === 0 ? c / a : null;
  if (op === "÷") return c !== 0 && a % c === 0 ? a / c : null;
  return null;
}
function invertForA(b, op, c) {
  if (op === "+") return c - b;
  if (op === "−") return c + b;
  if (op === "×") return b !== 0 && c % b === 0 ? c / b : null;
  if (op === "÷") return c * b;
  return null;
}

function numberCells(template) {
  const cells = [];
  template.cells.forEach((row, r) => {
    row.forEach((type, c) => { if (type === "n") cells.push([r, c]); });
  });
  return cells;
}

function trySolve(template, ops, minNum, maxNum, seedState) {
  const values = {};
  let nodes = 0;
  function get(pos) { return values[keyOf(pos[0], pos[1])]; }
  function set(pos, n) { values[keyOf(pos[0], pos[1])] = n; }

  function propagate() {
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < template.equations.length; i += 1) {
        const eq = template.equations[i];
        const op = ops[i];
        const a = get(eq.a); const b = get(eq.b); const c = get(eq.c);
        const known = [a, b, c].filter((n) => n !== undefined).length;

        if (known === 3) {
          if (applyOp(a, op, b) !== c) return false;
        } else if (a !== undefined && b !== undefined && c === undefined) {
          const res = applyOp(a, op, b);
          if (!isValidNumber(res, minNum, maxNum)) return false;
          set(eq.c, res); changed = true;
        } else if (a !== undefined && c !== undefined && b === undefined) {
          const res = invertForB(a, op, c);
          if (!isValidNumber(res, minNum, maxNum)) return false;
          set(eq.b, res); changed = true;
        } else if (b !== undefined && c !== undefined && a === undefined) {
          const res = invertForA(b, op, c);
          if (!isValidNumber(res, minNum, maxNum)) return false;
          set(eq.a, res); changed = true;
        }
      }
    }
    return true;
  }

  const cells = numberCells(template);
  function search(index) {
    if (++nodes > 3500) return false;
    if (!propagate()) return false;
    while (index < cells.length && get(cells[index]) !== undefined) index += 1;
    if (index >= cells.length) return true;

    const pos = cells[index];
    const options = Array.from({length: maxNum - minNum + 1}, (_, i) => i + minNum);
    
    // Zamiešanie možností
    for (let i = options.length - 1; i > 0; i -= 1) {
      const j = seedState ? randIntSeeded(0, i, seedState) : randInt(0, i);
      [options[i], options[j]] = [options[j], options[i]];
    }

    for (const n of options) {
      const snapshot = { ...values };
      set(pos, n);
      if (search(index + 1)) return true;
      Object.keys(values).forEach((k) => delete values[k]);
      Object.assign(values, snapshot);
    }
    return false;
  }
  return search(0) ? values : null;
}

function generatePuzzleData(stageIndex, isFreeplayMode = false) {
  const currentStage = STAGES[stageIndex];
  const targetHide = currentStage.hide;
  const seedState = isFreeplayMode ? null : { seed: getDailySeed(stageIndex) };

  const opSymbols = { "+": "+", "-": "−", "*": "×", "/": "÷" };

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const template = TEMPLATES[0];
    const rawOps = currentStage.ops.map(() => seedState ? pickSeeded(currentStage.ops, seedState) : pick(currentStage.ops));
    const ops = rawOps.map(o => opSymbols[o] || o);

    const values = trySolve(template, ops, currentStage.minNum, currentStage.maxNum, seedState);
    if (!values) continue;

    const nums = numberCells(template);
    const blanks = new Set();
    const shuffled = [...nums];
    
    if (seedState) {
      shuffled.sort(() => seededRandom(seedState.seed++) - 0.5);
    } else {
      shuffled.sort(() => Math.random() - 0.5);
    }

    shuffled.slice(0, targetHide).forEach((pos) => blanks.add(keyOf(pos[0], pos[1])));

    return { template, ops, values, blanks };
  }
  return fallbackPuzzle();
}

function fallbackPuzzle() {
  const template = TEMPLATES[0];
  const ops = ["+", "+", "+", "+", "+", "+"];
  const values = { "0,0": 12, "0,2": 15, "0,4": 27, "2,0": 10, "2,2": 20, "2,4": 30, "4,0": 22, "4,2": 35, "4,4": 57 };
  const blanks = new Set(["0,0", "0,2", "2,0"]);
  return { template, ops, values, blanks };
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
  
  // Umožní zápis až 2 cifier
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

// Skontroluje presnú hodnotu daného políčka na základe vygenerovaného puzzle
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
  updateStageBadge(STAGES[4]); // Extreme obtiažnosť
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
