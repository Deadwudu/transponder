const output = document.getElementById("terminalOutput");
const form = document.getElementById("terminalForm");
const input = document.getElementById("terminalInput");
const phaseBadge = document.getElementById("phaseBadge");
const scoreBadge = document.getElementById("scoreBadge");
const promptLabel = document.getElementById("promptLabel");

const FIRST_STAGE_MINI = ["mini1", "mini2", "mini3", "mini4", "mini5", "mini6"];
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
  mini1Code: "",
  mini2Sequence: [],
  mini2Step: 0,
  mini3Target: 0,
  mini4Word: "",
  mini5Needle: "",
  mini6Needle: "",
  ipMini1Code: "",
  ipMini2Route: "",
  ipMini3Mask: "",
  ipMini4Pin: "",
  ipMini5Needle: "",
  ipMini6Needle: "",
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
  if (miniKey === "mini3") state.mini3Target = 0;
  if (miniKey === "mini4") state.mini4Word = "";
  if (miniKey === "mini5") state.mini5Needle = "";
  if (miniKey === "mini6") state.mini6Needle = "";
  if (miniKey === "ipmini1") state.ipMini1Code = "";
  if (miniKey === "ipmini2") state.ipMini2Route = "";
  if (miniKey === "ipmini3") state.ipMini3Mask = "";
  if (miniKey === "ipmini4") state.ipMini4Pin = "";
  if (miniKey === "ipmini5") state.ipMini5Needle = "";
  if (miniKey === "ipmini6") state.ipMini6Needle = "";
}

function miniStageMeta(miniKey) {
  if (FIRST_STAGE_MINI.includes(miniKey)) {
    return { list: FIRST_STAGE_MINI, done: state.firstStageDone, stageName: "этап 1" };
  }
  return { list: IP_STAGE_MINI, done: state.ipStageDone, stageName: "IP этап" };
}

function registerMiniSuccess(miniKey, points) {
  const meta = miniStageMeta(miniKey);
  meta.done[miniKey] = true;
  state.errorCounts[miniKey] = 0;
  state.activeMini = "";
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
  state.mini1Code = randomCode(5);
  writeLine("MINI #1 :: Декодер сигнатуры", "success");
  writeLine(`Сигнатура перехвачена: ${state.mini1Code}`, "system");
}

function startMini2() {
  state.activeMini = "mini2";
  state.mini2Sequence = Array.from({ length: 4 }, () => Math.floor(Math.random() * 9) + 1);
  state.mini2Step = 0;
  writeLine("MINI #2 :: Синхронизация импульсов", "success");
  writeLine(`Последовательность: ${state.mini2Sequence.join(" ")}`, "system");
}

function startMini3() {
  state.activeMini = "mini3";
  state.mini3Target = Math.floor(Math.random() * 40) + 60;
  writeLine("MINI #3 :: Контрольная сумма", "success");
  writeLine(`Найди остаток от деления ${state.mini3Target} на 7.`, "system");
}

function startMini4() {
  state.activeMini = "mini4";
  state.mini4Word = randomCode(4, "ABCDEFGH");
  writeLine("MINI #4 :: Калибровка антенны", "success");
  writeLine(`Разверни код задом-наперед: ${state.mini4Word}`, "system");
}

function startMini5() {
  state.activeMini = "mini5";
  const channels = [
    `rf-${randomCode(3, "0123456789")}`,
    `rf-${randomCode(3, "0123456789")}`,
    `rf-${randomCode(3, "0123456789")}`,
    `rf-${randomCode(3, "0123456789")}`,
    `rf-${randomCode(3, "0123456789")}`,
    `rf-${randomCode(3, "0123456789")}`,
  ];
  state.mini5Needle = randomFrom(channels);
  writeLine("MINI #5 :: Поиск уязвимого канала", "success");
  writeLine(`Список каналов: ${channels.join(", ")}`, "system");
  writeLine(`Цель: ${state.mini5Needle}`, "system");
}

