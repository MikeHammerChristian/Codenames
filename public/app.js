const WORDS = [
  "AFRICA","AGENT","AIR","ALIEN","ALPS","AMAZON","AMBULANCE","AMERICA","ANGEL","ANTARCTICA",
  "APPLE","ARM","ATLANTIS","AUSTRALIA","AZTEC","BACK","BALL","BAND","BANK","BAR",
  "BARK","BAT","BATTERY","BEACH","BEAR","BEAT","BED","BEIJING","BELL","BELT",
  "BERLIN","BERMUDA","BERRY","BILL","BLOCK","BOARD","BOLT","BOMB","BOND","BOOM",
  "BOOT","BOTTLE","BOW","BOX","BRIDGE","BRUSH","BUCK","BUFFALO","BUG","BUGLE",
  "BUTTON","CALF","CANADA","CAP","CAPITAL","CAR","CARD","CARROT","CASINO","CAST",
  "CAT","CELL","CENTAUR","CENTER","CHAIR","CHANGE","CHARGE","CHECK","CHEST","CHICK",
  "CHINA","CHOCOLATE","CHURCH","CIRCLE","CLIFF","CLOAK","CLUB","CODE","COLD","COMIC",
  "COMPOUND","CONCERT","CONDUCTOR","CONTRACT","COOK","COPPER","COTTON","COURT","COVER","CRANE",
  "CRASH","CRICKET","CROSS","CROWN","CYCLE","CZECH","DANCE","DATE","DAY","DEATH",
  "DECK","DEGREE","DIAMOND","DICE","DINOSAUR","DISEASE","DOCTOR","DOG","DRAFT","DRAGON",
  "DRESS","DRILL","DROP","DUCK","DWARF","EAGLE","EGYPT","EMBASSY","ENGINE","ENGLAND",
  "EUROPE","EYE","FACE","FAIR","FALL","FAN","FENCE","FIELD","FIGHTER","FIGURE",
  "FILE","FILM","FIRE","FISH","FLUTE","FLY","FOOT","FORCE","FOREST","FORK",
  "FRANCE","GAME","GAS","GENIUS","GERMANY","GHOST","GIANT","GLASS","GLOVE","GOLD",
  "GRACE","GRASS","GREECE","GREEN","GROUND","HAM","HAND","HAWK","HEAD","HEART",
  "HELICOPTER","HIMALAYAS","HOLE","HOLLYWOOD","HONEY","HOOD","HOOK","HORN","HORSE","HORSESHOE",
  "HOSPITAL","HOTEL","ICE","ICE CREAM","INDIA","IRON","IVORY","JACK","JAM","JET",
  "JUPITER","KANGAROO","KETCHUP","KEY","KID","KING","KIWI","KNIFE","KNIGHT","LAB",
  "LAP","LASER","LAWYER","LEAD","LEMON","LIMOUSINE","LINK","LION","LITTER","LOCH NESS",
  "LOCK","LOG","LONDON","LUCK","MAIL","MAMMOTH","MAPLE","MARCH","MASS","MATCH",
  "MERCURY","MEXICO","MICROSCOPE","MILLIONAIRE","MINE","MINT","MISSILE","MODEL","MOLE","MOON",
  "MOSCOW","MOUNT","MOUSE","MOUTH","MUG","NAIL","NEEDLE","NET","NEW YORK","NIGHT",
  "NINJA","NOTE","NOVEL","NURSE","NUT","OCTOPUS","OIL","OLIVE","OLYMPUS","OPERA",
  "ORANGE","ORGAN","PALM","PAN","PANTS","PAPER","PARACHUTE","PARK","PART","PASS",
  "PASTE","PENGUIN","PHOENIX","PIANO","PIE","PILOT","PIN","PIPE","PIRATE","PISTOL",
  "PIT","PITCH","PLANE","PLASTIC","PLATE","PLATYPUS","PLAY","PLOT","POINT","POLE",
  "POLICE","POOL","PORT","POST","POUND","PRESS","PRINCESS","PUMPKIN","PUPIL","PYRAMID",
  "QUEEN","RABBIT","RACKET","RAY","REVOLUTION","RING","ROBIN","ROBOT","ROCK","ROME",
  "ROOT","ROSE","ROULETTE","ROUND","ROW","RULER","SATELLITE","SATURN","SCALE","SCHOOL",
  "SCIENTIST","SCORPION","SCREEN","SCUBA DIVER","SEAL","SERVER","SHADOW","SHAKESPEARE","SHARK","SHIP",
  "SHOE","SHOP","SHOT","SINK","SKYSCRAPER","SLIP","SLUG","SMUGGLER","SNOW","SNOWMAN",
  "SOCK","SOLDIER","SOUL","SOUND","SPACE","SPELL","SPIDER","SPIKE","SPINE","SPOT",
  "SPRING","SPY","SQUARE","STADIUM","STAFF","STAR","STATE","STICK","STREAM","STRIKE",
  "STRING","SUB","SUIT","SUPERHERO","SWING","SWITCH","TABLE","TABLET","TAG","TAIL",
  "TAP","TEACHER","TELESCOPE","TEMPLE","THEATER","THIEF","THUMB","TICK","TIE","TIME",
  "TOKYO","TOOTH","TORCH","TOWER","TRACK","TRAIN","TRIANGLE","TRIP","TRUNK","TUBE",
  "TURKEY","UNDERTAKER","UNICORN","VACUUM","VAN","VET","WAKE","WALL","WAR","WASHER",
  "WASHINGTON","WATCH","WATER","WAVE","WEB","WELL","WHALE","WHIP","WIND","WITCH",
  "WORM","YARD"
];

