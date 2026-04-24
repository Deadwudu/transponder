const output = document.getElementById("terminalOutput");
const form = document.getElementById("terminalForm");
const input = document.getElementById("terminalInput");
const phaseBadge = document.getElementById("phaseBadge");
const scoreBadge = document.getElementById("scoreBadge");
const promptLabel = document.getElementById("promptLabel");

const FIRST_STAGE_MINI = ["mini1", "mini2", "mini3", "mini4", "mini5", "mini6", "mini7", "mini8", "mini9", "mini10"];
const IP_STAGE_MINI = ["ipmini1", "ipmini2", "ipmini3", "ipmini4", "ipmini5", "ipmini6"];

const state = {
  phase: 0,
  score: 0,
  scanComplete: false,
  connected: false,
  transponderBreached: false,
  ip: "",
  ipAccessGranted: false,
  finalDone: false,
  firstStageSelected: [],
  mini1Code: "",
  mini2Sequence: [],
  mini2Step: 0,
  mini3Needle: "",
  mini3Packets: [],
  mini4Word: "",
  mini5Needle: "",
  mini5Channels: [],
  mini5Integrity: {},
  mini5Scanned: {},
  mini6Needle: "",
  mini6Sectors: [],
  mini6Reflectivity: {},
  mini6Scanned: {},
  mini7Token: "",
  mini7Messages: [],
  mini8Needle: "",
  mini8Daemons: [],
  mini8Scores: {},
  mini9Needle: "",
  mini9Blocks: {},
  mini10Needle: "",
  mini10Relays: [],
  mini10Load: {},
  ipMini1Code: "",
  ipMini1Keys: [],
  ipMini1Scanned: {},
  ipMini2Route: "",
  ipMini2Routes: [],
  ipMini2Scanned: {},
  ipMini3Mask: "",
  ipMini3Ip: "",
  ipMini4Pin: "",
  ipMini4Matrix: [],
  ipMini4Probed: {},
  ipMini5Needle: "",
  ipMini5Users: [],
  ipMini5Score: {},
  ipMini5Scanned: {},
  ipMini6Needle: "",
  ipMini6Files: [],
  ipMini6Score: {},
  ipMini6Scanned: {},
  currentDir: "/",
  clientsData: "",
  activeMini: "",
  errorCounts: {},
  firstStageDone: {
    mini1: false,
    mini2: false,
    mini3: false,
    mini4: false,
    mini5: false,
    mini6: false,
    mini7: false,
    mini8: false,
    mini9: false,
    mini10: false,
  },
  ipStageDone: {
    ipmini1: false,
    ipmini2: false,
    ipmini3: false,
    ipmini4: false,
    ipmini5: false,
    ipmini6: false,
  },
};

const fsTree = {
  "/": ["cache", "logs", "tmp", "opt", "data", "kernel.dump"],
  "/cache": ["shader.cache", "stream.tmp", "telemetry.bin"],
  "/logs": ["session.log", "events.log", "errors.log"],
  "/tmp": ["x12.tmp", "render.tmp", "mux.swap"],
  "/opt": ["patches", "drivers", "legacy.cfg"],
  "/opt/patches": ["hotfix_1.pkg", "hotfix_2.pkg"],
  "/opt/drivers": ["rf.driver", "scope.driver"],
  "/data": ["clients", "nodes.map", "mirror.key"],
};