function startMini6() {
  state.activeMini = "mini6";
  const sectors = [
    `sector-${randomCode(2, "ABCDEFGH")}`,
    `sector-${randomCode(2, "ABCDEFGH")}`,
    `sector-${randomCode(2, "ABCDEFGH")}`,
    `sector-${randomCode(2, "ABCDEFGH")}`,
    `sector-${randomCode(2, "ABCDEFGH")}`,
    `sector-${randomCode(2, "ABCDEFGH")}`,
    `sector-${randomCode(2, "ABCDEFGH")}`,
  ];
  state.mini6Needle = randomFrom(sectors);
  writeLine("MINI #6 :: Поиск сектора отражения", "success");
  writeLine(`Карта секторов: ${sectors.join(" | ")}`, "system");
  writeLine(`Цель: ${state.mini6Needle}`, "system");
}

function startIpMini1() {
  state.activeMini = "ipmini1";
  state.ipMini1Code = randomCode(6, "0123456789ABCDEF");
  writeLine("IP MINI #1 :: HEX-шлюз", "success");
  writeLine(`Ключ шлюза: ${state.ipMini1Code}`, "system");
}

function startIpMini2() {
  state.activeMini = "ipmini2";
  state.ipMini2Route = `${Math.floor(Math.random() * 200) + 20}-${Math.floor(Math.random() * 200) + 20}-${Math.floor(Math.random() * 200) + 20}`;
  writeLine("IP MINI #2 :: Маршрутизатор", "success");
  writeLine(`Маршрут найден: ${state.ipMini2Route}`, "system");
}

function startIpMini3() {
  state.activeMini = "ipmini3";
  const masks = ["255.255.255.0", "255.255.0.0", "255.255.248.0", "255.255.240.0"];
  state.ipMini3Mask = randomFrom(masks);
  writeLine("IP MINI #3 :: Маска подсети", "success");
  writeLine(`Активная маска: ${state.ipMini3Mask}`, "system");
}

function startIpMini4() {
  state.activeMini = "ipmini4";
  state.ipMini4Pin = randomCode(4, "0123456789");
  writeLine("IP MINI #4 :: PIN-барьер", "success");
  writeLine(`Получен PIN: ${state.ipMini4Pin}`, "system");
}

function startIpMini5() {
  state.activeMini = "ipmini5";
  const users = [
    `svc_${randomCode(4, "abcdefghijklmnopqrstuvwxyz")}`,
    `svc_${randomCode(4, "abcdefghijklmnopqrstuvwxyz")}`,
    `svc_${randomCode(4, "abcdefghijklmnopqrstuvwxyz")}`,
    `svc_${randomCode(4, "abcdefghijklmnopqrstuvwxyz")}`,
    `svc_${randomCode(4, "abcdefghijklmnopqrstuvwxyz")}`,
    `svc_${randomCode(4, "abcdefghijklmnopqrstuvwxyz")}`,
    `svc_${randomCode(4, "abcdefghijklmnopqrstuvwxyz")}`,
  ];
  state.ipMini5Needle = randomFrom(users);
  writeLine("IP MINI #5 :: Поиск сервисного аккаунта", "success");
  writeLine(`Список аккаунтов: ${users.join(", ")}`, "system");
  writeLine(`Цель: ${state.ipMini5Needle}`, "system");
}

function startIpMini6() {
  state.activeMini = "ipmini6";
  const files = [
    `cache_${randomCode(3, "0123456789")}.bin`,
    `dump_${randomCode(3, "0123456789")}.tmp`,
    `core_${randomCode(3, "0123456789")}.log`,
    `mirror_${randomCode(3, "0123456789")}.key`,
    `node_${randomCode(3, "0123456789")}.map`,
    `seed_${randomCode(3, "0123456789")}.dat`,
    `frag_${randomCode(3, "0123456789")}.pkg`,
  ];
  state.ipMini6Needle = randomFrom(files);
  writeLine("IP MINI #6 :: Поиск целевого артефакта", "success");
  writeLine(`Список файлов: ${files.join(" ; ")}`, "system");
  writeLine(`Цель: ${state.ipMini6Needle}`, "system");
}

