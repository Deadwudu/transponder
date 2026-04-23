const output = document.getElementById("terminalOutput");
const form = document.getElementById("terminalForm");
const input = document.getElementById("terminalInput");
const phaseBadge = document.getElementById("phaseBadge");
const scoreBadge = document.getElementById("scoreBadge");
const promptLabel = document.getElementById("promptLabel");

const FIRST_STAGE_MINI = ["mini1", "mini2", "mini3", "mini4"];
const IP_STAGE_MINI = ["ipmini1", "ipmini2", "ipmini3", "ipmini4"];

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
  ipMini1Code: "",
  ipMini2Route: "",
  ipMini3Mask: "",
  ipMini4Pin: "",
  currentDir: "/",
  clientsData: "",
  firstStageDone: {
    mini1: false,
    mini2: false,
    mini3: false,
    mini4: false,
  },
  ipStageDone: {
    ipmini1: false,
    ipmini2: false,
    ipmini3: false,
    ipmini4: false,
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
  state.mini1Code = randomCode(5);
  writeLine("MINI #1 :: Декодер сигнатуры", "success");
  writeLine(`Введи: decode ${state.mini1Code}`, "system");
}

function startMini2() {
  state.mini2Sequence = Array.from({ length: 4 }, () => Math.floor(Math.random() * 9) + 1);
  state.mini2Step = 0;
  writeLine("MINI #2 :: Синхронизация импульсов", "success");
  writeLine(`Запомни последовательность: ${state.mini2Sequence.join(" ")}`, "system");
  writeLine("Вводи по одной цифре: pulse <digit>", "system");
}

function startMini3() {
  state.mini3Target = Math.floor(Math.random() * 40) + 60;
  writeLine("MINI #3 :: Контрольная сумма", "success");
  writeLine(`Найди остаток от деления ${state.mini3Target} на 7.`, "system");
  writeLine("Ответ: checksum <число>", "system");
}

function startMini4() {
  state.mini4Word = randomCode(4, "ABCDEFGH");
  writeLine("MINI #4 :: Калибровка антенны", "success");
  writeLine(`Разверни код задом-наперед: ${state.mini4Word}`, "system");
  writeLine("Ответ: align <перевернутый_код>", "system");
}

function startIpMini1() {
  state.ipMini1Code = randomCode(6, "0123456789ABCDEF");
  writeLine("IP MINI #1 :: HEX-шлюз", "success");
  writeLine(`Повтори ключ: unlock ${state.ipMini1Code}`, "system");
}

function startIpMini2() {
  state.ipMini2Route = `${Math.floor(Math.random() * 200) + 20}-${Math.floor(Math.random() * 200) + 20}-${Math.floor(Math.random() * 200) + 20}`;
  writeLine("IP MINI #2 :: Маршрутизатор", "success");
  writeLine(`Восстанови маршрут: route ${state.ipMini2Route}`, "system");
}

function startIpMini3() {
  const masks = ["255.255.255.0", "255.255.0.0", "255.255.248.0", "255.255.240.0"];
  state.ipMini3Mask = randomFrom(masks);
  writeLine("IP MINI #3 :: Маска подсети", "success");
  writeLine(`Подтверди маску: mask ${state.ipMini3Mask}`, "system");
}

