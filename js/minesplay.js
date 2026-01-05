/* ================== DOM ELEMENTS (MUST BE FIRST) ================== */

let shapeGrid = [];

const game = document.getElementById("game");
const status = document.getElementById("status");
const mineCounter = document.getElementById("mineCount");
const timerDisplay = document.getElementById("timer");
const modes = document.getElementById("modes");

/* ================== URL PARAMS ================== */

const params = new URLSearchParams(window.location.search);
const selectedMap = decodeURIComponent(params.get("map"));
if (!selectedMap) {
  status.textContent = "No map selected.";
  throw new Error("No map parameter in URL");
}

/* ================== GAME STATE ================== */

let mineGrid, revealed, flagged;
let validCells = [];
let MINE_COUNT = 0;
let gameOver = false;
let minesPlaced = false;
let timer = 0;
let interval;

/* ================== LOAD MAP DATA ================== */

fetch("../json/mines.json")
  .then(res => res.json())
  .then(data => {
    console.log("Loaded maps:", data.maps);

    const map = data.maps.find(
      m => m.name.toLowerCase() === selectedMap.toLowerCase()
    );

    if (!map) {
      status.textContent = "Map not found.";
      return;
    }

    if (!map.modes || !map.modes.length) {
      status.textContent = "No modes available for this map.";
      return;
    }

    renderModes(map.modes);
    loadMode(map.modes[0].grid);
    
  })
  .catch(err => {
    console.error(err);
    status.textContent = "Failed to load map data.";
  });
  

/* ================== MODE BUTTONS ================== */

function renderModes(modes) {
  const container = document.getElementById("modes");
  container.innerHTML = "";

  modes.forEach((mode, i) => {
    const btn = document.createElement("button");
    btn.className = "btn btn-outline-primary";
    btn.textContent = `Mode ${mode.mode + 1}`;

    btn.onclick = () => {
      document
        .querySelectorAll("#modes button")
        .forEach((b) => b.classList.remove("active"));

      btn.classList.add("active");
      loadMode(mode.grid);
    };

    if (i === 0) btn.classList.add("active");
    container.appendChild(btn);
  });
}

function loadMode(grid) {
  shapeGrid = grid;
  restart();
}

/* ================== HELPERS ================== */

function inBounds(r, c) {
  return shapeGrid[r]?.[c] === 1;
}

function forEachCell(fn) {
  shapeGrid.forEach((row, r) => row.forEach((v, c) => v && fn(r, c)));
}

/* ================== TIMER ================== */

function startTimer() {
  interval = setInterval(() => {
    timer++;
    timerDisplay.textContent = timer;
  }, 1000);
}

/* ================== GAME SETUP ================== */

function restart() {
  clearInterval(interval);
  timer = 0;
  timerDisplay.textContent = 0;
  status.textContent = "";
  game.innerHTML = "";
  gameOver = false;
  minesPlaced = false;

  if (!shapeGrid.length) return;

  validCells = [];
  forEachCell((r, c) => validCells.push([r, c]));

  MINE_COUNT = Math.ceil(validCells.length * 0.15);
  mineCounter.textContent = MINE_COUNT;

  mineGrid = shapeGrid.map((row) => row.map(() => 0));
  revealed = shapeGrid.map((row) => row.map(() => false));
  flagged = shapeGrid.map((row) => row.map(() => false));

  createBoard();
}

/* ================== MINES ================== */

function placeMinesSafe(sr, sc) {
  const forbidden = new Set();

  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) forbidden.add(`${sr + dr},${sc + dc}`);

  validCells
    .filter(([r, c]) => !forbidden.has(`${r},${c}`))
    .sort(() => Math.random() - 0.5)
    .slice(0, MINE_COUNT)
    .forEach(([r, c]) => (mineGrid[r][c] = 1));

  minesPlaced = true;
  startTimer();
}

function countMines(r, c) {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) if (mineGrid[r + dr]?.[c + dc]) count++;
  return count;
}

/* ================== REVEAL ================== */

function revealCell(cell, r, c) {
  if (gameOver || revealed[r][c] || flagged[r][c]) return;

  revealed[r][c] = true;
  cell.classList.add("revealed");

  const n = countMines(r, c);
  if (n) {
    cell.textContent = n;
    cell.classList.add("n" + n);
    return;
  }

  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++)
      if (inBounds(r + dr, c + dc)) {
        const next = document.querySelector(
          `.cell[data-row="${r + dr}"][data-col="${c + dc}"]`
        );
        revealCell(next, r + dr, c + dc);
      }
}

/* ================== WIN CHECK ================== */

function checkWin() {
  let revealedSafe = 0;

  forEachCell((r, c) => {
    if (revealed[r][c] && !mineGrid[r][c]) revealedSafe++;
  });

  if (revealedSafe === validCells.length - MINE_COUNT) {
    gameOver = true;
    clearInterval(interval);
    status.textContent = "🎉 You Win!";
  }
}

/* ================== INPUT HANDLERS ================== */

function handleClick(cell, r, c) {
  if (gameOver) return;

  if (!minesPlaced) placeMinesSafe(r, c);

  if (mineGrid[r][c]) {
    cell.textContent = "💣";
    status.textContent = "💥 Game Over";
    gameOver = true;
    clearInterval(interval);

    document.querySelectorAll(".cell").forEach((el) => {
      const rr = +el.dataset.row;
      const cc = +el.dataset.col;
      if (mineGrid[rr]?.[cc]) el.textContent = "💣";
    });
    return;
  }

  revealCell(cell, r, c);
  checkWin();
}

function handleRightClick(e, cell, r, c) {
  e.preventDefault();
  if (gameOver || revealed[r][c]) return;

  flagged[r][c] = !flagged[r][c];
  cell.textContent = flagged[r][c] ? "🚩" : "";
  cell.classList.toggle("flagged");

  const flagsUsed = flagged.flat().filter(Boolean).length;
  mineCounter.textContent = MINE_COUNT - flagsUsed;
}

/* ================== BOARD ================== */

function createBoard() {
  const maxCols = Math.max(...shapeGrid.map(row => row.length));

  // IMPORTANT FIX
  game.style.gridTemplateColumns = `repeat(${maxCols}, 42px)`;

  shapeGrid.forEach((row, r) =>
    row.forEach((v, c) => {
      const cell = document.createElement("div");
      cell.className = "cell" + (v ? "" : " hidden");

      if (v) {
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.onclick = () => handleClick(cell, r, c);
        cell.oncontextmenu = (e) => handleRightClick(e, cell, r, c);
      }

      game.appendChild(cell);
    })
  );
}