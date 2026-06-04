const boardEl = document.querySelector("#board");
const trayEl = document.querySelector("#tray");
const levelText = document.querySelector("#levelText");
const leftText = document.querySelector("#leftText");
const comboText = document.querySelector("#comboText");
const goalText = document.querySelector("#goalText");
const coinText = document.querySelector("#coinText");
const reviveText = document.querySelector("#reviveText");
const trayCount = document.querySelector("#trayCount");
const messageEl = document.querySelector("#message");
const startScreen = document.querySelector("#startScreen");
const startScene = document.querySelector("#startScene");
const startBtn = document.querySelector("#startBtn");
const continueBtn = document.querySelector("#continueBtn");
const dialogBackdrop = document.querySelector("#dialogBackdrop");
const dialogMeme = document.querySelector("#dialogMeme");
const dialogTitle = document.querySelector("#dialogTitle");
const dialogText = document.querySelector("#dialogText");
const rewardRow = document.querySelector("#rewardRow");
const shopPanel = document.querySelector("#shopPanel");
const shopCoinText = document.querySelector("#shopCoinText");
const shopList = document.querySelector("#shopList");
const nextBtn = document.querySelector("#nextBtn");
const againBtn = document.querySelector("#againBtn");
const hintBtn = document.querySelector("#hintBtn");
const undoBtn = document.querySelector("#undoBtn");
const shuffleBtn = document.querySelector("#shuffleBtn");
const hintCount = document.querySelector("#hintCount");
const undoCount = document.querySelector("#undoCount");
const shuffleCount = document.querySelector("#shuffleCount");
const settingsBtn = document.querySelector("#settingsBtn");
const settingsPanel = document.querySelector("#settingsPanel");
const manualSaveBtn = document.querySelector("#manualSaveBtn");
const exitGameBtn = document.querySelector("#exitGameBtn");

const TRAY_LIMIT = 5;
const REVIVE_PRICE = 120;
const REVIVE_MAX = 2;
const SAVE_KEY = "zooMatchSaveV1";
const START_ITEMS = { hint: 1, undo: 1, shuffle: 1 };
const SHOP_ITEMS = [
  { id: "hint", name: "提示", price: 45, desc: "标出一张完全可点的牌" },
  { id: "undo", name: "撤回", price: 60, desc: "撤回上一步" },
  { id: "shuffle", name: "洗牌", price: 75, desc: "重排场上的牌" },
  { id: "revive", name: "复活", price: REVIVE_PRICE, desc: "槽满时继续一次", max: REVIVE_MAX },
];
const HAPPY_MEMES = [
  "./assets/meme-happy-1.png",
  "./assets/meme-happy-2.png",
  "./assets/meme-happy-3.png",
  "./assets/meme-happy-4.png",
];
const FAIL_MEMES = [
  "./assets/meme-fail-1.png",
  "./assets/meme-fail-2.png",
  "./assets/meme-fail-3.png",
];
const CONFUSE_MEMES = [
  "./assets/meme-confuse-1.png",
  "./assets/meme-confuse-2.png",
  "./assets/meme-confuse-3.png",
];
const ANIMAL_NAMES = {
  "capybara": "水豚",
  "cat": "小猫",
  "chick": "小鸡",
  "deer": "小鹿",
  "duck": "小鸭",
  "dwarf-rabbit": "侏儒兔",
  "fox": "狐狸",
  "frog": "青蛙",
  "hedgehog": "刺猬",
  "hippo": "河马",
  "monkey": "小猴",
  "octopus": "章鱼",
  "otter": "水獭",
  "owl": "猫头鹰",
  "panda": "熊猫",
  "penguin": "企鹅",
  "pig": "小猪",
  "red-panda": "小熊猫",
  "seal": "海豹",
  "sheep": "小羊",
  "turtle": "乌龟",
};

const ANIMALS = Object.entries(ANIMAL_NAMES).map(([id, name]) => ({
  id,
  name,
  icon: (mood = "normal") => animalImage(id, name, mood),
}));

const SCREENSHOT_ANIMAL_IDS = [
  "chick",
  "dwarf-rabbit",
  "penguin",
  "owl",
  "frog",
  "red-panda",
  "seal",
  "otter",
  "turtle",
  "hippo",
  "hedgehog",
  "capybara",
  "octopus",
  "panda",
  "fox",
  "cat",
  "pig",
  "duck",
  "sheep",
  "deer",
  "monkey",
];
const ANIMAL_BY_ID = new Map(ANIMALS.map((animal) => [animal.id, animal]));
const SCREENSHOT_ANIMALS = SCREENSHOT_ANIMAL_IDS.map((id) => ANIMAL_BY_ID.get(id)).filter(Boolean);

const state = {
  level: 1,
  seed: Math.floor(Math.random() * 100000),
  tiles: [],
  tray: [],
  history: [],
  total: 0,
  combo: 0,
  coins: 0,
  items: freshItems(),
  locked: false,
  started: false,
  hintId: null,
  pendingDialog: null,
};

let activeTilePress = null;