function startIpMini4() {
  state.ipMini4Pin = randomCode(4, "0123456789");
  writeLine("IP MINI #4 :: PIN-барьер", "success");
  writeLine(`Финальный PIN: crack ${state.ipMini4Pin}`, "system");
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
  writeLine("Игровые команды: scan, connect, mini1..mini4, breach, hack ip, ipmini1..ipmini4", "system");
  writeLine("Ответы мини-игр: decode, pulse, checksum, align, unlock, route, mask, crack", "system");

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
        writeLine("Файл clients зашифрован. Пройди 4 IP мини-игры.", "error");
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
    writeLine("Подключение установлено. Требуется пройти 4 проверки.", "success");
    return;
  }

  if (lower === "mini1") return state.connected ? startMini1() : writeLine("Нет подключения к узлу.", "error");
  if (lower === "mini2") return state.connected ? startMini2() : writeLine("Нет подключения к узлу.", "error");
  if (lower === "mini3") return state.connected ? startMini3() : writeLine("Нет подключения к узлу.", "error");
  if (lower === "mini4") return state.connected ? startMini4() : writeLine("Нет подключения к узлу.", "error");

  if (lower.startsWith("decode ")) {
    const value = cmd.slice(7).trim().toUpperCase();
    if (!state.mini1Code) return writeLine("Сначала запусти mini1.", "error");
    if (value === state.mini1Code) {
      state.firstStageDone.mini1 = true;
      state.mini1Code = "";
      gain(20);
      writeLine("MINI #1 пройдена.", "success");
    } else {
      state.mini1Code = "";
      writeLine("Неверный код, запусти mini1 заново.", "error");
    }
    return;
  }

  if (lower.startsWith("pulse ")) {
    if (!state.mini2Sequence.length) return writeLine("Сначала запусти mini2.", "error");
    const value = Number(cmd.slice(6).trim());
    const expected = state.mini2Sequence[state.mini2Step];
    if (value === expected) {
      state.mini2Step += 1;
      if (state.mini2Step >= state.mini2Sequence.length) {
        state.firstStageDone.mini2 = true;
        state.mini2Sequence = [];
        state.mini2Step = 0;
        gain(25);
        writeLine("MINI #2 пройдена.", "success");
      } else {
        writeLine(`Верно. Осталось ${state.mini2Sequence.length - state.mini2Step}.`, "system");
      }
    } else {
      state.mini2Sequence = [];
      state.mini2Step = 0;
      writeLine("Сбой синхронизации, запусти mini2 снова.", "error");
    }
    return;
  }

  if (lower.startsWith("checksum ")) {
    if (!state.mini3Target) return writeLine("Сначала запусти mini3.", "error");
    const answer = Number(cmd.slice(9).trim());
    if (answer === state.mini3Target % 7) {
      state.firstStageDone.mini3 = true;
      state.mini3Target = 0;
      gain(15);
      writeLine("MINI #3 пройдена.", "success");
    } else {
      state.mini3Target = 0;
      writeLine("Неверно, перезапусти mini3.", "error");
    }
    return;
  }

  if (lower.startsWith("align ")) {
    if (!state.mini4Word) return writeLine("Сначала запусти mini4.", "error");
    const answer = cmd.slice(6).trim().toUpperCase();
    const target = state.mini4Word.split("").reverse().join("");
    if (answer === target) {
      state.firstStageDone.mini4 = true;
      state.mini4Word = "";
      gain(15);
      writeLine("MINI #4 пройдена.", "success");
    } else {
      state.mini4Word = "";
      writeLine("Калибровка провалена, запусти mini4 снова.", "error");
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
    writeLine("Сначала пройди 4 IP мини-игры: ipmini1..ipmini4", "system");
    writeLine("После этого открой файл: cd data -> cat clients", "system");
    updatePrompt();
    return;
  }

  if (lower === "ipmini1") {
    if (!state.ipAccessGranted) return writeLine("Сначала hack ip.", "error");
    return startIpMini1();
  }
  if (lower === "ipmini2") {
    if (!state.ipAccessGranted) return writeLine("Сначала hack ip.", "error");
    return startIpMini2();
  }
  if (lower === "ipmini3") {
    if (!state.ipAccessGranted) return writeLine("Сначала hack ip.", "error");
    return startIpMini3();
  }
  if (lower === "ipmini4") {
    if (!state.ipAccessGranted) return writeLine("Сначала hack ip.", "error");
    return startIpMini4();
  }

  if (lower.startsWith("unlock ")) {
    const val = cmd.slice(7).trim().toUpperCase();
    if (!state.ipMini1Code) return writeLine("Сначала ipmini1.", "error");
    if (val === state.ipMini1Code) {
      state.ipStageDone.ipmini1 = true;
      state.ipMini1Code = "";
      gain(20);
      writeLine("IP MINI #1 пройдена.", "success");
    } else {
      state.ipMini1Code = "";
      writeLine("Неверный HEX, запусти ipmini1 снова.", "error");
    }
    return;
  }

  if (lower.startsWith("route ")) {
    const val = cmd.slice(6).trim();
    if (!state.ipMini2Route) return writeLine("Сначала ipmini2.", "error");
    if (val === state.ipMini2Route) {
      state.ipStageDone.ipmini2 = true;
      state.ipMini2Route = "";
      gain(20);
      writeLine("IP MINI #2 пройдена.", "success");
    } else {
      state.ipMini2Route = "";
      writeLine("Маршрут не совпал, запусти ipmini2 снова.", "error");
    }
    return;
  }

  if (lower.startsWith("mask ")) {
    const val = cmd.slice(5).trim();
    if (!state.ipMini3Mask) return writeLine("Сначала ipmini3.", "error");
    if (val === state.ipMini3Mask) {
      state.ipStageDone.ipmini3 = true;
      state.ipMini3Mask = "";
      gain(20);
      writeLine("IP MINI #3 пройдена.", "success");
    } else {
      state.ipMini3Mask = "";
      writeLine("Маска неверна, запусти ipmini3 снова.", "error");
    }
    return;
  }

  if (lower.startsWith("crack ")) {
    const val = cmd.slice(6).trim();
    if (!state.ipMini4Pin) return writeLine("Сначала ipmini4.", "error");
    if (val === state.ipMini4Pin) {
      state.ipStageDone.ipmini4 = true;
      state.ipMini4Pin = "";
      gain(20);
      writeLine("IP MINI #4 пройдена.", "success");
      if (canFinishIp()) {
        writeLine("Все IP мини-игры завершены. Теперь доступен файл clients.", "success");
      }
    } else {
      state.ipMini4Pin = "";
      writeLine("PIN отклонен, запусти ipmini4 снова.", "error");
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
