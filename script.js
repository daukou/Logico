const puzzleGrid = document.getElementById("puzzle-grid");
const scoreEl = document.getElementById("score");
const streakEl = document.getElementById("streak");
const checkBtn = document.getElementById("check-btn");
const nextBtn = document.getElementById("next-btn");
const feedbackEl = document.getElementById("feedback");
const numpadEl = document.getElementById("numpad");
const numpadKeys = document.getElementById("numpad-keys");
const numpadClose = document.getElementById("numpad-close");
const numpadLabel = document.getElementById("numpad-label");
const difficultySelect = document.getElementById("difficulty");

const OPS = ["+", "−", "×", "÷"];

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
  },
  {
    rows: 5,
    cols: 5,
    cells: [
      ["n", "op", "n", "eq", "n"],
      ["op", null, "op", null, null],
      ["n", "op", "n", "eq", "n"],
      ["eq", null, "eq", null, null],
      ["n", null, "n", null, null],
    ],
    equations: [
      { a: [0, 0], b: [0, 2], c: [0, 4], op: [0, 1] },
      { a: [2, 0], b: [2, 2], c: [2, 4], op: [2, 1] },
      { a: [0, 0], b: [2, 0], c: [4, 0], op: [1, 0] },
      { a: [0, 2], b: [2, 2], c: [4, 2], op: [1, 2] },
    ],
  },
];

let score = 0;
let checkedThisRound = false;
let puzzle = null;
let activeKey = null;

// SYSTÉM DENNÉHO STREAKU
function updateDailyStreak() {
  const today = new Date().toISOString().split('T')[0];
  const lastPlayed = localStorage.getItem("logico_last_played");
  let streak = parseInt(localStorage.getItem("logico_daily_streak") || "0", 10);

  if (lastPlayed) {
    const lastDate = new Date(lastPlayed);
    const currentDate = new Date(today);
    const diffTime = Math.abs(currentDate - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak += 1;
    } else if (diffDays > 1) {
      streak = 1; // Reset ak vynechal deň
    }
  } else {
    streak = 1;
  }

  localStorage.setItem("logico_daily_streak", String(streak));
  localStorage.setItem("logico_last_played", today);
  streakEl.textContent = String(streak);
}

function loadDailyStreak() {
  const today = new Date().toISOString().split('T')[0];
  const lastPlayed = localStorage.getItem("logico_last_played");
  let streak = parseInt(localStorage.getItem("logico_daily_streak") || "0", 10);

  if (lastPlayed) {
    const lastDate = new Date(lastPlayed);
    const currentDate = new Date(today);
    const diffTime = Math.abs(currentDate - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
      streak = 0;
      localStorage.setItem("logico_daily_streak", "0");
    }
  }
  streakEl.textContent = String(streak);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function keyOf(r, c) {
  return `${r},${c}`;
}

function applyOp(a, op, b) {
  if (op === "+") return a + b;
  if (op === "−") return a - b;
  if (op === "×") return a * b;
  if (op === "÷") return b !== 0 && a % b === 0 ? a / b : null;
  return null;
}

function isValidNumber(n) {
  return Number.isInteger(n) && n >= 1 && n <= 99;
}

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
    row.forEach((type, c) => {
      if (type === "n") cells.push([r, c]);
    });
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
        const a = get(eq.a);
        const b = get(eq.b);
        const c = get(eq.c);
        const known = [a, b, c].filter((n) => n !== undefined).length;

        if (known === 3) {
          if (applyOp(a, op, b) !== c) return false;
        } else if (a !== undefined && b !== undefined && c === undefined) {
          const result = applyOp(a, op, b);
          if (!isValidNumber(result)) return false;
          set(eq.c, result);
          changed = true;
        } else if (a !== undefined && c !== undefined && b === undefined) {
          const result = invertForB(a, op, c);
          if (!isValidNumber(result)) return false;
          set(eq.b, result);
          changed = true;
        } else if (b !== undefined && c !== undefined && a === undefined) {
          const result = invertForA(b, op, c);
          if (!isValidNumber(result)) return false;
          set(eq.a, result);
          changed = true;
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
    const options = [];
    for (let n = 1; n <= 12; n += 1) options.push(n);
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
  const diff = difficultySelect ? difficultySelect.value : "medium";
  let targetHide = 4;
  if (diff === "easy") targetHide = 3;
  if (diff === "medium") targetHide = randInt(4, 5);
  if (diff === "hard") targetHide = 6;

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
  const values = {
    "0,0": 2, "0,2": 3, "0,4": 5,
    "2,0": 4, "2,2": 1, "2,4": 5,
    "4,0": 6, "4,2": 4, "4,4": 10,
  };
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
        el.setAttribute("aria-hidden", "true");
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
        el.dataset.answer = String(values[keyOf(r, c)]);
        el.setAttribute("aria-label", `Empty cell at row ${r + 1}, column ${c + 1}`);
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

function blankButtons() {
  return [...puzzleGrid.querySelectorAll(".blank")];
}

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

function activeCell() {
  return blankButtons().find((btn) => btn.dataset.key === activeKey) || null;
}

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
  numpadLabel.textContent = "Enter a number";
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
  const a = cellValue(eq.a);
  const b = cellValue(eq.b);
  const c = cellValue(eq.c);
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
  const correctBlanks = blanks.filter((btn) => btn.classList.contains("correct")).length;

  if (!checkedThisRound) {
    score += solvedEq * 10;
    scoreEl.textContent = String(score);
    if (allSolved) {
      updateDailyStreak();
    }
    checkedThisRound = true;
    checkBtn.disabled = true;
    nextBtn.disabled = false;
  }

  closeNumpad();

  if (allSolved) {
    setFeedback(`Crossword complete! ${solvedEq} equations solved. +${solvedEq * 10} points.`, "good");
  } else {
    setFeedback(
      `${correctBlanks}/${blanks.length} cells fit. ${solvedEq}/${puzzle.template.equations.length} equations work.`,
      "bad"
    );
  }
}

function generatePuzzle() {
  puzzle = generatePuzzleData();
  checkedThisRound = false;
  checkBtn.disabled = false;
  nextBtn.disabled = true;
  closeNumpad();
  renderPuzzle();
  setFeedback("Fill every empty square. Across and down must both work.", "neutral");
}

checkBtn.addEventListener("click", checkAnswers);
nextBtn.addEventListener("click", generatePuzzle);
numpadClose.addEventListener("click", closeNumpad);
if (difficultySelect) {
  difficultySelect.addEventListener("change", generatePuzzle);
}

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

loadDailyStreak();
buildNumpad();
generatePuzzle();
