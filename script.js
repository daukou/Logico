const puzzleGrid = document.getElementById("puzzle-grid");
const streakEl = document.getElementById("streak");
const stageLabelEl = document.getElementById("stage-label");
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

const STAGES = [
  { name: "1/5 Easy", hide: 3 },
  { name: "2/5 Medium", hide: 4 },
  { name: "3/5 Hard", hide: 5 },
  { name: "4/5 Ultra Hard", hide: 6 },
  { name: "5/5 Extreme", hide: 7 }
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
let checkedThisRound = false;
let puzzle = null;
let activeKey = null;

function getTodayString() {
  return new Date().toISOString().split('T')[0];
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
    setFeedback("Dnešnú výzvu si už úspešne dokončil! Vráť sa zajtra.", "good");
    checkBtn.disabled = true;
    nextBtn.disabled = true;
    stageLabelEl.textContent = "Done 🎉";
    return true;
  }
  return false;
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
  stageLabelEl.textContent = "Done 🎉";
  setFeedback("Výborne! Dokončil si dnešné Extreme puzzle a získal Streak 🔥", "good");
  nextBtn.disabled = true;
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

function isValidNumber(n) { return Number.isInteger(n) && n >= 1 && n <= 99; }
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

function trySolve(template, ops) {
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
          if (!isValidNumber(res)) return false;
          set(eq.c, res); changed = true;
        } else if (a !== undefined && c !== undefined && b === undefined) {
          const res = invertForB(a, op, c);
          if (!isValidNumber(res)) return false;
          set(eq.b, res); changed = true;
        } else if (b !== undefined && c !== undefined && a === undefined) {
          const res = invertForA(b, op, c);
          if (!isValidNumber(res)) return false;
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
    const options = Array.from({length: 12}, (_, i) => i + 1);
    for (let i = options.length - 1; i > 0; i -= 1) {
      const j = randInt(0, i);
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

function generatePuzzleData() {
  const currentStage = STAGES[currentStageIndex];
  const targetHide = currentStage.hide;

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const template = pick(TEMPLATES);
    const ops = template.equations.map(() => pick(["+", "+", "×", "−", "÷", "×"]));
    const values = trySolve(template, ops);
    if (!values) continue;

    const nums = numberCells(template);
    const hideable = nums.filter(([r, c]) => values[keyOf(r, c)] <= 99);
    if (hideable.length < targetHide) continue;

    const blanks = new Set();
    const shuffled = [...hideable].sort(() => Math.random() - 0.5);
    shuffled.slice(0, targetHide).forEach((pos) => blanks.add(keyOf(pos[0], pos[1])));

    return { template, ops, values, blanks };
  }
  return fallbackPuzzle();
}

function fallbackPuzzle() {
  const template = TEMPLATES[0];
  const ops = ["+", "+", "+", "+", "+", "+"];
  const values = { "0,0": 2, "0,2": 3, "0,4": 5, "2,0": 4, "2,2": 1, "2,4": 5, "4,0": 6, "4,2": 4, "4,4": 10 };
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
  cell.textContent = digit;
  cell.classList.remove("correct", "incorrect");
  const remaining = blankButtons().filter((btn) => btn.textContent === "");
  const next = remaining.find((btn) => btn !== cell) || remaining[0];
  if (next) selectCell(next);
  else closeNumpad();
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

function cellValue(pos) {
  const k = keyOf(pos[0], pos[1]);
  const given = puzzleGrid.querySelector(`[data-key="${k}"][data-given="true"]`);
  if (given) return Number(given.textContent);
  const blank = puzzleGrid.querySelector(`button.blank[data-key="${k}"]`);
  if (!blank || blank.textContent === "") return null;
  const n = Number(blank.textContent);
  return Number.isInteger(n) ? n : null;
}

function equationSatisfied(eq, op) {
  const a = cellValue(eq.a); const b = cellValue(eq.b); const c = cellValue(eq.c);
  if (a === null || b === null || c === null) return false;
  return applyOp(a, op, b) === c;
}

function checkAnswers() {
  if (!puzzle) return;
  const blanks = blankButtons();
  const eqResults = puzzle.template.equations.map((eq, i) => equationSatisfied(eq, puzzle.ops[i]));
  const solvedEq = eqResults.filter(Boolean).length;

  blanks.forEach((btn) => {
    const pos = btn.dataset.key.split(",").map(Number);
    const related = puzzle.template.equations.some((eq, i) => {
      const used = [keyOf(eq.a[0], eq.a[1]), keyOf(eq.b[0], eq.b[1]), keyOf(eq.c[0], eq.c[1])];
      return used.includes(keyOf(pos[0], pos[1])) && !eqResults[i];
    });
    btn.classList.remove("correct", "incorrect");
    if (btn.textContent === "" || related) btn.classList.add("incorrect");
    else btn.classList.add("correct");
  });

  const allFilled = blanks.every((btn) => btn.textContent !== "");
  const allSolved = allFilled && solvedEq === puzzle.template.equations.length;

  if (allSolved) {
    checkedThisRound = true;
    checkBtn.disabled = true;
    nextBtn.disabled = false;

    if (currentStageIndex === STAGES.length - 1) {
      completeDailyChallenge();
    } else {
      setFeedback(`Etapa dokončená! Klikni na "Next Puzzle" pre postúpenie.`, "good");
    }
  } else {
    setFeedback(`Niektoré výpočty nesedia. Skontroluj červené políčka!`, "bad");
  }
  closeNumpad();
}

function nextStage() {
  if (currentStageIndex < STAGES.length - 1) {
    currentStageIndex++;
    generatePuzzle();
  }
}

function generatePuzzle() {
  stageLabelEl.textContent = STAGES[currentStageIndex].name;
  puzzle = generatePuzzleData();
  checkedThisRound = false;
  checkBtn.disabled = false;
  nextBtn.disabled = true;
  closeNumpad();
  renderPuzzle();
  setFeedback(`Vyrieš etapu: ${STAGES[currentStageIndex].name}`, "neutral");
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
