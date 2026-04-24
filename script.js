const output = document.getElementById("terminalOutput");
const form = document.getElementById("terminalForm");
const input = document.getElementById("terminalInput");
const phaseBadge = document.getElementById("phaseBadge");
const scoreBadge = document.getElementById("scoreBadge");
const promptLabel = document.getElementById("promptLabel");

const FIRST_STAGE_MINI = ["mini1", "mini2", "mini3", "mini4", "mini5"];
const IP_STAGE_MINI = ["ipmini1", "ipmini2", "ipmini3", "ipmini4", "ipmini5", "ipmini6"];

const state = {
  phase: 0,
  score: 0,
  scanComplete: false,
  scanChannels: [],
  selectedChannel: "",
  connected: false,
  transponderBreached: false,
  ip: "",
  ipAccessGranted: false,
  finalDone: false,
  firstStageSelected: [],
  chainSig: "",
  chainSigFull: "",
  chainPulse: "",
  chainPacket: "",
  chainAlign: "",
  mini1Code: "",
  mini2Sequence: [],
  mini2Step: 0,
  mini2Armed: false,
  mini3Needle: "",
  mini3Packets: [],
  mini3Drift: {},
  mini3Scanned: {},
  mini3LeakPacket: "",
  mini4Word: "",
  mini4Codes: [],
  mini5Needle: "",
  mini5Channels: [],
  mini5Integrity: {},
  mini5Scanned: {},
  ipMini1Code: "",
  ipMini1Keys: [],
  ipMini1Scanned: {},
  ipChainRouteSeed: "",
  ipMini2Route: "",
  ipMini2Routes: [],
  ipMini2Scanned: {},
  ipChainClassHint: "",
  ipMini3Mask: "",
  ipMini3Ip: "",
  ipMini3NeedHosts: 0,
  ipMini3Profiles: [],
  ipMini3Scanned: {},
  ipMini3Prefix: 24,
  ipChainDiagSeed: 0,
  ipMini4Pin: "",
  ipMini4Matrix: [],
  ipMini4Probed: {},
  ipMini4Column: 0,
  ipChainSvcTag: "",
  ipMini5Needle: "",
  ipMini5Users: [],
  ipMini5Score: {},
  ipMini5Scanned: {},
  ipChainFileTag: "",
  ipMini6Needle: "",
  ipMini6Files: [],
  ipMini6Score: {},
  ipMini6Scanned: {},
  currentDir: "/",
  clientsData: "",
  clientsEncryptedData: "",
  activeMini: "",
  errorCounts: {},
  firstStageDone: {
    mini1: false,
    mini2: false,
    mini3: false,
    mini4: false,
    mini5: false,
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

  const generic = [`[${tag}] checksum OK`];

  const extra = techByTag[tag] || generic;
  const noiseLines = [];
  if (["LINK", "BREACH", "TUNNEL"].includes(tag) && Math.random() < 0.4) {
    noiseLines.push("[WARN] transient jitter detected");
  }
  const steps = [...base, ...extra, ...noiseLines];
  steps.forEach((line, idx) => {
    const type = line.startsWith("[ERR]") ? "error" : line.startsWith("[WARN]") ? "system" : "system";
    setTimeout(() => writeLine(line, type), idx * 170);
  });
}

function playMiniSuccessNoise(miniKey) {
  const tag = miniKey.toUpperCase();
  const generic = [`[${tag}] commit accepted`];
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
  if (scoreBadge) {
    scoreBadge.textContent = `Рейтинг: ${state.score}`;
  }
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

function mapDigitToAH(ch) {
  const d = Number(ch);
  if (Number.isNaN(d)) return "A";
  return "ABCDEFGH"[d % 8];
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
    state.mini2Armed = false;
  }
  if (miniKey === "mini3") {
    state.mini3Needle = "";
    state.mini3Packets = [];
    state.mini3Drift = {};
    state.mini3Scanned = {};
    state.mini3LeakPacket = "";
  }
  if (miniKey === "mini4") state.mini4Word = "";
  if (miniKey === "mini4") state.mini4Codes = [];
  if (miniKey === "mini5") {
    state.mini5Needle = "";
    state.mini5Channels = [];
    state.mini5Integrity = {};
    state.mini5Scanned = {};
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
    state.ipMini3NeedHosts = 0;
    state.ipMini3Profiles = [];
    state.ipMini3Scanned = {};
    state.ipMini3Prefix = 24;
  }
  if (miniKey === "ipmini4") {
    state.ipMini4Pin = "";
    state.ipMini4Matrix = [];
    state.ipMini4Probed = {};
    state.ipMini4Column = 0;
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

function startMiniByKey(miniKey) {
  if (miniKey === "mini1") return startMini1();
  if (miniKey === "mini2") return startMini2();
  if (miniKey === "mini3") return startMini3();
  if (miniKey === "mini4") return startMini4();
  if (miniKey === "mini5") return startMini5();
  if (miniKey === "ipmini1") return startIpMini1();
  if (miniKey === "ipmini2") return startIpMini2();
  if (miniKey === "ipmini3") return startIpMini3();
  if (miniKey === "ipmini4") return startIpMini4();
  if (miniKey === "ipmini5") return startIpMini5();
  if (miniKey === "ipmini6") return startIpMini6();
  return null;
}

function registerMiniSuccess(miniKey, points) {
  const meta = miniStageMeta(miniKey);
  meta.done[miniKey] = true;
  state.errorCounts[miniKey] = 0;
  state.activeMini = "";
  playActivity(`${miniKey.toUpperCase()} POST`);
  clearMiniState(miniKey);
  gain(points);
  if (FIRST_STAGE_MINI.includes(miniKey)) {
    const nextMini = currentMiniKey(state.firstStageSelected, state.firstStageDone);
    if (nextMini) {
      setTimeout(() => {
        writeLine(`[FLOW] Переход к ${nextMini}...`, "system");
        startMiniByKey(nextMini);
      }, 380);
    }
  }
  if (IP_STAGE_MINI.includes(miniKey)) {
    const nextIpMini = currentMiniKey(IP_STAGE_MINI, state.ipStageDone);
    if (nextIpMini) {
      setTimeout(() => {
        writeLine(`[FLOW] uplink -> ${nextIpMini}`, "system");
        startMiniByKey(nextIpMini);
      }, 420);
    }
  }
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
    setTimeout(() => {
      writeLine(`[FLOW] Автоповтор ${prevKey}...`, "system");
      startMiniByKey(prevKey);
    }, 420);
  } else {
    const firstKey = meta.list[0];
    writeLine(`Лимит ошибок достигнут. Возврат к ${firstKey}.`, "error");
    if (firstKey) {
      setTimeout(() => {
        writeLine(`[FLOW] Автоповтор ${firstKey}...`, "system");
        startMiniByKey(firstKey);
      }, 420);
    }
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

function buildEncryptedClientsData(plainText) {
  return plainText
    .split("\n")
    .map((line, idx) => {
      const payload = Array.from(line)
        .map((ch) => ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"))
        .join("");
      return `${String(idx + 1).padStart(3, "0")}# ${payload}`;
    })
    .join("\n");
}

function playIpEntryScene() {
  const scripted = [
    "operator@target-ip:/$ tree",
    ".",
    "|-- cache",
    "|-- logs",
    "|-- tmp",
    "|-- opt",
    "|-- data",
    "|   |-- clients",
    "|   |-- nodes.map",
    "|   `-- mirror.key",
    "`-- kernel.dump",
    "operator@target-ip:/$ cd data",
    "operator@target-ip:/data$ cat clients",
    state.clientsEncryptedData,
    "[ERR] clients blob encrypted :: cipher-layer ACTIVE",
    "[CORE] Поиск ключей шифрования запущен...",
  ];
  scripted.forEach((line, idx) => {
    const isCommand = line.startsWith("operator@");
    const isError = line.startsWith("[ERR]");
    setTimeout(() => writeLine(line, isCommand ? "command" : isError ? "error" : "system"), idx * 150);
  });
}

function startMini1() {
  state.activeMini = "mini1";
  playActivity("MINI #1");
  state.mini1Code = randomCode(5);
  writeLine("MINI #1 :: Декодер сигнатуры", "success");
  writeLine(`[SIG] capture frame=${state.mini1Code}`, "system");
}

function startMini2() {
  state.activeMini = "mini2";
  playActivity("MINI #2");
  state.mini2Sequence = Array.from({ length: 4 }, () => Math.floor(Math.random() * 9) + 1);
  if (state.chainSig.length >= 2) {
    state.mini2Sequence[0] = (state.chainSig.charCodeAt(0) % 9) + 1;
    state.mini2Sequence[1] = (state.chainSig.charCodeAt(1) % 9) + 1;
  }
  state.mini2Step = 0;
  state.mini2Armed = false;
  writeLine("MINI #2 :: Синхронизация импульсов", "success");
  writeLine("[SYNC] seed vector locked from previous signature", "system");
  writeLine("[SYNC] sequence masked. awaiting unlock token...", "system");
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
  const pulsePrefix = state.chainPulse || String(Math.floor(Math.random() * 9) + 1);
  const leakPacket = state.mini3LeakPacket || `pkt-${pulsePrefix}${Math.floor(Math.random() * 90) + 10}`;
  packets[badIndex].id = leakPacket;
  packets[badIndex].drift = Math.floor(Math.random() * 4);
  let decoyIndex = Math.floor(Math.random() * packets.length);
  while (decoyIndex === badIndex) decoyIndex = Math.floor(Math.random() * packets.length);
  packets[decoyIndex].drift = packets[badIndex].drift;
  state.mini3Needle = packets[badIndex].id.toLowerCase();
  state.mini3Packets = packets.map((p) => p.id.toLowerCase());
  state.mini3Drift = {};
  state.mini3Scanned = {};
  packets.forEach((p) => {
    const key = p.id.toLowerCase();
    state.mini3Drift[key] = p.drift;
    state.mini3Scanned[key] = false;
  });
  writeLine("MINI #3 :: Контрольная сумма", "success");
  writeLine(`Пакеты: ${packets.map((p) => p.id).join(" | ")}`, "system");
  writeLine("[PKT] drift values are masked. use scan <packet-id>", "system");
}

function startMini4() {
  state.activeMini = "mini4";
  playActivity("MINI #4");
  const packetFragment = (state.chainPacket || randomCode(3, "0123456789")).slice(0, 2);
  const mapped = `${mapDigitToAH(packetFragment[0])}${mapDigitToAH(packetFragment[1])}`;
  state.mini4Word = `${randomCode(2, "ABCDEFGH")}${mapped}`;
  const decoyA = `${randomCode(2, "ABCDEFGH")}${randomCode(2, "ABCDEFGH")}`;
  const decoyB = `${randomCode(2, "ABCDEFGH")}${randomCode(2, "ABCDEFGH")}`;
  state.mini4Codes = [state.mini4Word, decoyA, decoyB];
  writeLine("MINI #4 :: Калибровка антенны", "success");
  writeLine("[ANT] sweep vector locked", "system");
  writeLine("[ANT] packet-link signature detected from previous stage", "system");
  writeLine(`[ANT] ref ${mapped}`, "system");
  writeLine("[ANT] phase shift compensation enabled", "system");
  writeLine(`[ANT] CODE ${state.mini4Codes[0]}`, "system");
  writeLine(`[ANT] CODE ${state.mini4Codes[1]}`, "system");
  writeLine(`[ANT] CODE ${state.mini4Codes[2]}`, "system");
  writeLine("[ANT] waiting for alignment token...", "system");
}

function startMini5() {
  state.activeMini = "mini5";
  playActivity("MINI #5");
  const channels = [];
  while (channels.length < 6) {
    const ch = `rf-${randomCode(2, "ABCDEFGHJKLMNPQRSTUVWXYZ")}${randomCode(1, "0123456789")}`;
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
  if (state.chainAlign.length >= 2) {
    weakest = `rf-${state.chainAlign.toUpperCase()}${Math.floor(Math.random() * 10)}`;
    channels[0] = weakest;
    state.mini5Integrity[weakest] = 12;
    state.mini5Scanned[weakest] = false;
  }
  state.mini5Needle = weakest;
  writeLine("MINI #5 :: Поиск уязвимого канала", "success");
  writeLine("[RF] correlation key received from alignment stage", "system");
  writeLine(`Список каналов: ${channels.join(", ")}`, "system");
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
  while (routes.length < 4) {
    const route = `${Math.floor(Math.random() * 200) + 20}-${Math.floor(Math.random() * 200) + 20}-${Math.floor(Math.random() * 200) + 20}`;
    if (!routes.includes(route)) routes.push(route);
  }
  const seedA = (state.ipChainRouteSeed.charCodeAt(0) || 65) % 90;
  const seedB = (state.ipChainRouteSeed.charCodeAt(1) || 66) % 90;
  const seededRoute = `${seedA + 10}-${seedB + 10}-${(seedA + seedB) % 90 + 10}`;
  routes.push(seededRoute);
  state.ipMini2Route = seededRoute;
  state.ipMini2Routes = routes;
  state.ipMini2Scanned = {};
  routes.forEach((r) => { state.ipMini2Scanned[r] = false; });
  writeLine("IP MINI #2 :: Маршрутизатор", "success");
  writeLine("[NET] route checksum vector inherited", "system");
  writeLine(`Кандидаты маршрута: ${routes.join(", ")}`, "system");
}

function startIpMini3() {
  state.activeMini = "ipmini3";
  playActivity("IP MINI #3");
  const classHint = state.ipChainClassHint || randomFrom(["A", "B", "C"]);
  const classToMask = {
    A: "255.0.0.0",
    B: "255.255.0.0",
    C: "255.255.255.0",
  };
  const allMasks = Object.values(classToMask);
  const correctMask = classToMask[classHint];
  const options = [correctMask];
  while (options.length < 3) {
    const candidate = randomFrom(allMasks);
    if (!options.includes(candidate)) options.push(candidate);
  }
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  let first = Math.floor(Math.random() * 223) + 1;
  if (classHint === "A") first = Math.floor(Math.random() * 126) + 1;
  if (classHint === "B") first = Math.floor(Math.random() * 64) + 128;
  if (classHint === "C") first = Math.floor(Math.random() * 31) + 192;
  const second = Math.floor(Math.random() * 256);
  const third = Math.floor(Math.random() * 256);
  const fourth = Math.floor(Math.random() * 256);
  state.ipMini3Ip = `${first}.${second}.${third}.${fourth}`;
  state.ipMini3NeedHosts = 0;
  state.ipMini3Profiles = options;
  state.ipMini3Scanned = {};
  options.forEach((mask) => { state.ipMini3Scanned[mask] = false; });
  state.ipMini3Prefix = 24;
  state.ipMini3Mask = correctMask;
  writeLine("IP MINI #3 :: Маска подсети", "success");
  writeLine(`[SUBNET] class-vector ${classHint}`, "system");
  writeLine(`Определи маску для IP: ${state.ipMini3Ip}`, "system");
  writeLine(`Варианты: ${options.join(" | ")}`, "system");
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
  const base = Number.isInteger(state.ipChainDiagSeed) ? state.ipChainDiagSeed : Math.floor(Math.random() * 10);
  const columnShift = base % 4;
  for (let i = 0; i < 4; i += 1) {
    const digit = String((base + i * 2) % 10);
    const targetColumn = (columnShift + i) % 4;
    matrix[i][targetColumn] = digit;
    pin.push(digit);
  }
  state.ipMini4Pin = pin.join("");
  state.ipMini4Matrix = matrix;
  state.ipMini4Probed = {};
  state.ipMini4Column = columnShift;
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
  while (users.length < 5) {
    const user = `svc_${randomCode(4, "abcdefghijklmnopqrstuvwxyz")}`;
    if (!users.includes(user)) users.push(user);
  }
  const taggedUser = `svc_${randomCode(2, "abcdefghijklmnopqrstuvwxyz")}${state.ipChainSvcTag || randomCode(2, "abcdefghijklmnopqrstuvwxyz")}`;
  users.push(taggedUser);
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
  if (state.ipChainSvcTag) {
    state.ipMini5Score[taggedUser] = 11;
    state.ipMini5Scanned[taggedUser] = false;
    weakest = taggedUser;
  }
  state.ipMini5Needle = weakest;
  writeLine("IP MINI #5 :: Поиск сервисного аккаунта", "success");
  if (state.ipChainSvcTag) {
    writeLine(`[AUTH] tail-vector **${state.ipChainSvcTag}`, "system");
  }
  writeLine(`Список аккаунтов: ${users.join(", ")}`, "system");
}

function startIpMini6() {
  state.activeMini = "ipmini6";
  playActivity("IP MINI #6");
  const files = [];
  while (files.length < 5) {
    const file = `${randomFrom(["cache", "dump", "core", "mirror", "node", "seed", "frag"])}_${randomCode(3, "0123456789")}.${randomFrom(["bin", "tmp", "log", "key", "map", "dat", "pkg"])}`;
    if (!files.includes(file)) files.push(file);
  }
  const taggedFile = `frag_${randomCode(1, "0123456789")}${state.ipChainFileTag || randomCode(2, "0123456789")}.pkg`;
  files.push(taggedFile);
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
  if (state.ipChainFileTag) {
    state.ipMini6Score[taggedFile] = 9;
    state.ipMini6Scanned[taggedFile] = false;
    weakest = taggedFile;
  }
  state.ipMini6Needle = weakest;
  writeLine("IP MINI #6 :: Поиск целевого артефакта", "success");
  if (state.ipChainFileTag) {
    writeLine(`[ERR] inode drift :: expected file tail **${state.ipChainFileTag}`, "error");
  }
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
  if (!state.scanComplete) {
    writeLine("Этап: разведка узла.", "success");
    writeLine("Команды сейчас: scan", "system");
    writeLine("Подсказка: выполни scan, чтобы получить доступные каналы.", "system");
    return;
  }
  if (!state.connected) {
    writeLine("Этап: подключение к каналу.", "success");
    writeLine("Команды сейчас: connect <channel>", "system");
    writeLine("Подсказка: выбери канал из scan и подключись через connect <channel>.", "system");
    return;
  }
  if (!state.firstStageSelected.every((k) => state.firstStageDone[k])) {
    const remaining = state.firstStageSelected.filter((k) => !state.firstStageDone[k]).join(", ");
    const current = state.firstStageSelected.find((k) => !state.firstStageDone[k]);
    writeLine("Этап: первый контур взлома.", "success");
    const hints = {
      mini1: "В сигнальных строках есть ключ, который нужно декодировать.",
      mini2: "Импульсы заблокированы, токен лежит в пост-системных логах после mini1.",
      mini3: "Аномалий несколько; ищи след в аварийных логах после mini2 и подтверждай через scan.",
      mini4: "В шуме несколько CODE, но только один связан с packet-id прошлой игры.",
      mini5: "Слабый канал совпадает с ключом из выравнивания, scan помогает подтвердить.",
    };
    const miniCommands = {
      mini1: "decode <code>",
      mini2: "unlockpulse <token>, pulse <n>",
      mini3: "scan <packet-id>, checksum <packet-id>",
      mini4: "align <code>",
      mini5: "scan <channel>, findch <channel>",
    };
    if (current && miniCommands[current]) writeLine(`Команды сейчас: ${miniCommands[current]}`, "system");
    if (current) writeLine(`Подсказка: ${hints[current]}`, "system");
    return;
  }
  if (!state.transponderBreached) {
    writeLine("Этап: завершение транспондера.", "success");
    writeLine("Команды сейчас: breach", "system");
    writeLine("Подсказка: выполни breach для получения целевого IP.", "system");
    return;
  }
  if (!state.ipAccessGranted) {
    writeLine("Этап: вход в IP-контур.", "success");
    writeLine("Команды сейчас: hack ip <полученный_ip>", "system");
    writeLine("Подсказка: используй hack ip <полученный_ip>.", "system");
    return;
  }
  if (!allDone(state.ipStageDone)) {
    const remaining = IP_STAGE_MINI.filter((k) => !state.ipStageDone[k]).join(", ");
    const current = IP_STAGE_MINI.find((k) => !state.ipStageDone[k]);
    writeLine("Этап: IP мини-игры.", "success");
    const ipHints = {
      ipmini1: "Среди ключей есть корректный; скан помогает отсеять лишние.",
      ipmini2: "Маршруты связаны с прошлым ключом; сверяй задержки и сервисные следы.",
      ipmini3: "Смотри class-vector и выбери правильную маску из предложенных вариантов.",
      ipmini4: "PIN уже мелькал в шуме после ipmini3; можно сразу crack, probe нужен только для проверки.",
      ipmini5: "Смотри хвост **xx из ipmini4: в ipmini5 нужен аккаунт, который оканчивается на этот хвост.",
      ipmini6: "Ориентируйся на file tail из прошлой игры и сверяй его через scan по списку файлов.",
    };
    const ipCommands = {
      ipmini1: "scan <hex>, unlock <hex>",
      ipmini2: "scan <route>, route <route>",
      ipmini3: "mask <mask>",
      ipmini4: "crack <pin> (или probe <coord> для проверки)",
      ipmini5: "scan <user>, finduser <user>",
      ipmini6: "scan <file>, findfile <file>",
    };
    if (current && ipCommands[current]) writeLine(`Команды сейчас: ${ipCommands[current]}`, "system");
    if (current) writeLine(`Подсказка: ${ipHints[current]}`, "system");
    return;
  }
  if (!state.finalDone) {
    writeLine("Этап: извлечение данных.", "success");
    writeLine("Команды сейчас: cd data, cat clients", "system");
    writeLine("Подсказка: перейди в /data и открой clients.", "system");
    return;
  }
  writeLine("Этап: операция завершена.", "success");
  writeLine("Команды сейчас: ls, cd <dir>, cat <file>, pwd, tree", "system");
  writeLine("Подсказка: можешь исследовать систему командами файлового режима.", "system");
}

function printStatus() {
  writeLine(`Разведка: ${state.scanComplete ? "OK" : "нет"}`, "system");
  if (state.scanChannels.length) writeLine(`Каналы: ${state.scanChannels.join(", ")}`, "system");
  writeLine(`Подключение: ${state.connected ? "OK" : "нет"}`, "system");
  if (state.selectedChannel) writeLine(`Активный канал: ${state.selectedChannel}`, "system");
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
    return true;
  }

  if (lower.startsWith("cd ")) {
    let arg = cmd.slice(3).trim();
    if (arg === "~") arg = "/";
    const nextPath = resolvePath(arg);
    if (fsTree[nextPath]) {
      state.currentDir = nextPath;
      updatePrompt();
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
        writeLine(state.clientsEncryptedData, "system");
        writeLine("[ERR] clients blob encrypted :: требуется ключ дешифрования.", "error");
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
  state.clientsEncryptedData = buildEncryptedClientsData(state.clientsData);
  state.firstStageSelected = [...FIRST_STAGE_MINI];
  state.chainSig = "";
  state.chainPulse = "";
  state.chainPacket = "";
  state.chainAlign = "";
  FIRST_STAGE_MINI.forEach((mini) => {
    state.firstStageDone[mini] = false;
  });
  writeLine("=== TRANSPONDER BREACH SIM v0.2 ===", "success");
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
    if (["mini5", "ipmini1", "ipmini2", "ipmini5", "ipmini6"].includes(state.activeMini)) {
      writeLine("В этой мини-игре используй scan <target>.", "error");
      return;
    }
    if (state.scanComplete) return writeLine("Разведка уже выполнена.", "system");
    const channels = [];
    while (channels.length < 5) {
      const channel = `ch-${randomCode(2, "ABCDEFGH")}${randomCode(2, "0123456789")}`;
      if (!channels.includes(channel)) channels.push(channel);
    }
    state.scanChannels = channels;
    state.scanComplete = true;
    state.phase = Math.max(state.phase, 1);
    gain(10);
    writeLine("Сканирование завершено: обнаружены открытые каналы.", "success");
    writeLine(`Каналы: ${channels.join(", ")}`, "system");
    return;
  }

  if (lower.startsWith("scan ")) {
    const argRaw = cmd.slice(5).trim();
    const arg = argRaw.toLowerCase();
    if (state.activeMini === "mini3") {
      if (!state.mini3Packets.includes(arg)) {
        writeLine("packet-id не найден в списке mini3.", "error");
        return;
      }
      state.mini3Scanned[arg] = true;
      writeLine(`${arg} :: drift ${state.mini3Drift[arg]}%`, "system");
      return;
    }
    if (state.activeMini === "mini5") {
      const channelMatch = state.mini5Channels.find((ch) => ch.toLowerCase() === arg);
      if (!channelMatch) {
        writeLine("Канал не найден в списке mini5.", "error");
        return;
      }
      state.mini5Scanned[channelMatch] = true;
      writeLine(`${channelMatch} :: integrity ${state.mini5Integrity[channelMatch]}%`, "system");
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
    writeLine("scan <target> доступна в mini3/mini5/ipmini1/ipmini2/ipmini5/ipmini6.", "error");
    return;
  }

  if (lower === "connect" || lower.startsWith("connect ")) {
    if (!state.scanComplete) return writeLine("Сначала выполни scan.", "error");
    const channelArg = cmd.slice(7).trim();
    if (!channelArg) return writeLine("Укажи канал: connect <channel>.", "error");
    const channelMatch = state.scanChannels.find((ch) => ch.toLowerCase() === channelArg.toLowerCase());
    if (!channelMatch) return writeLine("Канал не найден в списке scan.", "error");
    if (state.connected) return writeLine("Сессия уже активна.", "system");
    state.connected = true;
    state.selectedChannel = channelMatch;
    state.phase = Math.max(state.phase, 2);
    gain(10);
    playActivity("LINK");
    writeLine(`Подключение установлено через ${channelMatch}. Активированы 5 задач: ${state.firstStageSelected.join(", ")}.`, "success");
    const firstMini = currentMiniKey(state.firstStageSelected, state.firstStageDone);
    if (firstMini) {
      setTimeout(() => {
        writeLine(`[FLOW] Автозапуск ${firstMini}...`, "system");
        startMiniByKey(firstMini);
      }, 420);
    }
    return;
  }

  if (lower.startsWith("mini")) {
    if (!state.connected) return writeLine("Нет подключения к узлу.", "error");
    if (state.activeMini) return writeLine("Текущая мини-игра уже активна. Следуй потоку.", "error");
    if (!state.firstStageSelected.includes(lower)) {
      return writeLine("Эта мини-игра не активна в текущей сессии.", "error");
    }
    if (lower === "mini1") return canStartMini("mini1") ? startMini1() : null;
    if (lower === "mini2") return canStartMini("mini2") ? startMini2() : null;
    if (lower === "mini3") return canStartMini("mini3") ? startMini3() : null;
    if (lower === "mini4") return canStartMini("mini4") ? startMini4() : null;
    if (lower === "mini5") return canStartMini("mini5") ? startMini5() : null;
  }

  if (lower.startsWith("decode ")) {
    const value = cmd.slice(7).trim().toUpperCase();
    if (!canStartMini("mini1")) return;
    if (!state.mini1Code) return writeLine("Сначала запусти mini1.", "error");
    if (value === state.mini1Code) {
      state.chainSig = value.slice(-2).toLowerCase();
      state.chainSigFull = randomCode(5, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789").toLowerCase();
      registerMiniSuccess("mini1", 20);
      writeLine("[SYNC] post-auth relay table rebuilt", "system");
      writeLine(`[SYNC] fallback token frame=${state.chainSigFull}`, "system");
      writeLine("[SYNC] token frame archived to transient cache", "system");
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
    if (!state.mini2Armed) return writeLine("Импульсы заблокированы. Нужен unlockpulse <token>.", "error");
    const value = Number(cmd.slice(6).trim());
    const expected = state.mini2Sequence[state.mini2Step];
    if (value === expected) {
      state.mini2Step += 1;
      writeLine(`[PULSE] channel-${state.mini2Step} overload detected`, "system");
      writeLine("[PULSE] timing desync injected", "system");
      if (state.mini2Step >= state.mini2Sequence.length) {
        state.chainPulse = String(state.mini2Sequence.reduce((acc, n) => acc + n, 0) % 10);
        state.mini3LeakPacket = `pkt-${state.chainPulse}${Math.floor(Math.random() * 90) + 10}`;
        writeLine("[ERR] relay-1 heartbeat lost", "error");
        writeLine("[ERR] relay-2 buffer overflow", "error");
        writeLine(`[ERR] checksum fault source=${state.mini3LeakPacket}`, "error");
        writeLine("[ERR] relay-3 emergency shutdown", "error");
        writeLine("[PULSE] full chain collapse confirmed", "success");
        registerMiniSuccess("mini2", 25);
        playMiniSuccessNoise("mini2");
        writeLine("MINI #2 пройдена.", "success");
      }
    } else {
      if (!registerMiniError("mini2")) {
        writeLine("Сбой синхронизации. Продолжай текущую мини-игру.", "error");
      }
    }
    return;
  }

  if (lower.startsWith("unlockpulse ")) {
    if (!canStartMini("mini2")) return;
    if (!state.mini2Sequence.length) return writeLine("Сначала запусти mini2.", "error");
    const token = cmd.slice(12).trim().toLowerCase();
    if (!state.chainSigFull) return writeLine("Токен недоступен. Заверши mini1.", "error");
    if (token === state.chainSigFull) {
      state.mini2Armed = true;
      writeLine("[SYNC] unlock accepted", "success");
      writeLine(`Последовательность: ${state.mini2Sequence.join(" ")}`, "system");
    } else {
      if (!registerMiniError("mini2")) writeLine("Неверный unlock token.", "error");
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
      state.chainPacket = answer.slice(-3).toLowerCase();
      const p1 = mapDigitToAH(state.chainPacket[0]);
      const p2 = mapDigitToAH(state.chainPacket[1]);
      writeLine(`[PKT] handoff->mini4 fragment: ${state.chainPacket[0]}${state.chainPacket[1]} => ${p1}${p2}`, "system");
      registerMiniSuccess("mini3", 15);
      playMiniSuccessNoise("mini3");
      writeLine("MINI #3 пройдена.", "success");
    } else {
      if (!registerMiniError("mini3")) {
        writeLine("Неверно. Продолжай текущую мини-игру.", "error");
      }
    }
    return;
  }

  if (lower.startsWith("align ")) {
    if (!canStartMini("mini4")) return;
    if (!state.mini4Word) return writeLine("Сначала запусти mini4.", "error");
    const answer = cmd.slice(6).trim().toUpperCase();
    const target = state.mini4Word;
    if (answer === target) {
      state.chainAlign = answer.slice(0, 2).toLowerCase();
      writeLine(`[RF] link ${state.chainAlign.toUpperCase()}`, "system");
      registerMiniSuccess("mini4", 15);
      playMiniSuccessNoise("mini4");
      writeLine("MINI #4 пройдена.", "success");
    } else {
      if (!registerMiniError("mini4")) {
        writeLine("Калибровка провалена. Продолжай текущую мини-игру.", "error");
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
        writeLine("Цель не найдена. Продолжай текущую мини-игру.", "error");
      }
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
    return;
  }

  if (lower.startsWith("hack ip")) {
    if (!state.transponderBreached) return writeLine("Сначала выполни breach.", "error");
    const target = cmd.slice(7).trim();
    if (!target) return writeLine("Формат: hack ip <ip>", "error");
    if (target !== state.ip) return writeLine("IP не подтвержден. Проверь адрес из транспондера.", "error");
    if (state.ipAccessGranted) return writeLine("Доступ к IP уже активен.", "system");
    state.ipAccessGranted = true;
    state.phase = Math.max(state.phase, 4);
    gain(20);
    playActivity("TUNNEL");
    writeLine(`Туннель к ${state.ip} открыт.`, "success");
    updatePrompt();
    playIpEntryScene();
    setTimeout(() => {
      writeLine("[FLOW] uplink -> ipmini1", "system");
      startMiniByKey("ipmini1");
    }, 2800);
    return;
  }

  if (lower === "ipmini1") {
    if (!state.ipAccessGranted) return writeLine("Сначала hack ip.", "error");
    if (state.activeMini) return writeLine("IP мини-игра уже активна. Следуй потоку.", "error");
    return canStartMini("ipmini1") ? startIpMini1() : null;
  }
  if (lower === "ipmini2") {
    if (!state.ipAccessGranted) return writeLine("Сначала hack ip.", "error");
    if (state.activeMini) return writeLine("IP мини-игра уже активна. Следуй потоку.", "error");
    return canStartMini("ipmini2") ? startIpMini2() : null;
  }
  if (lower === "ipmini3") {
    if (!state.ipAccessGranted) return writeLine("Сначала hack ip.", "error");
    if (state.activeMini) return writeLine("IP мини-игра уже активна. Следуй потоку.", "error");
    return canStartMini("ipmini3") ? startIpMini3() : null;
  }
  if (lower === "ipmini4") {
    if (!state.ipAccessGranted) return writeLine("Сначала hack ip.", "error");
    if (state.activeMini) return writeLine("IP мини-игра уже активна. Следуй потоку.", "error");
    return canStartMini("ipmini4") ? startIpMini4() : null;
  }
  if (lower === "ipmini5") {
    if (!state.ipAccessGranted) return writeLine("Сначала hack ip.", "error");
    if (state.activeMini) return writeLine("IP мини-игра уже активна. Следуй потоку.", "error");
    return canStartMini("ipmini5") ? startIpMini5() : null;
  }
  if (lower === "ipmini6") {
    if (!state.ipAccessGranted) return writeLine("Сначала hack ip.", "error");
    if (state.activeMini) return writeLine("IP мини-игра уже активна. Следуй потоку.", "error");
    return canStartMini("ipmini6") ? startIpMini6() : null;
  }

  if (lower.startsWith("unlock ")) {
    const val = cmd.slice(7).trim().toUpperCase();
    if (!canStartMini("ipmini1")) return;
    if (!state.ipMini1Code) return writeLine("Сначала ipmini1.", "error");
    if (val === state.ipMini1Code) {
      state.ipChainRouteSeed = state.ipMini1Code.slice(-2);
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
      const tail = Number(state.ipMini2Route.split("-").pop() || 0);
      state.ipChainClassHint = ["A", "B", "C"][tail % 3];
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
      state.ipChainDiagSeed = val.split(".").reduce((acc, seg) => acc + Number(seg), 0) % 10;
      const hintPin = Array.from({ length: 4 }, (_, idx) => String((state.ipChainDiagSeed + idx * 2) % 10)).join("");
      registerMiniSuccess("ipmini3", 20);
      playMiniSuccessNoise("ipmini3");
      writeLine(`[SUBNET] cache realign complete :: pin-fragment ${hintPin}`, "system");
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
    const pinMatch = col === ((state.ipMini4Column + row) % 4);
    writeLine(`${coord} => ${value} ${pinMatch ? "[pin-node]" : ""}`.trim(), pinMatch ? "success" : "system");
    return;
  }

  if (lower.startsWith("crack ")) {
    const val = cmd.slice(6).trim();
    if (!canStartMini("ipmini4")) return;
    if (!state.ipMini4Pin) return writeLine("Сначала ipmini4.", "error");
    if (val === state.ipMini4Pin) {
      state.ipChainSvcTag = state.ipMini4Pin.slice(-2).toLowerCase();
      registerMiniSuccess("ipmini4", 20);
      playMiniSuccessNoise("ipmini4");
      writeLine(`[ERR] acct-index drift :: expected tail **${state.ipChainSvcTag}`, "error");
      writeLine("IP MINI #4 пройдена.", "success");
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
      state.ipChainFileTag = state.ipMini5Needle.replace("svc_", "").slice(0, 2).toLowerCase();
      registerMiniSuccess("ipmini5", 20);
      playMiniSuccessNoise("ipmini5");
      writeLine(`[ERR] fs-queue mismatch :: next file tail **${state.ipChainFileTag}`, "error");
      writeLine("IP MINI #5 пройдена.", "success");
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
      writeLine("[KEY] decrypt key recovered from artifact chain.", "success");
      writeLine("[RECOVERY] clients decrypted successfully.", "success");
      writeLine("IP MINI #6 пройдена.", "success");
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