const sound = {
  ctx: null,
  sfxGain: null,
  musicGain: null,
  musicTimer: null,
  musicStarted: false,
  bgmAudio: null,
  nextMusicAt: 0,
  musicStep: 0,
  lastAt: 0,
  unlocking: false,
  getContext() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      this.ctx = new AudioContext();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.9;
      this.musicGain.gain.value = 0.038;
      this.sfxGain.connect(this.ctx.destination);
      this.musicGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    return this.ctx;
  },
  ensureBgm() {
    if (!this.bgmAudio) {
      this.bgmAudio = new Audio();
      this.bgmAudio.loop = true;
      this.bgmAudio.preload = "none";
      this.bgmAudio.volume = 0.46;
      this.bgmAudio.src = "./assets/audio/bgm.wav";
    }
    return this.bgmAudio;
  },
  tap(kind = "tap") {
    this.unlock(kind);
  },
  unlock(kind = null) {
    const ctx = this.getContext();
    if (!ctx) return;
    if (ctx.state === "running") {
      this.prime();
      this.startMusic();
      if (kind) this.blip(kind);
      return;
    }
    if (this.unlocking) return;
    this.unlocking = true;
    this.prime();
    ctx.resume()
      .then(() => {
        this.unlocking = false;
        this.prime();
        this.startMusic();
        if (kind) this.blip(kind);
      })
      .catch(() => {
        this.unlocking = false;
      });
  },
  prime() {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(1, now);
      gain.gain.setValueAtTime(0.0001, now);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.015);
    } catch {
      // iOS can reject audio work until a trusted user gesture unlocks it.
    }
  },
  startMusic() {
    const bgm = this.ensureBgm();
    this.musicStarted = true;
    if (bgm.paused) {
      bgm.play().catch(() => {});
    }
    return;
    const ctx = this.getContext();
    if (!ctx) return;
    if (this.musicStarted) return;
    if (ctx.state === "suspended") {
      ctx.resume().then(() => this.startMusic()).catch(() => {});
      return;
    }
    this.musicStarted = true;
    this.nextMusicAt = ctx.currentTime + 0.05;
    this.musicStep = 0;
    this.scheduleMusic();
  },
  scheduleMusic() {
    const ctx = this.getContext();
    if (!ctx || !this.musicStarted) return;
    const C4 = 262;
    const D4 = 294;
    const E4 = 330;
    const F4 = 349;
    const G4 = 392;
    const A4 = 440;
    const B4 = 494;
    const C5 = 523;
    const D5 = 587;
    const E5 = 659;
    const F5 = 698;
    const G5 = 784;
    const A5 = 880;
    const B5 = 988;
    const C6 = 1046;
    const D6 = 1175;
    const E6 = 1318;
    const melody = [
      G5, B5, C6, B5, A5, G5, E5, G5,
      A5, G5, E5, D5, E5, 0, E5, G5,
      G5, B5, D6, C6, B5, A5, G5, E5,
      D5, E5, G5, A5, G5, E5, D5, 0,
      E5, G5, A5, B5, A5, G5, E5, C5,
      D5, E5, G5, E5, D5, 0, C5, D5,
      E5, G5, B5, C6, D6, C6, B5, G5,
      A5, G5, E5, D5, E5, G5, E5, 0,
      C6, B5, A5, G5, A5, B5, C6, D6,
      E6, D6, C6, B5, C6, 0, B5, A5,
      G5, A5, B5, C6, B5, A5, G5, E5,
      F5, G5, A5, B5, A5, G5, E5, 0,
      G5, E5, G5, A5, B5, A5, G5, E5,
      D5, E5, F5, G5, A5, G5, F5, D5,
      E5, G5, A5, C6, B5, A5, G5, E5,
      D5, E5, G5, A5, G5, E5, D5, 0,
      E5, G5, C6, B5, A5, G5, E5, D5,
      C5, D5, E5, G5, E5, 0, C5, D5,
      E5, G5, A5, C6, B5, A5, G5, E5,
      D5, E5, G5, C6, B5, A5, G5, 0,
    ];
    const bass = [
      C4 / 2, G4 / 2, A4 / 2, F4 / 2,
      C4 / 2, G4 / 2, F4 / 2, G4 / 2,
      C4 / 2, E4 / 2, A4 / 2, F4 / 2,
      D4 / 2, G4 / 2, C4 / 2, G4 / 2,
      C4 / 2, G4 / 2, A4 / 2, F4 / 2,
      C4 / 2, G4 / 2, C4 / 2, C4 / 2,
    ];
    const chords = [
      [C4, E4, G4],
      [G4 / 2, B4, D5],
      [A4 / 2, C5, E5],
      [F4, A4, C5],
      [C4, E4, G4],
      [G4 / 2, B4, D5],
      [F4, A4, C5],
      [G4 / 2, D5, G5],
      [C4, G4, C5],
      [E4, G4, B4],
      [A4 / 2, E4, A4],
      [F4, C5, F5],
      [D4, A4, D5],
      [G4 / 2, D5, G5],
      [C4, E4, G4],
      [G4 / 2, B4, D5],
      [C4, E4, G4],
      [G4 / 2, B4, D5],
      [A4 / 2, C5, E5],
      [F4, A4, C5],
      [C4, G4, C5],
      [G4 / 2, D5, G5],
      [C4, E4, G4],
      [C4, E4, G4],
    ];
    const sparkle = [C6, D6, E6, D6, C6, B5];
    const stepDur = 0.285;
    while (this.nextMusicAt < ctx.currentTime + 3.2) {
      const step = this.musicStep;
      const beat = this.nextMusicAt;
      const melodyNote = melody[step % melody.length];
      if (melodyNote) {
        this.musicTone(melodyNote, beat, 0.18, 0.115, "triangle");
      }
      if (step % 8 === 5) {
        this.musicTone(sparkle[Math.floor(step / 8) % sparkle.length], beat + stepDur * 0.44, 0.1, 0.034, "sine");
      }
      if (step % 4 === 0) {
        this.musicTone(bass[Math.floor(step / 4) % bass.length], beat, 0.36, 0.052, "sine");
      }
      if (step % 8 === 0) {
        const chord = chords[Math.floor(step / 8) % chords.length];
        chord.forEach((freq, index) => {
          this.musicTone(freq, beat + index * 0.04, 1.22, 0.018, "sine");
        });
      }
      this.nextMusicAt += stepDur;
      this.musicStep += 1;
    }
    window.clearTimeout(this.musicTimer);
    this.musicTimer = window.setTimeout(() => this.scheduleMusic(), 1200);
  },
  musicTone(freq, start, duration, volume, type) {
    const ctx = this.getContext();
    if (!ctx || !this.musicGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.045);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  },
  musicNoise(start, duration, volume) {
    const ctx = this.getContext();
    if (!ctx || !this.musicGain) return;
    const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    source.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.setValueAtTime(1400, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    source.start(start);
    source.stop(start + duration + 0.01);
  },
  blip(kind = "tap") {
    const ctx = this.getContext();
    if (!ctx) return;
    if (ctx.state !== "running") {
      this.unlock(kind);
      return;
    }
    const now = ctx.currentTime;
    if (now - this.lastAt < 0.035) return;
    this.lastAt = now;

    const presets = {
      tap: { start: 520, end: 720, duration: 0.09, gain: 0.095 },
      tile: { start: 430, end: 690, duration: 0.13, gain: 0.12 },
      tool: { start: 620, end: 360, duration: 0.12, gain: 0.095 },
      match: { start: 520, end: 980, duration: 0.18, gain: 0.13 },
      fail: { start: 260, end: 180, duration: 0.16, gain: 0.09 },
    };
    const preset = presets[kind] || presets.tap;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sine";
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(2600, now + preset.duration * 0.45);
    osc.frequency.setValueAtTime(preset.start, now);
    osc.frequency.exponentialRampToValueAtTime(preset.end, now + preset.duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(preset.gain, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + preset.duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain || ctx.destination);
    osc.start(now);
    osc.stop(now + preset.duration + 0.02);
  },
};

function freshItems() {
  return { ...START_ITEMS, revive: 0 };
}

function saveEconomy() {
  localStorage.setItem("zooCoins", String(state.coins));
  localStorage.setItem("zooItems", JSON.stringify(state.items));
}

function saveProgress() {
  saveEconomy();
  saveGame();
}

function saveGame() {
  if (!state.started) {
    updateContinueButton();
    return;
  }
  if (state.pendingDialog?.mode === "end") {
    clearSavedGame();
    return;
  }
  const payload = {
    level: state.level,
    seed: state.seed,
    tiles: state.tiles,
    tray: state.tray,
    history: state.history,
    total: state.total,
    combo: state.combo,
    coins: state.coins,
    items: state.items,
    locked: state.locked,
    pendingDialog: state.pendingDialog,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  updateContinueButton();
}

function loadSavedGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.tiles) || !Array.isArray(data.tray) || !data.total) return null;
    return data;
  } catch {
    return null;
  }
}