// Simple seeded random for reproducible boards
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateBoard(seed) {
  const rng = mulberry32(seed);
  const words = shuffle(WORDS, rng).slice(0, 25);
  // 9 of starting team, 8 of other, 7 neutral, 1 assassin
  const startingTeam = rng() < 0.5 ? "red" : "blue";
  const layout = [];
  for (let i = 0; i < 9; i++) layout.push(startingTeam);
  for (let i = 0; i < 8; i++) layout.push(startingTeam === "red" ? "blue" : "red");
  for (let i = 0; i < 7; i++) layout.push("neutral");
  layout.push("assassin");
  const shuffledLayout = shuffle(layout, rng);

  return {
    words,
    colors: shuffledLayout,
    startingTeam,
    seed
  };
}

// ---------- Socket & Game State ----------
const socket = io();

let state = {
  room: null,
  playerId: null,
  name: "",
  team: null,
  role: null,
  isSpymaster: false,
  game: null, // full game state from server
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Lobby
$("#join-btn").addEventListener("click", () => {
  const name = $("#player-name").value.trim() || "Player";
  const code = ($("#room-code").value.trim() || "TEAM").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  if (!code) return alert("Enter a room code");
  state.name = name;
  socket.emit("join", { room: code, name });
});

$("#room-code").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("#join-btn").click();
});

// Role buttons
$$(".role-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const team = btn.dataset.team;
    const role = btn.dataset.role;
    socket.emit("setRole", { team, role });
  });
});

$("#start-game-btn").addEventListener("click", () => {
  socket.emit("startGame");
});

$("#new-game-btn").addEventListener("click", () => {
  if (confirm("Start a new board?")) socket.emit("newGame");
});

$("#give-clue-btn").addEventListener("click", () => {
  const word = $("#clue-word").value.trim();
  const number = parseInt($("#clue-number").value, 10);
  if (!word || isNaN(number) || number < 0) return;
  socket.emit("giveClue", { word, number });
  $("#clue-word").value = "";
});

$("#end-turn-btn").addEventListener("click", () => {
  socket.emit("endTurn");
});

$("#leave-btn").addEventListener("click", () => {
  location.reload();
});

$("#copy-link").addEventListener("click", () => {
  const url = `${location.origin}?room=${state.room}`;
  navigator.clipboard.writeText(url).then(() => {
    $("#copy-link").textContent = "Copied!";
    setTimeout(() => $("#copy-link").textContent = "Copy Link", 1500);
  });
});

// Auto-join from URL
window.addEventListener("load", () => {
  const params = new URLSearchParams(location.search);
  const room = params.get("room");
  if (room) {
    $("#room-code").value = room.toUpperCase();
  }
});

// ---------- Socket handlers ----------
socket.on("joined", (data) => {
  state.room = data.room;
  state.playerId = data.playerId;
  $("#lobby").classList.add("hidden");
  $("#game").classList.remove("hidden");
  $("#room-display").textContent = data.room;
  render(data.game);
});