function canBreachTransponder() {
  return state.scanComplete && state.connected && allDone(state.firstStageDone);
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
  writeLine("Игровые команды: scan, connect, mini1..mini6, breach, hack ip, ipmini1..ipmini6", "system");
  writeLine("Ответы мини-игр: decode, pulse, checksum, align, findch, findsector, unlock, route, mask, crack, finduser, findfile", "system");
  writeLine("Правило: мини-игры идут строго по порядку. 5 ошибок в одной мини-игре = откат на предыдущую.", "system");

  if (!state.scanComplete) {
    writeLine("Что делать сейчас: запусти scan", "success");
    return;
  }
  if (!state.connected) {
    writeLine("Что делать сейчас: выполни connect", "success");
    return;
  }
  if (!allDone(state.firstStageDone)) {
    const remaining = FIRST_STAGE_MINI.filter((k) => !state.firstStageDone[k]).join(", ");
    writeLine(`Что делать сейчас: пройти мини-игры этапа 1 (${remaining})`, "success");
    writeLine("Формат этапа 1: decode <code>, pulse <digit>, checksum <num>, align <word>, findch <value>, findsector <value>", "system");
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
    writeLine("Формат IP этапа: unlock <hex>, route <route>, mask <mask>, crack <pin>, finduser <name>, findfile <name>", "system");
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
  FIRST_STAGE_MINI.forEach((key, idx) => {
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
    if (state.scanComplete) return writeLine("Разведка уже выполнена.", "system");
    state.scanComplete = true;
    state.phase = Math.max(state.phase, 1);
    gain(10);
    writeLine("Сканирование завершено: обнаружены открытые каналы.", "success");
    return;
  }

  if (lower === "connect") {
    if (!state.scanComplete) return writeLine("Сначала выполни scan.", "error");
    if (state.connected) return writeLine("Сессия уже активна.", "system");
    state.connected = true;
    state.phase = Math.max(state.phase, 2);
    gain(10);
    writeLine("Подключение установлено. Требуется пройти 6 проверок по порядку.", "success");
    return;
  }

  if (lower === "mini1") return state.connected ? (canStartMini("mini1") ? startMini1() : null) : writeLine("Нет подключения к узлу.", "error");
  if (lower === "mini2") return state.connected ? (canStartMini("mini2") ? startMini2() : null) : writeLine("Нет подключения к узлу.", "error");
  if (lower === "mini3") return state.connected ? (canStartMini("mini3") ? startMini3() : null) : writeLine("Нет подключения к узлу.", "error");
  if (lower === "mini4") return state.connected ? (canStartMini("mini4") ? startMini4() : null) : writeLine("Нет подключения к узлу.", "error");
  if (lower === "mini5") return state.connected ? (canStartMini("mini5") ? startMini5() : null) : writeLine("Нет подключения к узлу.", "error");
  if (lower === "mini6") return state.connected ? (canStartMini("mini6") ? startMini6() : null) : writeLine("Нет подключения к узлу.", "error");

  if (lower.startsWith("decode ")) {
    const value = cmd.slice(7).trim().toUpperCase();
    if (!canStartMini("mini1")) return;
    if (!state.mini1Code) return writeLine("Сначала запусти mini1.", "error");
    if (value === state.mini1Code) {
      registerMiniSuccess("mini1", 20);
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
      if (state.mini2Step >= state.mini2Sequence.length) {
        registerMiniSuccess("mini2", 25);
        writeLine("MINI #2 пройдена.", "success");
      } else {
        writeLine(`Верно. Осталось ${state.mini2Sequence.length - state.mini2Step}.`, "system");
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
    if (!state.mini3Target) return writeLine("Сначала запусти mini3.", "error");
    const answer = Number(cmd.slice(9).trim());
    if (answer === state.mini3Target % 7) {
      registerMiniSuccess("mini3", 15);
      writeLine("MINI #3 пройдена.", "success");
    } else {
      if (!registerMiniError("mini3")) {
        state.mini3Target = 0;
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
    const val = cmd.slice(7).trim();
    if (!state.mini5Needle) return writeLine("Сначала запусти mini5.", "error");
    if (val === state.mini5Needle) {
      registerMiniSuccess("mini5", 20);
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
    const val = cmd.slice(11).trim();
    if (!state.mini6Needle) return writeLine("Сначала запусти mini6.", "error");
    if (val === state.mini6Needle) {
      registerMiniSuccess("mini6", 20);
      writeLine("MINI #6 пройдена.", "success");
    } else {
      if (!registerMiniError("mini6")) {
        state.mini6Needle = "";
        writeLine("Сектор не найден, запусти mini6 снова.", "error");
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
      writeLine("IP MINI #1 пройдена.", "success");
    } else {
      if (!registerMiniError("ipmini1")) {
        state.ipMini1Code = "";
        writeLine("Неверный HEX, запусти ipmini1 снова.", "error");
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
      writeLine("IP MINI #2 пройдена.", "success");
    } else {
      if (!registerMiniError("ipmini2")) {
        state.ipMini2Route = "";
        writeLine("Маршрут не совпал, запусти ipmini2 снова.", "error");
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
      writeLine("IP MINI #3 пройдена.", "success");
    } else {
      if (!registerMiniError("ipmini3")) {
        state.ipMini3Mask = "";
        writeLine("Маска неверна, запусти ipmini3 снова.", "error");
      }
    }
    return;
  }

  if (lower.startsWith("crack ")) {
    const val = cmd.slice(6).trim();
    if (!canStartMini("ipmini4")) return;
    if (!state.ipMini4Pin) return writeLine("Сначала ipmini4.", "error");
    if (val === state.ipMini4Pin) {
      registerMiniSuccess("ipmini4", 20);
      writeLine("IP MINI #4 пройдена.", "success");
      if (canFinishIp()) {
        writeLine("Все IP мини-игры завершены. Теперь доступен файл clients.", "success");
      }
    } else {
      if (!registerMiniError("ipmini4")) {
        state.ipMini4Pin = "";
        writeLine("PIN отклонен, запусти ipmini4 снова.", "error");
      }
    }
    return;
  }

  if (lower.startsWith("finduser ")) {
    const val = cmd.slice(9).trim();
    if (!canStartMini("ipmini5")) return;
    if (!state.ipMini5Needle) return writeLine("Сначала ipmini5.", "error");
    if (val === state.ipMini5Needle) {
      registerMiniSuccess("ipmini5", 20);
      writeLine("IP MINI #5 пройдена.", "success");
      if (canFinishIp()) {
        writeLine("Все IP мини-игры завершены. Теперь доступен файл clients.", "success");
      }
    } else {
      if (!registerMiniError("ipmini5")) {
        state.ipMini5Needle = "";
        writeLine("Аккаунт не найден, запусти ipmini5 снова.", "error");
      }
    }
    return;
  }

  if (lower.startsWith("findfile ")) {
    const val = cmd.slice(9).trim();
    if (!canStartMini("ipmini6")) return;
    if (!state.ipMini6Needle) return writeLine("Сначала ipmini6.", "error");
    if (val === state.ipMini6Needle) {
      registerMiniSuccess("ipmini6", 20);
      writeLine("IP MINI #6 пройдена.", "success");
      if (canFinishIp()) {
        writeLine("Все IP мини-игры завершены. Теперь доступен файл clients.", "success");
      }
    } else {
      if (!registerMiniError("ipmini6")) {
        state.ipMini6Needle = "";
        writeLine("Файл не найден, запусти ipmini6 снова.", "error");
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