function writeLine(text, type = "system") {
  const line = document.createElement("div");
  line.className = `line ${type}`;
  line.textContent = text;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

function playActivity(tag) {
  const base = [
    `[${tag}] init sequence...`,
    `[${tag}] entropy seed: 0x${randomCode(8, "0123456789ABCDEF")}`,
    `[${tag}] sync offset: ${Math.floor(Math.random() * 90) + 10}ms`,
  ];

  const techByTag = {
    LINK: [
      "[NET] tcp handshake -> SYN",
      "[NET] tcp handshake -> SYN/ACK",
      "[NET] session promoted to secure tunnel",
    ],
    BREACH: [
      "[CORE] bypassing auth gate...",
      "[CORE] hash collision accepted",
      "[CORE] privilege token injected",
    ],
    TUNNEL: [
      "[NET] route map loaded",
      "[NET] packet jitter normalized",
      "[NET] tunnel stabilized",
    ],
  };

  const generic = [
    `[${tag}] parsing frame table...`,
    `[${tag}] cache lines warmed`,
    `[${tag}] checksum OK`,
  ];

  const extra = techByTag[tag] || generic;
  const noisePool = [
    "[WARN] packet loss 2.1%, retrying",
    "[WARN] unstable clock drift detected",
    "[ERR] stale cache segment, rebuilding",
    "[WARN] relay heartbeat delayed",
    "[ERR] temporary checksum mismatch",
    "[WARN] jitter spike observed",
  ];
  const recoveryPool = [
    "[RECOVERY] retransmit succeeded",
    "[RECOVERY] clock realigned",
    "[RECOVERY] cache rebuilt",
    "[RECOVERY] fallback relay engaged",
    "[RECOVERY] checksum normalized",
  ];
  const noiseLines = [];
  const noiseCount = Math.random() < 0.55 ? 2 : 1;
  for (let i = 0; i < noiseCount; i += 1) {
    noiseLines.push(randomFrom(noisePool));
    if (Math.random() < 0.8) noiseLines.push(randomFrom(recoveryPool));
  }
  const trailer = [`[${tag}] completed.`];
  const steps = [...base, ...extra, ...noiseLines, ...trailer];
  steps.forEach((line, idx) => {
    const type = line.startsWith("[ERR]") ? "error" : line.startsWith("[WARN]") ? "system" : "system";
    setTimeout(() => writeLine(line, type), idx * 170);
  });
}

function playMiniSuccessNoise(miniKey) {
  const tag = miniKey.toUpperCase();
  const generic = [
    `[${tag}] commit vector accepted`,
    `[${tag}] privilege delta +1`,
    `[${tag}] trace obfuscation complete`,
  ];
  generic.forEach((line) => writeLine(line, "system"));
}

function getPromptPath() {
  if (!state.ipAccessGranted) return "~";
  return state.currentDir === "/" ? "/" : state.currentDir;
}

function updatePrompt() {
  const host = state.ipAccessGranted ? "target-ip" : "transponder";
  promptLabel.textContent = `operator@${host}:${getPromptPath()}$`;
}

function updateHud() {
  const phases = [
    "Фаза: Подключение",
    "Фаза: Разведка",
    "Фаза: Взлом транспондера",
    "Фаза: Доступ к IP",
    "Фаза: Файловое ядро",
    "Фаза: Операция завершена",
  ];
  phaseBadge.textContent = phases[state.phase];
  scoreBadge.textContent = `Рейтинг: ${state.score}`;
}

function gain(points) {
  state.score += points;
  updateHud();
  updatePrompt();
}

function randomCode(length = 4, alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789") {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickUnique(arr, count) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function allDone(pool) {
  return Object.values(pool).every(Boolean);
}

function currentMiniKey(stageList, doneMap) {
  return stageList.find((key) => !doneMap[key]) || null;
}

function clearMiniState(miniKey) {
  if (miniKey === "mini1") state.mini1Code = "";
  if (miniKey === "mini2") {
    state.mini2Sequence = [];
    state.mini2Step = 0;
  }
  if (miniKey === "mini3") {
    state.mini3Needle = "";
    state.mini3Packets = [];
  }
  if (miniKey === "mini4") state.mini4Word = "";
  if (miniKey === "mini5") {
    state.mini5Needle = "";
    state.mini5Channels = [];
    state.mini5Integrity = {};
    state.mini5Scanned = {};
  }
  if (miniKey === "mini6") state.mini6Needle = "";
  if (miniKey === "mini6") {
    state.mini6Sectors = [];
    state.mini6Reflectivity = {};
    state.mini6Scanned = {};
  }
  if (miniKey === "mini7") {
    state.mini7Token = "";
    state.mini7Messages = [];
  }
  if (miniKey === "mini8") {
    state.mini8Needle = "";
    state.mini8Daemons = [];
    state.mini8Scores = {};
  }
  if (miniKey === "mini9") {
    state.mini9Needle = "";
    state.mini9Blocks = {};
  }
  if (miniKey === "mini10") {
    state.mini10Needle = "";
    state.mini10Relays = [];
    state.mini10Load = {};
  }
  if (miniKey === "ipmini1") state.ipMini1Code = "";
  if (miniKey === "ipmini1") {
    state.ipMini1Keys = [];
    state.ipMini1Scanned = {};
  }
  if (miniKey === "ipmini2") {
    state.ipMini2Route = "";
    state.ipMini2Routes = [];
    state.ipMini2Scanned = {};
  }
  if (miniKey === "ipmini3") {
    state.ipMini3Mask = "";
    state.ipMini3Ip = "";
  }
  if (miniKey === "ipmini4") {
    state.ipMini4Pin = "";
    state.ipMini4Matrix = [];
    state.ipMini4Probed = {};
  }
  if (miniKey === "ipmini5") {
    state.ipMini5Needle = "";
    state.ipMini5Users = [];
    state.ipMini5Score = {};
    state.ipMini5Scanned = {};
  }
  if (miniKey === "ipmini6") {
    state.ipMini6Needle = "";
    state.ipMini6Files = [];
    state.ipMini6Score = {};
    state.ipMini6Scanned = {};
  }
}

function miniStageMeta(miniKey) {
  if (FIRST_STAGE_MINI.includes(miniKey)) {
    return { list: state.firstStageSelected, done: state.firstStageDone, stageName: "этап 1" };
  }
  return { list: IP_STAGE_MINI, done: state.ipStageDone, stageName: "IP этап" };
}

function registerMiniSuccess(miniKey, points) {
  const meta = miniStageMeta(miniKey);
  meta.done[miniKey] = true;
  state.errorCounts[miniKey] = 0;
  state.activeMini = "";
  playActivity(`${miniKey.toUpperCase()} POST`);
  clearMiniState(miniKey);
  gain(points);
}

function registerMiniError(miniKey) {
  const meta = miniStageMeta(miniKey);
  state.errorCounts[miniKey] = (state.errorCounts[miniKey] || 0) + 1;
  const tries = state.errorCounts[miniKey];

  if (tries < 5) {
    writeLine(`Ошибка (${tries}/5).`, "error");
    return false;
  }

  state.errorCounts[miniKey] = 0;
  clearMiniState(miniKey);
  state.activeMini = "";
  const idx = meta.list.indexOf(miniKey);
  if (idx > 0) {
    const prevKey = meta.list[idx - 1];
    meta.done[prevKey] = false;
    clearMiniState(prevKey);
    writeLine(`Лимит ошибок достигнут. Откат на предыдущую мини-игру: ${prevKey}.`, "error");
  } else {
    writeLine("Лимит ошибок достигнут. Перезапусти первую мини-игру этапа.", "error");
  }
  return true;
}

function canStartMini(miniKey) {
  const meta = miniStageMeta(miniKey);
  const expected = currentMiniKey(meta.list, meta.done);
  if (!expected) return true;
  if (miniKey !== expected) {
    writeLine(`Порядок строгий. Сначала нужно пройти ${expected}.`, "error");
    return false;
  }
  return true;
}

function buildClientsData() {
  const surnames = [
    "Иванов", "Петров", "Сидоров", "Кузнецов", "Смирнов", "Моррисон", "Райт", "Гарсия", "Нгуен", "Шмидт",
    "Романов", "Фишер", "Кларк", "Браун", "Сингх", "Мартинес", "Холл", "Сато", "О'Нил", "Пак"
  ];
  const names = [
    "Алексей", "Мария", "Сергей", "Николай", "Елена", "Michael", "Sarah", "David", "Emma", "Daniel",
    "Lucas", "Mia", "Hiro", "Sofia", "Arjun", "Liam", "Olivia", "Noah", "Ava", "Ethan"
  ];
  const countries = [
    "Россия", "США", "Канада", "Германия", "Франция", "Япония", "Бразилия", "Испания", "Италия", "Австралия",
    "Мексика", "Чили", "Польша", "Швеция", "Норвегия", "Казахстан", "ЮАР", "Индия", "Аргентина", "Португалия"
  ];
  const cities = [
    "Москва", "Санкт-Петербург", "Нью-Йорк", "Лос-Анджелес", "Берлин", "Париж", "Токио", "Сидней", "Рио-де-Жанейро", "Мадрид",
    "Варшава", "Осло", "Стокгольм", "Торонто", "Сан-Паулу", "Алматы", "Кейптаун", "Мумбаи", "Буэнос-Айрес", "Лиссабон"
  ];

  const lines = [];
  for (let i = 1; i <= 100; i += 1) {
    if (i === 62) {
      lines.push(`${i}. Джонатан Манлихер, США, Лос-Сантос`);
    } else {
      lines.push(`${i}. ${randomFrom(surnames)} ${randomFrom(names)}, ${randomFrom(countries)}, ${randomFrom(cities)}`);
    }
  }
  return lines.join("\n");
}

function startMini1() {
  state.activeMini = "mini1";
  playActivity("MINI #1");
  state.mini1Code = randomCode(5);
  writeLine("MINI #1 :: Декодер сигнатуры", "success");
  writeLine(`Сигнатура перехвачена: ${state.mini1Code}`, "system");
}

function startMini2() {
  state.activeMini = "mini2";
  playActivity("MINI #2");
  state.mini2Sequence = Array.from({ length: 4 }, () => Math.floor(Math.random() * 9) + 1);
  state.mini2Step = 0;
  writeLine("MINI #2 :: Синхронизация импульсов", "success");
  writeLine(`Последовательность: ${state.mini2Sequence.join(" ")}`, "system");
}

function startMini3() {
  state.activeMini = "mini3";
  playActivity("MINI #3");
  const packets = [];
  while (packets.length < 6) {
    const id = `pkt-${Math.floor(Math.random() * 900) + 100}`;
    if (!packets.find((p) => p.id === id)) {
      packets.push({
        id,
        drift: Math.floor(Math.random() * 25) + 2,
      });
    }
  }
  const badIndex = Math.floor(Math.random() * packets.length);
  packets[badIndex].drift = Math.floor(Math.random() * 4);
  state.mini3Needle = packets[badIndex].id.toLowerCase();
  state.mini3Packets = packets.map((p) => p.id.toLowerCase());
  writeLine("MINI #3 :: Контрольная сумма", "success");
  writeLine(packets.map((p) => `${p.id} drift:${p.drift}%`).join(" | "), "system");
}

function startMini4() {
  state.activeMini = "mini4";
  playActivity("MINI #4");
  state.mini4Word = randomCode(4, "ABCDEFGH");
  writeLine("MINI #4 :: Калибровка антенны", "success");
  writeLine("[ANT] sweep vector locked", "system");
  writeLine("[ANT] phase shift compensation enabled", "system");
  writeLine(`[ANT] CODE ${state.mini4Word}`, "success");
  writeLine("[ANT] waiting for alignment token...", "system");
}

function startMini5() {
  state.activeMini = "mini5";
  playActivity("MINI #5");
  const channels = [];
  while (channels.length < 6) {
    const ch = `rf-${randomCode(3, "0123456789")}`;
    if (!channels.includes(ch)) channels.push(ch);
  }
  state.mini5Channels = channels;
  state.mini5Integrity = {};
  state.mini5Scanned = {};
  let weakest = channels[0];
  let weakestIntegrity = 100;
  channels.forEach((ch) => {
    const integrity = Math.floor(Math.random() * 56) + 35;
    state.mini5Integrity[ch] = integrity;
    state.mini5Scanned[ch] = false;
    if (integrity < weakestIntegrity) {
      weakestIntegrity = integrity;
      weakest = ch;
    }
  });
  state.mini5Needle = weakest;
  writeLine("MINI #5 :: Поиск уязвимого канала", "success");
  writeLine(`Список каналов: ${channels.join(", ")}`, "system");
}

function startMini6() {
  state.activeMini = "mini6";
  playActivity("MINI #6");
  const sectors = [];
  while (sectors.length < 6) {
    const sector = `sector-${randomCode(2, "ABCDEFGH")}`;
    if (!sectors.includes(sector)) sectors.push(sector);
  }
  state.mini6Sectors = sectors;
  state.mini6Reflectivity = {};
  state.mini6Scanned = {};
  let weakest = sectors[0];
  let weakestReflectivity = 100;
  sectors.forEach((sector) => {
    const reflectivity = Math.floor(Math.random() * 56) + 35;
    state.mini6Reflectivity[sector] = reflectivity;
    state.mini6Scanned[sector] = false;
    if (reflectivity < weakestReflectivity) {
      weakestReflectivity = reflectivity;
      weakest = sector;
    }
  });
  state.mini6Needle = weakest;
  writeLine("MINI #6 :: Поиск сектора отражения", "success");
  writeLine(`Карта секторов: ${sectors.join(" | ")}`, "system");
}

function startMini7() {
  state.activeMini = "mini7";
  playActivity("MINI #7");
  const token = `tr-${randomCode(4, "ABCDEFGH0123456789")}`;
  state.mini7Token = token.toLowerCase();
  const logs = [
    `[svc] mirror cache warmup id=${randomCode(3, "0123456789")}`,
    `[svc] relay pulse normalized`,
    `[svc] trace window opened`,
    `[svc] TRACE_TOKEN ${token}`,
    `[svc] fallback noise applied`,
    `[svc] transport table refreshed`,
  ];
  state.mini7Messages = logs;
  logs.forEach((line) => writeLine(line, "system"));
}

function startMini8() {
  state.activeMini = "mini8";
  playActivity("MINI #8");
  const daemons = [];
  while (daemons.length < 6) {
    const daemon = `dmn-${randomCode(3, "ABCDEFGH")}`;
    if (!daemons.includes(daemon)) daemons.push(daemon);
  }
  state.mini8Daemons = daemons;
  state.mini8Scores = {};
  let best = daemons[0];
  let bestScore = 999;
  daemons.forEach((d) => {
    const latency = Math.floor(Math.random() * 60) + 20;
    const noise = Math.floor(Math.random() * 35) + 5;
    const score = latency + noise;
    state.mini8Scores[d.toLowerCase()] = { latency, noise, score };
    if (score < bestScore) {
      bestScore = score;
      best = d;
    }
  });
  state.mini8Needle = best.toLowerCase();
  writeLine("MINI #8 :: Баланс демонов", "success");
  writeLine(`Активные демоны: ${daemons.join(", ")}`, "system");
}

function startMini9() {
  state.activeMini = "mini9";
  playActivity("MINI #9");
  const blocks = {};
  const blockIds = ["b1", "b2", "b3", "b4", "b5", "b6"];
  const targetBlock = randomFrom(blockIds);
  const targetKey = `kx-${randomCode(4, "ABCDEFGH0123456789")}`;
  blockIds.forEach((id) => {
    const fake = `kx-${randomCode(4, "ABCDEFGH0123456789")}`;
    blocks[id] = [
      `[dump:${id}] seq=${randomCode(6, "0123456789ABCDEF")}`,
      `[dump:${id}] entropy=${Math.floor(Math.random() * 80) + 20}%`,
      `[dump:${id}] ${(id === targetBlock) ? `extract=${targetKey}` : `extract=${fake}`}`,
    ];
  });
  state.mini9Needle = targetKey.toLowerCase();
  state.mini9Blocks = blocks;
  writeLine("MINI #9 :: Извлечение блока", "success");
  writeLine("Доступные блоки: b1, b2, b3, b4, b5, b6", "system");
}

function startMini10() {
  state.activeMini = "mini10";
  playActivity("MINI #10");
  const relays = [];
  while (relays.length < 6) {
    const relay = `rl-${randomCode(3, "ABCDEFGH")}`;
    if (!relays.includes(relay)) relays.push(relay);
  }
  state.mini10Relays = relays;
  state.mini10Load = {};
  let best = relays[0];
  let bestLoad = 999;
  relays.forEach((r) => {
    const load = Math.floor(Math.random() * 70) + 15;
    state.mini10Load[r.toLowerCase()] = load;
    if (load < bestLoad) {
      bestLoad = load;
      best = r;
    }
  });
  state.mini10Needle = best.toLowerCase();
  writeLine("MINI #10 :: Привязка реле", "success");
  writeLine(`Релейная сетка: ${relays.join(", ")}`, "system");
}

function startIpMini1() {
  state.activeMini = "ipmini1";
  playActivity("IP MINI #1");
  const keys = [];
  while (keys.length < 5) {
    const key = randomCode(6, "0123456789ABCDEF");
    if (!keys.includes(key)) keys.push(key);
  }
  state.ipMini1Code = randomFrom(keys);
  state.ipMini1Keys = keys;
  state.ipMini1Scanned = {};
  keys.forEach((k) => { state.ipMini1Scanned[k] = false; });
  writeLine("IP MINI #1 :: HEX-шлюз", "success");
  writeLine(`Кандидаты ключа: ${keys.join(", ")}`, "system");
}

function startIpMini2() {
  state.activeMini = "ipmini2";
  playActivity("IP MINI #2");
  const routes = [];
  while (routes.length < 5) {
    const route = `${Math.floor(Math.random() * 200) + 20}-${Math.floor(Math.random() * 200) + 20}-${Math.floor(Math.random() * 200) + 20}`;
    if (!routes.includes(route)) routes.push(route);
  }
  state.ipMini2Route = randomFrom(routes);
  state.ipMini2Routes = routes;
  state.ipMini2Scanned = {};
  routes.forEach((r) => { state.ipMini2Scanned[r] = false; });
  writeLine("IP MINI #2 :: Маршрутизатор", "success");
  writeLine(`Кандидаты маршрута: ${routes.join(", ")}`, "system");
}

function startIpMini3() {
  state.activeMini = "ipmini3";
  playActivity("IP MINI #3");
  const first = Math.floor(Math.random() * 223) + 1;
  const second = Math.floor(Math.random() * 256);
  const third = Math.floor(Math.random() * 256);
  const fourth = Math.floor(Math.random() * 256);
  state.ipMini3Ip = `${first}.${second}.${third}.${fourth}`;
  if (first <= 126) state.ipMini3Mask = "255.0.0.0";
  else if (first <= 191) state.ipMini3Mask = "255.255.0.0";
  else state.ipMini3Mask = "255.255.255.0";
  writeLine("IP MINI #3 :: Маска подсети", "success");
  writeLine(`Определи маску для IP: ${state.ipMini3Ip}`, "system");
}

function startIpMini4() {
  state.activeMini = "ipmini4";
  playActivity("IP MINI #4");
  const matrix = [];
  const pin = [];
  for (let row = 0; row < 4; row += 1) {
    const rowValues = [];
    for (let col = 0; col < 4; col += 1) {
      const digit = randomCode(1, "0123456789");
      rowValues.push(digit);
    }
    matrix.push(rowValues);
  }
  for (let i = 0; i < 4; i += 1) {
    const digit = randomCode(1, "0123456789");
    matrix[i][i] = digit;
    pin.push(digit);
  }
  state.ipMini4Pin = pin.join("");
  state.ipMini4Matrix = matrix;
  state.ipMini4Probed = {};
  writeLine("IP MINI #4 :: PIN-барьер", "success");
  writeLine("    1  2  3  4", "system");
  writeLine(`A   ${matrix[0].join("  ")}`, "system");
  writeLine(`B   ${matrix[1].join("  ")}`, "system");
  writeLine(`C   ${matrix[2].join("  ")}`, "system");
  writeLine(`D   ${matrix[3].join("  ")}`, "system");
}

function startIpMini5() {
  state.activeMini = "ipmini5";
  playActivity("IP MINI #5");
  const users = [];
  while (users.length < 6) {
    const user = `svc_${randomCode(4, "abcdefghijklmnopqrstuvwxyz")}`;
    if (!users.includes(user)) users.push(user);
  }
  state.ipMini5Users = users;
  state.ipMini5Score = {};
  state.ipMini5Scanned = {};
  let weakest = users[0];
  let weakestScore = 100;
  users.forEach((u) => {
    const score = Math.floor(Math.random() * 56) + 35;
    state.ipMini5Score[u] = score;
    state.ipMini5Scanned[u] = false;
    if (score < weakestScore) {
      weakestScore = score;
      weakest = u;
    }
  });
  state.ipMini5Needle = weakest;
  writeLine("IP MINI #5 :: Поиск сервисного аккаунта", "success");
  writeLine(`Список аккаунтов: ${users.join(", ")}`, "system");
}

function startIpMini6() {
  state.activeMini = "ipmini6";
  playActivity("IP MINI #6");
  const files = [];
  while (files.length < 6) {
    const file = `${randomFrom(["cache", "dump", "core", "mirror", "node", "seed", "frag"])}_${randomCode(3, "0123456789")}.${randomFrom(["bin", "tmp", "log", "key", "map", "dat", "pkg"])}`;
    if (!files.includes(file)) files.push(file);
  }
  state.ipMini6Files = files;
  state.ipMini6Score = {};
  state.ipMini6Scanned = {};
  let weakest = files[0];
  let weakestScore = 100;
  files.forEach((f) => {
    const score = Math.floor(Math.random() * 56) + 35;
    state.ipMini6Score[f] = score;
    state.ipMini6Scanned[f] = false;
    if (score < weakestScore) {
      weakestScore = score;
      weakest = f;
    }
  });
  state.ipMini6Needle = weakest;
  writeLine("IP MINI #6 :: Поиск целевого артефакта", "success");
  writeLine(`Список файлов: ${files.join(" ; ")}`, "system");
}

function canBreachTransponder() {
  return state.scanComplete && state.connected && state.firstStageSelected.every((mini) => state.firstStageDone[mini]);
}

function canFinishIp() {
  return allDone(state.ipStageDone);
}

function resolvePath(rawPath) {
  if (!rawPath || rawPath === ".") return state.currentDir;
  if (rawPath === "/") return "/";
  if (rawPath === "..") {
    if (state.currentDir === "/") return "/";
    const chunks = state.currentDir.split("/").filter(Boolean);
    chunks.pop();
    return chunks.length ? `/${chunks.join("/")}` : "/";
  }
  if (rawPath.startsWith("/")) return rawPath;
  if (state.currentDir === "/") return `/${rawPath}`;
  return `${state.currentDir}/${rawPath}`;
}

function listDirectory(path) {
  const items = fsTree[path];
  if (!items) {
    writeLine("Директория не найдена.", "error");
    return;
  }
  writeLine(items.join("    "), "system");
}

function printHelp() {
  writeLine("Linux-подобные команды: help, status, clear, pwd, ls, ls -la, cd, cat, tree, whoami, uname", "success");
  writeLine("Игровые команды: scan, connect, mini1..mini10, breach, hack ip, ipmini1..ipmini6", "system");
  writeLine("Ответы мини-игр: decode, pulse, checksum, align, scan <target>, findch, findsector, trace, audit, stabilize, dump, extract, check, bind, unlock, route, mask, probe <coord>, crack, finduser, findfile", "system");
  writeLine("Правило: мини-игры идут строго по порядку. 5 ошибок в одной мини-игре = откат на предыдущую.", "system");

  if (!state.scanComplete) {
    writeLine("Что делать сейчас: запусти scan", "success");
    return;
  }
  if (!state.connected) {
    writeLine("Что делать сейчас: выполни connect", "success");
    return;
  }
  if (!state.firstStageSelected.every((k) => state.firstStageDone[k])) {
    const remaining = state.firstStageSelected.filter((k) => !state.firstStageDone[k]).join(", ");
    const current = state.firstStageSelected.find((k) => !state.firstStageDone[k]);
    writeLine(`Что делать сейчас: пройти мини-игры этапа 1 (${remaining})`, "success");
    writeLine(`Активные мини-игры этой сессии: ${state.firstStageSelected.join(", ")}`, "system");
    const hints = {
      mini1: "В сигнальных строках есть ключ, который нужно декодировать.",
      mini2: "Импульсы нужно провести в правильном порядке.",
      mini3: "Ищи аномальный packet-id с критическим drift.",
      mini4: "В антенном шуме спрятан код для выравнивания.",
      mini5: "Слабый канал можно определить по диагностике scan.",
      mini6: "Нужный сектор вычисляется через серию scan.",
      mini7: "Найди скрытый trace-токен в сервисном потоке.",
      mini8: "Проверяй демоны через audit и фиксируй лучший.",
      mini9: "Извлеки ключ из дампов блоков.",
      mini10: "Сверь релейные метрики и закрепи верный bind.",
    };
    if (current) writeLine(`Подсказка текущей игры: ${hints[current]}`, "system");
    writeLine("После прохождения: breach", "system");
    return;
  }
  if (!state.transponderBreached) {
    writeLine("Что делать сейчас: выполнить breach", "success");
    return;
  }
  if (!state.ipAccessGranted) {
    writeLine("Что делать сейчас: выполнить hack ip", "success");
    return;
  }
  if (!allDone(state.ipStageDone)) {
    const remaining = IP_STAGE_MINI.filter((k) => !state.ipStageDone[k]).join(", ");
    writeLine(`Что делать сейчас: пройти IP мини-игры (${remaining})`, "success");
    writeLine("Формат IP этапа: scan <target>, unlock <hex>, route <route>, mask <mask>, probe <coord>, crack <pin>, finduser <name>, findfile <name>", "system");
    writeLine("После этого: cd /data && cat clients", "system");
    return;
  }
  if (!state.finalDone) {
    writeLine("Что делать сейчас: открыть базу клиентов командой cat /data/clients", "success");
    return;
  }
  writeLine("Операция завершена. Можно исследовать систему: ls, tree, cat /logs/session.log", "success");
}

function printStatus() {
  writeLine(`Разведка: ${state.scanComplete ? "OK" : "нет"}`, "system");
  writeLine(`Подключение: ${state.connected ? "OK" : "нет"}`, "system");
  state.firstStageSelected.forEach((key, idx) => {
    writeLine(`Этап 1 / Мини-${idx + 1}: ${state.firstStageDone[key] ? "OK" : "нет"}`, "system");
  });
  writeLine(`Транспондер: ${state.transponderBreached ? "взломан" : "защищен"}`, "system");
  if (state.ip) writeLine(`Целевой IP: ${state.ip}`, "system");
  if (state.ipAccessGranted) {
    IP_STAGE_MINI.forEach((key, idx) => {
      writeLine(`Этап 2 / Мини-${idx + 1}: ${state.ipStageDone[key] ? "OK" : "нет"}`, "system");
    });
    writeLine(`Каталог: ${state.currentDir}`, "system");
  }
  if (state.finalDone) writeLine("Финал: выполнено", "success");
}

function handleFilesystem(cmd, lower) {
  if (!state.ipAccessGranted) return false;

  if (lower === "pwd") {
    writeLine(state.currentDir, "system");
    return true;
  }

  if (lower === "whoami") {
    writeLine("operator", "system");
    return true;
  }

  if (lower === "uname" || lower === "uname -a") {
    writeLine("Linux target-ip 6.8.12-ctf #1 SMP x86_64 GNU/Linux", "system");
    return true;
  }

  if (lower === "tree") {
    writeLine(".", "system");
    writeLine("|-- cache", "system");
    writeLine("|-- logs", "system");
    writeLine("|-- tmp", "system");
    writeLine("|-- opt", "system");
    writeLine("|   |-- patches", "system");
    writeLine("|   `-- drivers", "system");
    writeLine("|-- data", "system");
    writeLine("|   |-- clients", "system");
    writeLine("|   |-- nodes.map", "system");
    writeLine("|   `-- mirror.key", "system");
    writeLine("`-- kernel.dump", "system");
    return true;
  }

  if (lower === "ls" || lower === "ls -la" || lower === "ll") {
    listDirectory(state.currentDir);
    return true;
  }

  if (lower === "cd") {
    state.currentDir = "/";
    updatePrompt();
    writeLine("Перешел в /", "system");
    return true;
  }

  if (lower.startsWith("cd ")) {
    let arg = cmd.slice(3).trim();
    if (arg === "~") arg = "/";
    const nextPath = resolvePath(arg);
    if (fsTree[nextPath]) {
      state.currentDir = nextPath;
      updatePrompt();
      writeLine(`Перешел в ${state.currentDir}`, "system");
    } else {
      writeLine("Нет такой директории.", "error");
    }
    return true;
  }

  if (lower.startsWith("cat ")) {
    let arg = cmd.slice(4).trim();
    if (arg.startsWith("./")) arg = arg.slice(2);
    if (!arg) {
      writeLine("Укажи имя файла.", "error");
      return true;
    }
    const full = resolvePath(arg);
    if (full === "/kernel.dump") {
      writeLine("Binary dump. Access denied.", "error");
      return true;
    }
    if (full === "/logs/session.log") {
      writeLine("session: ip tunnel established / warning packets 14 / auth pending", "system");
      return true;
    }
    if (full === "/logs/errors.log") {
      writeLine("error: stale cache, error: mirror timeout, warn: unauthorized ping", "system");
      return true;
    }
    if (full === "/data/nodes.map") {
      writeLine("node-a > relay-19 > relay-22 > core", "system");
      return true;
    }
    if (full === "/data/mirror.key") {
      writeLine("MIRROR_KEY=9A-44-BE-11", "system");
      return true;
    }
    if (full === "/data/clients" || full === "/clients") {
      if (!canFinishIp()) {
        writeLine("Файл clients зашифрован. Пройди все IP мини-игры.", "error");
      } else {
        writeLine(state.clientsData, "success");
        if (!state.finalDone) {
          state.finalDone = true;
          state.phase = 5;
          gain(120);
          writeLine("Доступ к клиентской базе получен. Операция завершена.", "success");
        }
      }
      return true;
    }
    writeLine("Файл не найден.", "error");
    return true;
  }

  return false;
}

function bootMessage() {
  state.clientsData = buildClientsData();
  state.firstStageSelected = pickUnique(FIRST_STAGE_MINI, 5);
  FIRST_STAGE_MINI.forEach((mini) => {
    state.firstStageDone[mini] = false;
  });
  writeLine("=== TRANSPONDER BREACH SIM v0.2 ===", "success");
  writeLine("Художественный офлайн-симулятор запущен.", "system");
  writeLine("Введи help для списка команд.", "system");
  updateHud();
  updatePrompt();
}

function handleCommand(raw) {
  const cmd = raw.trim();
  if (!cmd) return;

  writeLine(`${promptLabel.textContent} ${cmd}`, "command");
  const lower = cmd.toLowerCase();

  if (lower === "clear") {
    output.innerHTML = "";
    return;
  }
  if (lower === "h" || lower === "man") return printHelp();
  if (lower === "help") return printHelp();
  if (lower === "status") return printStatus();
  if (handleFilesystem(cmd, lower)) return;

  if (["pwd", "ls", "ls -la", "ll", "tree", "whoami", "uname", "uname -a"].includes(lower) || lower.startsWith("cd ") || lower.startsWith("cat ")) {
    writeLine("Линукс-команды файловой системы доступны после команды hack ip.", "error");
    return;
  }

  if (lower === "scan") {
    if (["mini5", "mini6", "ipmini1", "ipmini2", "ipmini5", "ipmini6"].includes(state.activeMini)) {
      writeLine("В этой мини-игре используй scan <target>.", "error");
      return;
    }
    if (state.scanComplete) return writeLine("Разведка уже выполнена.", "system");
    state.scanComplete = true;
    state.phase = Math.max(state.phase, 1);
    gain(10);
    writeLine("Сканирование завершено: обнаружены открытые каналы.", "success");
    return;
  }

  if (lower.startsWith("scan ")) {
    const argRaw = cmd.slice(5).trim();
    const arg = argRaw.toLowerCase();
    if (state.activeMini === "mini5") {
      if (!state.mini5Channels.includes(arg)) {
        writeLine("Канал не найден в списке mini5.", "error");
        return;
      }
      state.mini5Scanned[arg] = true;
      writeLine(`${arg} :: integrity ${state.mini5Integrity[arg]}%`, "system");
      return;
    }
    if (state.activeMini === "mini6") {
      const sectorMatch = state.mini6Sectors.find((sector) => sector.toLowerCase() === arg);
      if (!sectorMatch) {
        writeLine("Сектор не найден в списке mini6.", "error");
        return;
      }
      state.mini6Scanned[sectorMatch] = true;
      writeLine(`${sectorMatch} :: reflectivity ${state.mini6Reflectivity[sectorMatch]}%`, "system");
      return;
    }
    if (state.activeMini === "ipmini1") {
      const raw = cmd.slice(5).trim().toUpperCase();
      if (!state.ipMini1Keys.includes(raw)) {
        writeLine("Ключ не найден в списке ipmini1.", "error");
        return;
      }
      state.ipMini1Scanned[raw] = true;
      const status = raw === state.ipMini1Code ? "MATCH" : "REJECT";
      writeLine(`${raw} :: ${status}`, raw === state.ipMini1Code ? "success" : "system");
      return;
    }
    if (state.activeMini === "ipmini2") {
      const raw = cmd.slice(5).trim();
      if (!state.ipMini2Routes.includes(raw)) {
        writeLine("Маршрут не найден в списке ipmini2.", "error");
        return;
      }
      state.ipMini2Scanned[raw] = true;
      const status = raw === state.ipMini2Route ? "LATENCY 11ms" : `LATENCY ${Math.floor(Math.random() * 80) + 45}ms`;
      writeLine(`${raw} :: ${status}`, raw === state.ipMini2Route ? "success" : "system");
      return;
    }
    if (state.activeMini === "ipmini5") {
      if (!state.ipMini5Users.includes(arg)) {
        writeLine("Аккаунт не найден в списке ipmini5.", "error");
        return;
      }
      state.ipMini5Scanned[arg] = true;
      writeLine(`${arg} :: vuln-score ${state.ipMini5Score[arg]}%`, "system");
      return;
    }
    if (state.activeMini === "ipmini6") {
      if (!state.ipMini6Files.includes(arg)) {
        writeLine("Файл не найден в списке ipmini6.", "error");
        return;
      }
      state.ipMini6Scanned[arg] = true;
      writeLine(`${arg} :: exposure ${state.ipMini6Score[arg]}%`, "system");
      return;
    }
    writeLine("scan <target> доступна в mini5/mini6/ipmini1/ipmini2/ipmini5/ipmini6.", "error");
    return;
  }

  if (lower === "connect") {
    if (!state.scanComplete) return writeLine("Сначала выполни scan.", "error");
    if (state.connected) return writeLine("Сессия уже активна.", "system");
    state.connected = true;
    state.phase = Math.max(state.phase, 2);
    gain(10);
    playActivity("LINK");
    writeLine(`Подключение установлено. Активированы 5 задач: ${state.firstStageSelected.join(", ")}.`, "success");
    return;
  }

  if (lower.startsWith("mini")) {
    if (!state.connected) return writeLine("Нет подключения к узлу.", "error");
    if (!state.firstStageSelected.includes(lower)) {
      return writeLine("Эта мини-игра не активна в текущей сессии.", "error");
    }
    if (lower === "mini1") return canStartMini("mini1") ? startMini1() : null;
    if (lower === "mini2") return canStartMini("mini2") ? startMini2() : null;
    if (lower === "mini3") return canStartMini("mini3") ? startMini3() : null;
    if (lower === "mini4") return canStartMini("mini4") ? startMini4() : null;
    if (lower === "mini5") return canStartMini("mini5") ? startMini5() : null;
    if (lower === "mini6") return canStartMini("mini6") ? startMini6() : null;
    if (lower === "mini7") return canStartMini("mini7") ? startMini7() : null;
    if (lower === "mini8") return canStartMini("mini8") ? startMini8() : null;
    if (lower === "mini9") return canStartMini("mini9") ? startMini9() : null;
    if (lower === "mini10") return canStartMini("mini10") ? startMini10() : null;
  }

  if (lower.startsWith("decode ")) {
    const value = cmd.slice(7).trim().toUpperCase();
    if (!canStartMini("mini1")) return;
    if (!state.mini1Code) return writeLine("Сначала запусти mini1.", "error");
    if (value === state.mini1Code) {
      registerMiniSuccess("mini1", 20);
      playMiniSuccessNoise("mini1");
      writeLine("MINI #1 пройдена.", "success");
    } else {
      if (!registerMiniError("mini1")) {
        state.mini1Code = "";
        writeLine("Неверный код, запусти mini1 заново.", "error");
      }
    }
    return;
  }

  if (lower.startsWith("pulse ")) {
    if (!canStartMini("mini2")) return;
    if (!state.mini2Sequence.length) return writeLine("Сначала запусти mini2.", "error");
    const value = Number(cmd.slice(6).trim());
    const expected = state.mini2Sequence[state.mini2Step];
    if (value === expected) {
      state.mini2Step += 1;
      writeLine(`[PULSE] channel-${state.mini2Step} overload detected`, "system");
      writeLine("[PULSE] timing desync injected", "system");
      if (state.mini2Step >= state.mini2Sequence.length) {
        writeLine("[ERR] relay-1 heartbeat lost", "error");
        writeLine("[ERR] relay-2 buffer overflow", "error");
        writeLine("[ERR] relay-3 emergency shutdown", "error");
        writeLine("[PULSE] full chain collapse confirmed", "success");
        registerMiniSuccess("mini2", 25);
        playMiniSuccessNoise("mini2");
        writeLine("MINI #2 пройдена.", "success");
      }
    } else {
      if (!registerMiniError("mini2")) {
        state.mini2Sequence = [];
        state.mini2Step = 0;
        writeLine("Сбой синхронизации, запусти mini2 снова.", "error");
      }
    }
    return;
  }

  if (lower.startsWith("checksum ")) {
    if (!canStartMini("mini3")) return;
    if (!state.mini3Needle) return writeLine("Сначала запусти mini3.", "error");
    const answer = cmd.slice(9).trim().toLowerCase();
    if (!state.mini3Packets.includes(answer)) {
      writeLine("Нет такого packet-id в списке mini3.", "error");
      return;
    }
    if (answer === state.mini3Needle) {
      registerMiniSuccess("mini3", 15);
      playMiniSuccessNoise("mini3");
      writeLine("MINI #3 пройдена.", "success");
    } else {
      if (!registerMiniError("mini3")) {
        state.mini3Needle = "";
        state.mini3Packets = [];
        writeLine("Неверно, перезапусти mini3.", "error");
      }
    }
    return;
  }

  if (lower.startsWith("align ")) {
    if (!canStartMini("mini4")) return;
    if (!state.mini4Word) return writeLine("Сначала запусти mini4.", "error");
    const answer = cmd.slice(6).trim().toUpperCase();
    const target = state.mini4Word.split("").reverse().join("");
    if (answer === target) {
      registerMiniSuccess("mini4", 15);
      playMiniSuccessNoise("mini4");
      writeLine("MINI #4 пройдена.", "success");
    } else {
      if (!registerMiniError("mini4")) {
        state.mini4Word = "";
        writeLine("Калибровка провалена, запусти mini4 снова.", "error");
      }
    }
    return;
  }

  if (lower.startsWith("findch ")) {
    if (!canStartMini("mini5")) return;
    const val = cmd.slice(7).trim().toLowerCase();
    if (!state.mini5Needle) return writeLine("Сначала запусти mini5.", "error");
    if (val === state.mini5Needle.toLowerCase()) {
      registerMiniSuccess("mini5", 20);
      playMiniSuccessNoise("mini5");
      writeLine("MINI #5 пройдена.", "success");
    } else {
      if (!registerMiniError("mini5")) {
        state.mini5Needle = "";
        writeLine("Цель не найдена, запусти mini5 снова.", "error");
      }
    }
    return;
  }

  if (lower.startsWith("findsector ")) {
    if (!canStartMini("mini6")) return;
    const val = cmd.slice(11).trim().toLowerCase();
    if (!state.mini6Needle) return writeLine("Сначала запусти mini6.", "error");
    if (val === state.mini6Needle.toLowerCase()) {
      registerMiniSuccess("mini6", 20);
      playMiniSuccessNoise("mini6");
      writeLine("MINI #6 пройдена.", "success");
    } else {
      if (!registerMiniError("mini6")) {
        state.mini6Needle = "";
        writeLine("Сектор не найден, запусти mini6 снова.", "error");
      }
    }
    return;
  }

  if (lower.startsWith("trace ")) {
    if (!canStartMini("mini7")) return;
    if (!state.mini7Token) return writeLine("Сначала запусти mini7.", "error");
    const val = cmd.slice(6).trim().toLowerCase();
    if (val === state.mini7Token) {
      registerMiniSuccess("mini7", 20);
      playMiniSuccessNoise("mini7");
      writeLine("MINI #7 пройдена.", "success");
    } else if (!registerMiniError("mini7")) {
      state.mini7Token = "";
      state.mini7Messages = [];
      writeLine("TRACE маркер не подтвержден.", "error");
    }
    return;
  }

  if (lower.startsWith("audit ")) {
    if (!canStartMini("mini8")) return;
    const val = cmd.slice(6).trim().toLowerCase();
    if (!state.mini8Daemons.length) return writeLine("Сначала запусти mini8.", "error");
    const daemon = state.mini8Daemons.find((d) => d.toLowerCase() === val);
    if (!daemon) return writeLine("Демон не найден.", "error");
    const stats = state.mini8Scores[daemon.toLowerCase()];
    writeLine(`${daemon} :: latency=${stats.latency} noise=${stats.noise} score=${stats.score}`, "system");
    return;
  }

  if (lower.startsWith("stabilize ")) {
    if (!canStartMini("mini8")) return;
    const val = cmd.slice(10).trim().toLowerCase();
    if (!state.mini8Needle) return writeLine("Сначала запусти mini8.", "error");
    if (val === state.mini8Needle) {
      registerMiniSuccess("mini8", 20);
      playMiniSuccessNoise("mini8");
      writeLine("MINI #8 пройдена.", "success");
    } else if (!registerMiniError("mini8")) {
      state.mini8Needle = "";
      state.mini8Daemons = [];
      state.mini8Scores = {};
      writeLine("Стабилизация не принята.", "error");
    }
    return;
  }

  if (lower.startsWith("dump ")) {
    if (!canStartMini("mini9")) return;
    const block = cmd.slice(5).trim().toLowerCase();
    if (!state.mini9Needle) return writeLine("Сначала запусти mini9.", "error");
    if (!state.mini9Blocks[block]) return writeLine("Блок не найден.", "error");
    state.mini9Blocks[block].forEach((line) => writeLine(line, "system"));
    return;
  }

  if (lower.startsWith("extract ")) {
    if (!canStartMini("mini9")) return;
    const val = cmd.slice(8).trim().toLowerCase();
    if (!state.mini9Needle) return writeLine("Сначала запусти mini9.", "error");
    if (val === state.mini9Needle) {
      registerMiniSuccess("mini9", 20);
      playMiniSuccessNoise("mini9");
      writeLine("MINI #9 пройдена.", "success");
    } else if (!registerMiniError("mini9")) {
      state.mini9Needle = "";
      state.mini9Blocks = {};
      writeLine("Ключ извлечения невалиден.", "error");
    }
    return;
  }

  if (lower.startsWith("check ")) {
    if (!canStartMini("mini10")) return;
    const relay = cmd.slice(6).trim().toLowerCase();
    if (!state.mini10Needle) return writeLine("Сначала запусти mini10.", "error");
    const match = state.mini10Relays.find((r) => r.toLowerCase() === relay);
    if (!match) return writeLine("Реле не найдено.", "error");
    writeLine(`${match} :: load=${state.mini10Load[match.toLowerCase()]}%`, "system");
    return;
  }

  if (lower.startsWith("bind ")) {
    if (!canStartMini("mini10")) return;
    const val = cmd.slice(5).trim().toLowerCase();
    if (!state.mini10Needle) return writeLine("Сначала запусти mini10.", "error");
    if (val === state.mini10Needle) {
      registerMiniSuccess("mini10", 20);
      playMiniSuccessNoise("mini10");
      writeLine("MINI #10 пройдена.", "success");
    } else if (!registerMiniError("mini10")) {
      state.mini10Needle = "";
      state.mini10Relays = [];
      state.mini10Load = {};
      writeLine("Привязка реле не выполнена.", "error");
    }
    return;
  }

  if (lower === "breach") {
    if (state.transponderBreached) return writeLine("Транспондер уже вскрыт.", "system");
    if (!canBreachTransponder()) return writeLine("Не выполнены условия. Используй status.", "error");
    state.transponderBreached = true;
    state.phase = Math.max(state.phase, 3);
    state.ip = `185.73.${Math.floor(Math.random() * 120) + 10}.${Math.floor(Math.random() * 220) + 20}`;
    gain(40);
    playActivity("BREACH");
    writeLine("CORE ACCESS GRANTED", "success");
    writeLine(`Получен IP целевого узла: ${state.ip}`, "success");
    writeLine("Следующая команда: hack ip", "system");
    return;
  }

  if (lower === "hack ip") {
    if (!state.transponderBreached) return writeLine("Сначала выполни breach.", "error");
    if (state.ipAccessGranted) return writeLine("Доступ к IP уже активен.", "system");
    state.ipAccessGranted = true;
    state.phase = Math.max(state.phase, 4);
    gain(20);
    playActivity("TUNNEL");
    writeLine(`Туннель к ${state.ip} открыт. Система показывает файловую структуру.`, "success");
    writeLine("Сначала пройди 6 IP мини-игр: ipmini1..ipmini6", "system");
    writeLine("После этого открой файл: cd data -> cat clients", "system");
    updatePrompt();
    return;
  }

  if (lower === "ipmini1") {
    if (!state.ipAccessGranted) return writeLine("Сначала hack ip.", "error");
    return canStartMini("ipmini1") ? startIpMini1() : null;
  }
  if (lower === "ipmini2") {
    if (!state.ipAccessGranted) return writeLine("Сначала hack ip.", "error");
    return canStartMini("ipmini2") ? startIpMini2() : null;
  }
  if (lower === "ipmini3") {
    if (!state.ipAccessGranted) return writeLine("Сначала hack ip.", "error");
    return canStartMini("ipmini3") ? startIpMini3() : null;
  }
  if (lower === "ipmini4") {
    if (!state.ipAccessGranted) return writeLine("Сначала hack ip.", "error");
    return canStartMini("ipmini4") ? startIpMini4() : null;
  }
  if (lower === "ipmini5") {
    if (!state.ipAccessGranted) return writeLine("Сначала hack ip.", "error");
    return canStartMini("ipmini5") ? startIpMini5() : null;
  }
  if (lower === "ipmini6") {
    if (!state.ipAccessGranted) return writeLine("Сначала hack ip.", "error");
    return canStartMini("ipmini6") ? startIpMini6() : null;
  }

  if (lower.startsWith("unlock ")) {
    const val = cmd.slice(7).trim().toUpperCase();
    if (!canStartMini("ipmini1")) return;
    if (!state.ipMini1Code) return writeLine("Сначала ipmini1.", "error");
    if (val === state.ipMini1Code) {
      registerMiniSuccess("ipmini1", 20);
      playMiniSuccessNoise("ipmini1");
      writeLine("IP MINI #1 пройдена.", "success");
    } else {
      if (!registerMiniError("ipmini1")) {
        writeLine("Неверный HEX.", "error");
      }
    }
    return;
  }

  if (lower.startsWith("route ")) {
    const val = cmd.slice(6).trim();
    if (!canStartMini("ipmini2")) return;
    if (!state.ipMini2Route) return writeLine("Сначала ipmini2.", "error");
    if (val === state.ipMini2Route) {
      registerMiniSuccess("ipmini2", 20);
      playMiniSuccessNoise("ipmini2");
      writeLine("IP MINI #2 пройдена.", "success");
    } else {
      if (!registerMiniError("ipmini2")) {
        writeLine("Маршрут не совпал.", "error");
      }
    }
    return;
  }

  if (lower.startsWith("mask ")) {
    const val = cmd.slice(5).trim();
    if (!canStartMini("ipmini3")) return;
    if (!state.ipMini3Mask) return writeLine("Сначала ipmini3.", "error");
    if (val === state.ipMini3Mask) {
      registerMiniSuccess("ipmini3", 20);
      playMiniSuccessNoise("ipmini3");
      writeLine("IP MINI #3 пройдена.", "success");
    } else {
      if (!registerMiniError("ipmini3")) {
        writeLine("Маска неверна.", "error");
      }
    }
    return;
  }

  if (lower.startsWith("probe ")) {
    const coordRaw = cmd.slice(6).trim().toUpperCase();
    if (!canStartMini("ipmini4")) return;
    if (!state.ipMini4Matrix.length) return writeLine("Сначала ipmini4.", "error");
    let coord = coordRaw;
    if (/^[ABCD][1-4][1-4]$/.test(coordRaw) && coordRaw[1] === coordRaw[2]) {
      coord = `${coordRaw[0]}${coordRaw[1]}`;
    }
    if (!/^[ABCD][1-4]$/.test(coord)) {
      writeLine("Формат координаты: A1..D4", "error");
      return;
    }
    const row = coord.charCodeAt(0) - 65;
    const col = Number(coord[1]) - 1;
    const value = state.ipMini4Matrix[row][col];
    state.ipMini4Probed[coord] = true;
    const diagonal = row === col;
    writeLine(`${coord} => ${value} ${diagonal ? "[diag]" : ""}`.trim(), diagonal ? "success" : "system");
    return;
  }

  if (lower.startsWith("crack ")) {
    const val = cmd.slice(6).trim();
    if (!canStartMini("ipmini4")) return;
    if (!state.ipMini4Pin) return writeLine("Сначала ipmini4.", "error");
    if (Object.keys(state.ipMini4Probed).length < 4) {
      writeLine("Недостаточно данных. Используй probe <coord> для расшифровки матрицы.", "error");
      return;
    }
    if (val === state.ipMini4Pin) {
      registerMiniSuccess("ipmini4", 20);
      playMiniSuccessNoise("ipmini4");
      writeLine("IP MINI #4 пройдена.", "success");
      if (canFinishIp()) {
        writeLine("Все IP мини-игры завершены. Теперь доступен файл clients.", "success");
      }
    } else {
      if (!registerMiniError("ipmini4")) {
        writeLine("PIN отклонен.", "error");
      }
    }
    return;
  }

  if (lower.startsWith("finduser ")) {
    const val = cmd.slice(9).trim().toLowerCase();
    if (!canStartMini("ipmini5")) return;
    if (!state.ipMini5Needle) return writeLine("Сначала ipmini5.", "error");
    if (val === state.ipMini5Needle.toLowerCase()) {
      registerMiniSuccess("ipmini5", 20);
      playMiniSuccessNoise("ipmini5");
      writeLine("IP MINI #5 пройдена.", "success");
      if (canFinishIp()) {
        writeLine("Все IP мини-игры завершены. Теперь доступен файл clients.", "success");
      }
    } else {
      if (!registerMiniError("ipmini5")) {
        writeLine("Аккаунт не найден.", "error");
      }
    }
    return;
  }

  if (lower.startsWith("findfile ")) {
    const val = cmd.slice(9).trim().toLowerCase();
    if (!canStartMini("ipmini6")) return;
    if (!state.ipMini6Needle) return writeLine("Сначала ipmini6.", "error");
    if (val === state.ipMini6Needle.toLowerCase()) {
      registerMiniSuccess("ipmini6", 20);
      playMiniSuccessNoise("ipmini6");
      writeLine("IP MINI #6 пройдена.", "success");
      if (canFinishIp()) {
        writeLine("Все IP мини-игры завершены. Теперь доступен файл clients.", "success");
      }
    } else {
      if (!registerMiniError("ipmini6")) {
        writeLine("Файл не найден.", "error");
      }
    }
    return;
  }

  writeLine("Неизвестная команда. Используй help.", "error");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  handleCommand(input.value);
  input.value = "";
});

bootMessage();