function clearSavedGame() {
  localStorage.removeItem(SAVE_KEY);
  updateContinueButton();
}

function updateContinueButton() {
  if (!continueBtn) return;
  continueBtn.classList.toggle("hidden", !loadSavedGame());
}

function resetRunProgress() {
  state.level = 1;
  state.seed = Math.floor(Math.random() * 100000);
  state.tiles = [];
  state.tray = [];
  state.history = [];
  state.total = 0;
  state.combo = 0;
  state.coins = 0;
  state.items = freshItems();
  state.locked = false;
  state.hintId = null;
  state.pendingDialog = null;
  saveEconomy();
}

function randFactory(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function shuffle(items, rand) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function startLevel(level, seed = Math.floor(Math.random() * 100000)) {
  const rand = randFactory(seed + level * 919);
  const sourceAnimals = SCREENSHOT_ANIMALS;
  const typeCount = Math.min(11 + Math.floor(level * 0.85), sourceAnimals.length);
  const groupCount = Math.min(21 + Math.floor(level * 1.6), 32);
  const types = shuffle(sourceAnimals, rand).slice(0, typeCount);
  const ids = buildPlayableIds(types, groupCount, rand);

  state.level = level;
  state.seed = seed;
  state.tiles = buildTiles(ids, rand, level);
  state.tray = [];
  state.history = [];
  state.total = state.tiles.length;
  state.combo = 0;
  state.locked = false;
  state.hintId = null;
  state.pendingDialog = null;

  goalText.textContent = `清空 ${state.total} 只小动物`;
  levelText.textContent = String(level);
  render();
  saveGame();
  showMessage("完全没被压住的小动物才能点。");
}

function buildPlayableIds(types, groupCount, rand) {
  const groups = [];
  for (let i = 0; i < groupCount; i += 1) {
    groups.push(types[i % types.length].id);
  }
  return arrangePlayableTypes(groups.flatMap((type) => [type, type, type]), rand);
}

function arrangePlayableTypes(types, rand) {
  const counts = new Map();
  types.forEach((type) => counts.set(type, (counts.get(type) || 0) + 1));
  const groups = [];
  const leftovers = [];
  for (const [type, count] of counts.entries()) {
    let remaining = count;
    while (remaining >= 3) {
      groups.push(type);
      remaining -= 3;
    }
    for (let i = 0; i < remaining; i += 1) leftovers.push(type);
  }
  return [
    ...shuffle(groups, rand).flatMap((type) => [type, type, type]),
    ...shuffle(leftovers, rand),
  ];
}

function buildTiles(ids, rand, level) {
  const boardWidth = getBoardMetric("width", 390);
  const boardHeight = getBoardMetric("height", 430);
  const tileSize = getTileSize();
  const slots = buildSheepStyleSlots(ids.length, boardWidth, boardHeight, tileSize, rand, level);
  const tiles = [];
  const boardOffsetY = 14;
  const layerCounts = new Map();
  slots.forEach((slot) => layerCounts.set(slot.layer, (layerCounts.get(slot.layer) || 0) + 1));
  const playableIds = shuffle(ids, rand);

  slots.forEach((slot, order) => {
    const x = slot.x + (rand() - 0.5) * 3;
    const y = slot.y + boardOffsetY + (rand() - 0.5) * 3;
    tiles.push({
      id: `tile-${level}-${order}-${Math.round(rand() * 10000)}`,
      type: playableIds[order % playableIds.length],
      x: clamp(x, 5, boardWidth - tileSize - 5),
      y: clamp(y, 12, boardHeight - tileSize - 8),
      layer: slot.layer,
      stack: slot.group,
      depth: layerCounts.get(slot.layer) || 1,
      rotation: Math.round((rand() - 0.5) * 2),
      removed: false,
      order,
    });
  });

  return tiles.sort((a, b) => a.layer - b.layer || a.stack - b.stack || a.order - b.order);
}

function buildSheepStyleSlots(total, boardWidth, boardHeight, tileSize, rand, level) {
  const stepX = tileSize * 0.76;
  const stepY = tileSize * 0.8;
  const centerX = (boardWidth - tileSize) / 2;
  const centerY = (boardHeight - tileSize) * 0.46;
  const templates = [
    {
      layer: 0,
      quota: Math.min(28, Math.max(24, Math.round(total * 0.4))),
      cells: [
        [-3, -2], [-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2], [3, -2],
        [-3, -1], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [3, -1],
        [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0],
        [-3, 1], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [3, 1],
        [-2.5, 2], [-1.5, 2], [-0.5, 2], [0.5, 2], [1.5, 2], [2.5, 2],
      ],
    },
    {
      layer: 1,
      quota: Math.min(17, Math.max(14, Math.round(total * 0.25))),
      cells: [
        [-2.6, -1.55], [-1.6, -1.55], [-0.6, -1.55], [0.4, -1.55], [1.4, -1.55], [2.4, -1.55],
        [-2.6, -0.55], [-1.6, -0.55], [-0.6, -0.55], [0.4, -0.55], [1.4, -0.55], [2.4, -0.55],
        [-2.6, 0.45], [-1.6, 0.45], [-0.6, 0.45], [0.4, 0.45], [1.4, 0.45], [2.4, 0.45],
        [-1.6, 1.45], [-0.6, 1.45], [0.4, 1.45], [1.4, 1.45],
      ],
    },
    {
      layer: 2,
      quota: Math.min(8, Math.max(7, Math.round(total * 0.12))),
      cells: [
        [-2.1, -2.35], [-0.9, -2.25], [0.9, -2.25], [2.1, -2.35],
        [-3.35, -0.85], [-1.55, -0.75], [0, -0.95], [1.55, -0.75], [3.35, -0.85],
        [-2.35, 1.1], [0, 1.0], [2.35, 1.1],
      ],
    },
    {
      layer: 0,
      quota: 9,
      cells: [
        [-3.1, 2.35], [-2.1, 2.35], [-1.05, 2.35], [0, 2.35], [1.05, 2.35], [2.1, 2.35], [3.1, 2.35],
        [-2.45, 3.3], [-1.25, 3.3], [0, 3.3], [1.25, 3.3], [2.45, 3.3],
        [-1.75, 4.15], [-0.55, 4.15], [0.55, 4.15], [1.75, 4.15],
        [-1.25, 4.85], [0, 4.85], [1.25, 4.85],
      ],
    },
    {
      layer: 1,
      quota: 6,
      cells: [
        [-2.6, 2.8], [-1.35, 2.8], [0, 2.8], [1.35, 2.8], [2.6, 2.8],
        [-1.55, 3.75], [-0.45, 3.75], [0.65, 3.75], [1.75, 3.75],
        [-0.95, 4.45], [0.25, 4.45], [1.45, 4.45],
      ],
    },
    {
      layer: 2,
      quota: 4,
      cells: [
        [-2.2, 3.35], [0, 3.35], [2.2, 3.35],
        [-1.05, 4.15], [1.05, 4.15],
        [0, 4.75],
      ],
    },
    {
      layer: 3,
      quota: Math.min(8, Math.max(6, total - 60)),
      cells: [
        [-1.9, -2.1], [0, -2.25], [1.9, -2.1],
        [-2.1, -0.4], [0, -0.55], [2.1, -0.4],
        [-1.7, 1.7], [0, 1.55], [1.7, 1.7],
        [-1.25, 3.3], [1.25, 3.3],
      ],
    },
    {
      layer: 4,
      quota: Math.min(3, Math.max(2, total - 64)),
      cells: [
        [-0.8, -0.95], [0.8, -0.95],
        [0, 0.75],
        [-0.7, 2.55], [0.7, 2.55],
      ],
    },
  ];
  const slots = [];
  const addSlot = (cell, layer, group) => {
    const [gx, gy] = cell;
    slots.push({
      x: centerX + gx * stepX,
      y: centerY + gy * stepY,
      layer,
      group,
    });
  };

  templates.forEach((template, templateIndex) => {
    const count = Math.min(template.quota, template.cells.length, total - slots.length);
    shuffle(template.cells, rand).slice(0, count).forEach((cell, cellIndex) => {
      addSlot(cell, template.layer, templateIndex * 100 + cellIndex);
    });
  });

  while (slots.length < total) {
    const layer = 1 + Math.floor(rand() * Math.min(3, 1 + Math.floor(level / 2)));
    const gx = (rand() - 0.5) * 6.8;
    const gy = (rand() - 0.5) * 4.8;
    addSlot([gx, gy], layer, 900 + slots.length);
  }

  return slots.sort((a, b) => a.layer - b.layer || a.y - b.y || a.x - b.x);
}

function getBoardMetric(prop, fallback) {
  const rect = boardEl.getBoundingClientRect();
  return Math.round(rect[prop]) || fallback;
}

function getTileSize() {
  return Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tile-size")) || 56;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function render() {
  const liveTiles = state.tiles.filter((tile) => !tile.removed);
  const available = new Set(liveTiles.filter((tile) => !isBlocked(tile)).map((tile) => tile.id));

  boardEl.innerHTML = liveTiles.map((tile) => tileButton(tile, available.has(tile.id))).join("");
  for (const tileEl of boardEl.querySelectorAll(".tile.available")) {
    if (window.PointerEvent) {
      tileEl.addEventListener("pointerdown", (event) => beginTilePress(tileEl, event));
      tileEl.addEventListener("pointermove", updateTilePress);
      tileEl.addEventListener("pointerup", finishTilePress);
      tileEl.addEventListener("pointercancel", cancelTilePress);
      tileEl.addEventListener("lostpointercapture", cancelTilePress);
    } else {
      tileEl.addEventListener("click", () => beginPickTile(tileEl));
    }
  }

  renderTray();
  leftText.textContent = String(liveTiles.length);
  comboText.textContent = String(state.combo);
  coinText.textContent = String(state.coins);
  reviveText.textContent = String(state.items.revive || 0);
  trayCount.textContent = `${state.tray.length} / ${TRAY_LIMIT}`;
  hintCount.textContent = String(state.items.hint || 0);
  undoCount.textContent = String(state.items.undo || 0);
  shuffleCount.textContent = String(state.items.shuffle || 0);
  hintBtn.disabled = state.locked || !state.items.hint || available.size === 0;
  undoBtn.disabled = state.locked || !state.items.undo || state.history.length === 0;
  shuffleBtn.disabled = state.locked || !state.items.shuffle || liveTiles.length < 2;

  if (state.started && state.total > 0 && liveTiles.length === 0 && state.tray.length === 0 && !state.locked) {
    finishLevel();
  }
}

function tileButton(tile, available) {
  const animal = getAnimal(tile.type);
  const coverDepth = available ? 0 : getCoverDepth(tile);
  const blockedBrightness = available ? 1 : 1 - getShadeAlpha(coverDepth, coverDepth + 1);
  const classes = ["tile", available ? "available" : "blocked", state.hintId === tile.id ? "hinted" : ""]
    .filter(Boolean)
    .join(" ");
  const disabled = available ? "" : "disabled";
  return `
    <button
      class="${classes}"
      data-id="${tile.id}"
      type="button"
      ${disabled}
      aria-label="${available ? "收集" : "被压住的"}${animal.name}"
      style="--x:${tile.x}px; --y:${tile.y}px; --r:${tile.rotation}deg; --depth:${tile.layer}; --depth-shadow:${tile.layer * 2}px; --depth-shadow-big:${tile.layer * 3}px; --blocked-brightness:${blockedBrightness}; z-index:${10 + tile.layer * 30 + tile.order};"
    >
      ${animal.icon("normal")}
    </button>
  `;
}

function getShadeAlpha(visualDepth, stackDepth) {
  const lowerLayers = Math.max(1, stackDepth - 1);
  if (lowerLayers >= 3) {
    return [0, 0.25, 0.5, 0.75][Math.min(visualDepth, 3)];
  }
  return clamp((visualDepth / lowerLayers) * 0.66, 0, 0.66);
}

function getCoverDepth(tile) {
  return getCoveringTiles(tile).length;
}

function getCoveringTiles(tile) {
  const tileSize = getTileSize();
  return state.tiles.filter((other) => {
    if (other.removed || other.id === tile.id) return false;
    const otherAbove = other.layer > tile.layer;
    if (!otherAbove) return false;
    const xOverlap = Math.min(tile.x + tileSize, other.x + tileSize) - Math.max(tile.x, other.x);
    const yOverlap = Math.min(tile.y + tileSize, other.y + tileSize) - Math.max(tile.y, other.y);
    return isMeaningfulCover(tile, other, xOverlap, yOverlap, tileSize) || isNearLayerCover(tile, other, tileSize);
  });
}

function isPointInsideElement(event, element) {
  const rect = element.getBoundingClientRect();
  return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
}

function beginTilePress(tileEl, event) {
  if (!tileEl || tileEl.dataset.picking === "1") return;
  const id = tileEl.dataset.id;
  const tile = state.tiles.find((item) => item.id === id);
  if (state.locked || !tile || tile.removed || isBlocked(tile)) return;
  event.preventDefault();
  activeTilePress = {
    id,
    tileEl,
    pointerId: event.pointerId,
    cancelled: false,
  };
  tileEl.classList.add("pressed");
  tileEl.setPointerCapture?.(event.pointerId);
}

function updateTilePress(event) {
  if (!activeTilePress || activeTilePress.pointerId !== event.pointerId) return;
  if (!isPointInsideElement(event, activeTilePress.tileEl)) {
    activeTilePress.cancelled = true;
    activeTilePress.tileEl.classList.remove("pressed");
  }
}

function finishTilePress(event) {
  if (!activeTilePress || activeTilePress.pointerId !== event.pointerId) return;
  event.preventDefault();
  const press = activeTilePress;
  const shouldPick = !press.cancelled && isPointInsideElement(event, press.tileEl);
  press.tileEl.classList.remove("pressed");
  activeTilePress = null;
  press.tileEl.releasePointerCapture?.(event.pointerId);
  if (shouldPick) beginPickTile(press.tileEl);
}

function cancelTilePress(event) {
  if (!activeTilePress) return;
  if (event?.pointerId !== undefined && activeTilePress.pointerId !== event.pointerId) return;
  activeTilePress.tileEl.classList.remove("pressed");
  activeTilePress = null;
}

function beginPickTile(tileEl) {
  if (!tileEl || tileEl.dataset.picking === "1") return;
  const id = tileEl.dataset.id;
  const tile = state.tiles.find((item) => item.id === id);
  if (state.locked || !tile || tile.removed || isBlocked(tile)) return;
  tileEl.dataset.picking = "1";
  sound.tap("tile");
  window.setTimeout(() => pickTile(id, { skipSound: true }), 70);
}

function isNearLayerCover(tile, other, tileSize) {
  const reach = tileSize * 0.18;
  const xOverlap = Math.min(tile.x + tileSize, other.x + tileSize + reach) - Math.max(tile.x, other.x - reach);
  const yOverlap = Math.min(tile.y + tileSize, other.y + tileSize + reach) - Math.max(tile.y, other.y - reach);
  if (xOverlap <= 0 || yOverlap <= 0) return false;
  const area = xOverlap * yOverlap;
  return area >= tileSize * tileSize * 0.2;
}

function isMeaningfulCover(tile, other, xOverlap, yOverlap, tileSize) {
  if (xOverlap <= 0 || yOverlap <= 0) return false;
  const area = xOverlap * yOverlap;
  if (area >= tileSize * tileSize * 0.08) return true;

  const inset = tileSize * 0.3;
  const coreLeft = tile.x + inset;
  const coreRight = tile.x + tileSize - inset;
  const coreTop = tile.y + inset;
  const coreBottom = tile.y + tileSize - inset;
  const otherLeft = other.x;
  const otherRight = other.x + tileSize;
  const otherTop = other.y;
  const otherBottom = other.y + tileSize;
  const coreOverlapX = Math.min(coreRight, otherRight) - Math.max(coreLeft, otherLeft);
  const coreOverlapY = Math.min(coreBottom, otherBottom) - Math.max(coreTop, otherTop);
  return coreOverlapX > tileSize * 0.04 && coreOverlapY > tileSize * 0.04;
}

function renderTray(matchingIds = []) {
  const matchedSet = new Set(matchingIds);
  const matchingIndexes = state.tray
    .map((item, index) => (item && matchedSet.has(item.instanceId) ? index : -1))
    .filter((index) => index >= 0);
  const mergeIndex = matchingIndexes[Math.floor(matchingIndexes.length / 2)];
  const slots = Array.from({ length: TRAY_LIMIT }, (_, index) => {
    const item = state.tray[index];
    const matching = item && matchedSet.has(item.instanceId);
    if (matching && index !== mergeIndex) {
      return `<div class="slot matching"></div>`;
    }
    return `
      <div class="slot ${matching ? "matching" : ""}">
        ${
          item
            ? `<div class="tray-tile ${matching ? "leaving merged" : ""}" title="${getAnimal(item.type).name}">${getAnimal(item.type).icon(matching ? "leave" : "normal")}</div>`
            : ""
        }
      </div>
    `;
  });
  trayEl.innerHTML = slots.join("");
  trayCount.textContent = `${state.tray.length} / ${TRAY_LIMIT}`;
}

function isBlocked(tile) {
  return getCoveringTiles(tile).length > 0;
}

function pickTile(id, options = {}) {
  if (state.locked) return;
  const tile = state.tiles.find((item) => item.id === id);
  if (!tile || tile.removed || isBlocked(tile)) return;

  if (!options.skipSound) sound.tap("tile");
  state.history.push(snapshot());
  tile.removed = true;
  state.hintId = null;
  state.tray.push({
    type: tile.type,
    tileId: tile.id,
    instanceId: `${tile.id}-${Date.now()}`,
  });

  render();
  setTimeout(resolveTray, 30);
}

function resolveTray() {
  const byType = new Map();
  state.tray.forEach((item) => {
    if (!byType.has(item.type)) byType.set(item.type, []);
    byType.get(item.type).push(item);
  });

  const match = [...byType.values()].find((items) => items.length >= 3);
  if (match) {
    state.combo += 1;
    const removing = match.slice(0, 3);
    const ids = removing.map((item) => item.instanceId);
    const animal = getAnimal(removing[0].type);
    const coinGain = state.combo >= 4 ? 2 : 1;
    state.coins += coinGain;
    const removal = new Set(ids);
    state.tray = state.tray.filter((item) => !removal.has(item.instanceId));
    saveProgress();
    render();
    sound.blip("match");
    showMatchPop(animal);
    showCoinFloat(`+${coinGain}`);
    showMessage(`${animal.name} x 3 跑回家啦！`);
    setTimeout(resolveTray, 30);
    return;
  }

  state.combo = 0;
  render();
  saveGame();
  if (state.tray.length >= TRAY_LIMIT) {
    loseLevel();
  }
}

function snapshot() {
  return {
    tiles: state.tiles.map((tile) => ({ ...tile })),
    tray: state.tray.map((item) => ({ ...item })),
    combo: state.combo,
  };
}

function restore(snapshotState) {
  state.tiles = snapshotState.tiles.map((tile) => ({ ...tile }));
  state.tray = snapshotState.tray.map((item) => ({ ...item }));
  state.combo = snapshotState.combo;
  state.hintId = null;
  state.locked = false;
  render();
  saveGame();
}

function useItem(name) {
  if (!state.items[name]) {
    sound.tap("fail");
    showMessage("这个道具用完啦，过关会送新的。");
    showToolMeme();
    return false;
  }
  state.items[name] -= 1;
  sound.tap("tool");
  saveProgress();
  showToolMeme();
  return true;
}

function hint() {
  if (state.locked) return;
  const available = state.tiles.filter((tile) => !tile.removed && !isBlocked(tile));
  if (!available.length) {
    showMessage("暂时没有完全露出来的小动物。");
    render();
    return;
  }
  if (!useItem("hint")) return;
  const trayNeed = new Map();
  state.tray.forEach((item) => trayNeed.set(item.type, (trayNeed.get(item.type) || 0) + 1));
  const best =
    available.find((tile) => trayNeed.get(tile.type) === 2) ||
    available.find((tile) => trayNeed.get(tile.type) === 1) ||
    available[0];
  state.hintId = best.id;
  render();
  showMessage(`试试完全露出来的${getAnimal(best.type).name}。`);
  setTimeout(() => {
    if (state.hintId === best.id) {
      state.hintId = null;
      render();
    }
  }, 1400);
}

function undo() {
  if (state.locked || state.history.length === 0 || !useItem("undo")) return;
  restore(state.history.pop());
  showMessage("撤回了一步。");
}

function shuffleBoard() {
  if (state.locked || !useItem("shuffle")) return;
  state.history.push(snapshot());
  const rand = randFactory(Date.now() % 1000000);
  const live = state.tiles.filter((tile) => !tile.removed);
  const newTiles = buildTiles(arrangePlayableTypes(live.map((tile) => tile.type), rand), rand, state.level);
  live.forEach((tile, index) => {
    tile.x = newTiles[index].x;
    tile.y = newTiles[index].y;
    tile.layer = newTiles[index].layer;
    tile.rotation = newTiles[index].rotation;
  });
  state.hintId = null;
  render();
  saveGame();
  showMessage("小动物们换了个队形。");
}

function loseLevel() {
  state.locked = true;
  const canRevive = canReviveNow();
  state.pendingDialog = {
    title: "槽满啦",
    text: canRevive ? "篮子太挤了，可以用复活把小动物救回来。" : "篮子太挤了，这一局先结束吧。",
    image: pickRandom(FAIL_MEMES),
    mode: canRevive ? "revive" : "end",
    rewards: "",
    shop: false,
  };
  showDialog(state.pendingDialog);
  if (canRevive) {
    saveGame();
  } else {
    clearSavedGame();
  }
}

function finishLevel() {
  state.locked = true;
  const coinReward = 8 + Math.min(state.level, 8) * 2;
  state.coins += coinReward;
  saveProgress();
  state.pendingDialog = {
    title: "过关啦",
    text: `第 ${state.level} 关完成，金币可以在这里买下一关道具。`,
    image: pickRandom(HAPPY_MEMES),
    mode: "next",
    rewards: `<span class="reward-chip">金币 +${coinReward}</span>`,
    shop: true,
  };
  showDialog(state.pendingDialog);
  render();
  saveGame();
}

function showDialog({ title, text, image, mode, rewards, shop = false }) {
  dialogTitle.textContent = title;
  dialogText.textContent = text;
  dialogMeme.src = image;
  dialogMeme.classList.remove("meme-wiggle");
  void dialogMeme.offsetWidth;
  dialogMeme.classList.add("meme-wiggle");
  rewardRow.innerHTML = rewards;
  shopPanel.classList.toggle("hidden", !shop);
  if (shop) renderShop();
  nextBtn.textContent = mode === "next" ? "下一关" : mode === "revive" ? "复活" : "结束游戏";
  againBtn.textContent = "结束游戏";
  nextBtn.dataset.mode = mode;
  againBtn.classList.toggle("hidden", mode === "end");
  nextBtn.classList.toggle("revive-action", mode === "revive");
  nextBtn.classList.toggle("end-action", mode === "end");
  dialogBackdrop.classList.remove("hidden");
}

function renderShop() {
  shopCoinText.textContent = `${state.coins} 金币`;
  shopList.innerHTML = SHOP_ITEMS.map((item) => {
    const owned = state.items[item.id] || 0;
    const maxed = item.max ? owned >= item.max : false;
    const canBuy = state.coins >= item.price && !maxed;
    const icon = itemIcon(item.id);
    return `
      <button class="shop-item" data-buy="${item.id}" type="button" ${canBuy ? "" : "disabled"}>
        <span class="shop-icon item-icon item-icon-${item.id}" aria-hidden="true">${icon}</span>
        <span class="shop-copy">
          <strong>${item.name}</strong>
          <small>${item.desc}</small>
        </span>
        <span class="shop-price">${item.price} 金币</span>
        <span class="shop-owned">${maxed ? "已满" : `已有 ${owned}`}</span>
      </button>
    `;
  }).join("");
}

function buyShopItem(id) {
  const item = SHOP_ITEMS.find((entry) => entry.id === id);
  if (!item) return;
  if (state.coins < item.price) {
    sound.tap("fail");
    showMessage("金币不够，下一关多攒一点。");
    showToolMeme();
    return;
  }
  if (item.max && (state.items[id] || 0) >= item.max) {
    sound.tap("fail");
    showMessage(`${item.name}最多只能带 ${item.max} 个。`);
    showToolMeme();
    return;
  }
  state.coins -= item.price;
  state.items[id] = (state.items[id] || 0) + 1;
  sound.tap("tool");
  saveProgress();
  renderShop();
  render();
  showToolMeme();
}

function itemIcon() {
  return "";
}

function canReviveNow() {
  return (state.items.revive || 0) > 0 || state.coins >= REVIVE_PRICE;
}

function reviveLevel() {
  if (!canReviveNow()) {
    endGame();
    return;
  }
  if ((state.items.revive || 0) > 0) {
    state.items.revive -= 1;
  } else {
    state.coins -= REVIVE_PRICE;
  }
  state.tray = state.tray.slice(0, Math.max(0, state.tray.length - 3));
  sound.tap("tool");
  state.combo = 0;
  state.locked = false;
  state.pendingDialog = null;
  hideDialog();
  saveProgress();
  render();
  showMessage("复活成功，小动物篮空出位置啦。");
}

function hideDialog() {
  dialogBackdrop.classList.add("hidden");
}

function startNewGame() {
  toggleSettings(false);
  clearSavedGame();
  resetRunProgress();
  state.started = true;
  startScreen.classList.add("hidden");
  startLevel(1);
}

function continueSavedGame() {
  const saved = loadSavedGame();
  if (!saved) return;
  toggleSettings(false);
  state.level = saved.level || 1;
  state.seed = saved.seed || Math.floor(Math.random() * 100000);
  state.tiles = saved.tiles.map((tile) => ({ ...tile }));
  state.tray = saved.tray.map((item) => ({ ...item }));
  state.history = Array.isArray(saved.history) ? saved.history : [];
  state.total = saved.total || state.tiles.length;
  state.combo = saved.combo || 0;
  state.coins = saved.coins || 0;
  state.items = { ...freshItems(), ...(saved.items || {}) };
  state.locked = Boolean(saved.locked);
  state.started = true;
  state.hintId = null;
  state.pendingDialog = saved.pendingDialog || null;
  goalText.textContent = `清空 ${state.total} 只小动物`;
  levelText.textContent = String(state.level);
  startScreen.classList.add("hidden");
  render();
  if (state.pendingDialog) {
    showDialog(state.pendingDialog);
  }
}

function endGame() {
  toggleSettings(false);
  hideDialog();
  clearSavedGame();
  resetRunProgress();
  state.started = false;
  startScreen.classList.remove("hidden");
  renderStartScene();
  render();
}

function exitToStartMenu() {
  toggleSettings(false);
  hideDialog();
  if (state.started && state.pendingDialog?.mode !== "end") {
    saveGame();
  }
  state.started = false;
  startScreen.classList.remove("hidden");
  renderStartScene();
  updateContinueButton();
}

function showMessage(text) {
  messageEl.textContent = text;
  messageEl.classList.add("show");
  window.clearTimeout(showMessage.timer);
  showMessage.timer = window.setTimeout(() => {
    messageEl.classList.remove("show");
  }, 1700);
}

function showCoinFloat(text) {
  const el = document.createElement("div");
  el.className = "coin-float";
  el.textContent = text;
  document.querySelector(".phone-game").appendChild(el);
  setTimeout(() => el.remove(), 800);
}

function toggleSettings(force) {
  if (!settingsPanel) return;
  const open = typeof force === "boolean" ? force : settingsPanel.classList.contains("hidden");
  settingsPanel.classList.toggle("hidden", !open);
}

function manualSaveGame() {
  if (!state.started || state.pendingDialog?.mode === "end") {
    showMessage("当前没有可以保存的进度。");
    return;
  }
  saveGame();
  toggleSettings(false);
  showMessage("已手动存档。");
}

function showMatchPop(animal) {
  const old = document.querySelector(".match-pop");
  old?.remove();
  const el = document.createElement("div");
  el.className = "match-pop";
  el.innerHTML = animal.icon("leave");
  document.querySelector(".phone-game").appendChild(el);
  setTimeout(() => el.remove(), 860);
}

function showToolMeme() {
  const old = document.querySelector(".tool-meme");
  old?.remove();
  const img = document.createElement("img");
  img.className = "tool-meme";
  img.src = pickRandom(CONFUSE_MEMES);
  img.alt = "";
  document.querySelector(".phone-game").appendChild(img);
  setTimeout(() => img.remove(), 1200);
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function getAnimal(id) {
  return ANIMALS.find((animal) => animal.id === id) || ANIMALS[0];
}

function animalImage(id, name, mood = "normal") {
  return `
    <span class="animal-img-wrap ${mood === "leave" ? "animal-leave" : mood === "xx" ? "animal-xx" : ""}">
      <img class="animal-img" src="./assets/animals/${id}.png" alt="${name}" draggable="false" />
      ${
        mood === "leave"
          ? `<span class="leave-mark leave-mark-a"></span><span class="leave-mark leave-mark-b"></span>`
          : mood === "xx"
            ? `<span class="xx-eye xx-left">X</span><span class="xx-eye xx-right">X</span>`
            : ""
      }
    </span>
  `;
}


function renderStartScene() {
  if (!startScene) return;
  const rand = randFactory(Date.now() % 1000000);
  const walkers = shuffle(SCREENSHOT_ANIMALS, rand).slice(0, 10);
  const spots = [
    [7, 15], [18, 30], [76, 19], [72, 39], [14, 57],
    [81, 63], [32, 36], [58, 37], [35, 66], [63, 58],
  ];
  startScene.innerHTML = walkers
    .map((animal, index) => {
      const [baseLeft, baseTop] = spots[index % spots.length];
      const left = Math.round(baseLeft + (rand() - 0.5) * 8);
      const top = Math.round(baseTop + (rand() - 0.5) * 7);
      const dx = Math.round((rand() - 0.5) * 88);
      const dy = Math.round((rand() - 0.5) * 44);
      const duration = (8 + rand() * 5).toFixed(2);
      const delay = (-rand() * 8).toFixed(2);
      const scale = (0.72 + rand() * 0.42).toFixed(2);
      return `
        <div
          class="start-walker"
          style="--left:${left}%; --top:${top}%; --dx:${dx}px; --dy:${dy}px; --dur:${duration}s; --delay:${delay}s; --scale:${scale}; z-index:${index + 1};"
        >
          ${animal.icon("normal")}
        </div>
      `;
    })
    .join("");
}

startBtn.addEventListener("click", () => {
  sound.tap("tap");
  startNewGame();
});

continueBtn.addEventListener("click", () => {
  sound.tap("tap");
  continueSavedGame();
});

nextBtn.addEventListener("click", () => {
  sound.tap(nextBtn.dataset.mode === "revive" ? "tool" : "tap");
  if (nextBtn.dataset.mode === "next") {
    hideDialog();
    state.pendingDialog = null;
    startLevel(state.level + 1);
  } else if (nextBtn.dataset.mode === "revive") {
    reviveLevel();
  } else {
    endGame();
  }
});

againBtn.addEventListener("click", () => {
  sound.tap("tap");
  endGame();
});

hintBtn.addEventListener("click", hint);
undoBtn.addEventListener("click", undo);
shuffleBtn.addEventListener("click", shuffleBoard);
settingsBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  sound.tap("tap");
  toggleSettings();
});
manualSaveBtn.addEventListener("click", () => {
  sound.tap("tap");
  manualSaveGame();
});
exitGameBtn.addEventListener("click", () => {
  sound.tap("tap");
  exitToStartMenu();
});
document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button && !button.disabled && !button.closest(".board") && !button.closest("#shopList") && !button.matches("#startBtn, #continueBtn, #nextBtn, #againBtn, #hintBtn, #undoBtn, #shuffleBtn, #settingsBtn, #manualSaveBtn, #exitGameBtn")) {
    sound.tap("tap");
  }
  if (!settingsPanel || settingsPanel.classList.contains("hidden")) return;
  if (settingsPanel.contains(event.target) || settingsBtn.contains(event.target)) return;
  toggleSettings(false);
});
shopList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-buy]");
  if (!button) return;
  buyShopItem(button.dataset.buy);
});

window.addEventListener(
  "resize",
  debounce(() => {
    if (state.started) startLevel(state.level, state.seed);
  }, 180),
);

window.addEventListener("pagehide", () => {
  saveGame();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    saveGame();
  } else {
    sound.startMusic();
  }
});

function debounce(fn, delay) {
  let timer;
  return () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(fn, delay);
  };
}


renderStartScene();
["pointerdown", "touchstart", "keydown"].forEach((eventName) => {
  document.addEventListener(eventName, () => sound.unlock(), {
    capture: true,
    once: true,
    passive: true,
  });
});
requestAnimationFrame(() => {
  updateContinueButton();
  render();
  coinText.textContent = String(state.coins);
  reviveText.textContent = String(state.items.revive || 0);
  hintCount.textContent = String(state.items.hint || 0);
  undoCount.textContent = String(state.items.undo || 0);
  shuffleCount.textContent = String(state.items.shuffle || 0);
});