socket.on("update", (game) => {
  state.game = game;
  render(game);
});

socket.on("error", (msg) => {
  alert(msg);
});

socket.on("message", (msg) => {
  showMessage(msg.text, msg.type || "");
});

// ---------- Render ----------
function render(game) {
  if (!game) return;

  // Players
  const list = $("#players-list");
  list.innerHTML = "";
  game.players.forEach(p => {
    const div = document.createElement("div");
    div.className = "player";
    const teamClass = p.team || "none";
    div.innerHTML = `<span class="dot ${teamClass}"></span><span>${escapeHtml(p.name)}</span>
      <span style="margin-left:auto;font-size:0.8rem;color:var(--muted)">${p.role || ""}</span>`;
    list.appendChild(div);
  });

  // My role
  const me = game.players.find(p => p.id === state.playerId);
  if (me) {
    state.team = me.team;
    state.role = me.role;
    state.isSpymaster = me.role === "spymaster";
    $("#my-role").textContent = me.team && me.role
      ? `${me.team.toUpperCase()} ${me.role}`
      : "Pick a team & role";
  }

  // Highlight active role button
  $$(".role-btn").forEach(btn => {
    const active = btn.dataset.team === state.team && btn.dataset.role === state.role;
    btn.classList.toggle("active", active);
  });

  // Scores
  $("#red-score").textContent = game.remaining.red;
  $("#blue-score").textContent = game.remaining.blue;

  // Turn / status
  let turnText = "";
  if (!game.started) {
    turnText = "Waiting to start…";
    $("#start-game-btn").classList.toggle("hidden", !canStart(game));
    $("#new-game-btn").classList.add("hidden");
  } else if (game.winner) {
    turnText = game.winner === "red" ? "🔴 Red wins!" : "🔵 Blue wins!";
    $("#start-game-btn").classList.add("hidden");
    $("#new-game-btn").classList.remove("hidden");
  } else {
    turnText = `${game.turn.toUpperCase()} team's turn`;
    if (game.clue) turnText += ` — Clue: ${game.clue.word} ${game.clue.number}`;
    $("#start-game-btn").classList.add("hidden");
    $("#new-game-btn").classList.remove("hidden");
  }
  $("#turn-text").textContent = turnText;

  // Clue UI
  const isMyTurnSpymaster = game.started && !game.winner && state.isSpymaster && state.team === game.turn && !game.clue;
  $("#clue-section").classList.toggle("hidden", !isMyTurnSpymaster);

  const showCurrentClue = game.started && game.clue && !game.winner;
  $("#current-clue").classList.toggle("hidden", !showCurrentClue);
  if (game.clue) {
    $("#clue-text").textContent = game.clue.word;
    $("#clue-num").textContent = game.clue.number;
  }

  // Only operatives of the current team can end turn (or anyone if no operatives)
  const canEnd = game.started && game.clue && state.team === game.turn && state.role === "operative";
  $("#end-turn-btn").style.display = canEnd ? "inline-block" : "none";

  // Board
  renderBoard(game);
}

function canStart(game) {
  // At least one player on each team or just allow start
  return game.players.length >= 2;
}

function renderBoard(game) {
  const board = $("#board");
  board.innerHTML = "";
  if (!game.board) return;

  game.board.words.forEach((word, i) => {
    const color = game.board.colors[i];
    const revealed = game.revealed[i];
    const tile = document.createElement("div");
    tile.className = "card-tile";
    tile.textContent = word;

    if (revealed) {
      tile.classList.add("revealed", color);
    } else if (state.isSpymaster) {
      tile.classList.add("spymaster", color);
    }

    // Operatives can click unrevealed cards on their team's turn after a clue
    const canGuess = game.started && !game.winner && game.clue &&
      state.role === "operative" && state.team === game.turn && !revealed;

    if (canGuess) {
      tile.addEventListener("click", () => {
        socket.emit("guess", { index: i });
      });
    } else {
      tile.style.cursor = "default";
    }

    board.appendChild(tile);
  });
}

function showMessage(text, type = "") {
  const el = $("#message");
  el.textContent = text;
  el.className = "message " + type;
  if (text) {
    setTimeout(() => {
      if (el.textContent === text) el.textContent = "";
    }, 4000);
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
