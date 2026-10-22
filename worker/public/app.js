const ROWS = ["A", "B", "C", "D", "E"];
const COLS = Array.from({ length: 10 }, (_, i) => i + 1);
const STORAGE_KEY = "f1.seat.v1";
const LANG_KEY = "f1.lang.v1";
const LANGS = ["ja", "zh", "en"];

const I18N = {
  ja: {
    htmlTitle: "F1 チェック 呼び出し",
    "app.code": "プログラミング演習1 (F1)",
    "app.name": "チェック呼び出し",
    "header.info": "学籍番号の扱いについて",
    "header.repo": "GitHub リポジトリ",
    "lang.label": "表示言語",
    "room.window": "窓側",
    "room.corridor": "廊下側",
    "room.ta": "TA席",
    "map.label": "座席表",
    "flag.question": "質問",
    "flag.check": "チェック",
    "form.id": "学籍番号",
    "form.show": "自分の席を表示",
    "form.reset": "学籍番号を入力し直す",
    "seat.label": "あなたの席",
    "side.left": "左",
    "side.right": "右",
    "action.question": "質問で呼ぶ",
    "action.check": "チェックで呼ぶ",
    "action.withdraw": "取り下げ",
    "status.question": "質問",
    "status.check": "チェック",
    "status.join": " と ",
    "status.text":
      "この席は {kinds} で呼び出し中です。あと {time} で自動的に取り下げられます。",
    "info.title": "学籍番号の扱い",
    "info.p1":
      "学籍番号は、あなたの席を照合するためだけに使います。サーバーには保存しません。",
    "info.p2": "他の学生に、あなたの学籍番号が見えることはありません。",
    "info.p3":
      "学籍番号はMoodleから取得したもので、この授業の運営以外には使用しません。",
    "info.p4":
      "入力した学籍番号は、このブラウザの中に暗号化して保存され、次回の入力が不要になります。",
    "info.close": "閉じる",
    "error.notFound":
      "学籍番号が見つかりません。入力した番号を確認してください。",
    "error.invalid": "学籍番号は数字で入力してください。",
  },
  zh: {
    htmlTitle: "F1 检查呼叫",
    "app.code": "程序设计实践1 (F1)",
    "app.name": "检查呼叫",
    "header.info": "关于学号的使用",
    "header.repo": "GitHub 仓库",
    "lang.label": "显示语言",
    "room.window": "靠窗",
    "room.corridor": "靠走廊",
    "room.ta": "助教席",
    "map.label": "座位表",
    "flag.question": "提问",
    "flag.check": "检查",
    "form.id": "学号",
    "form.show": "显示我的座位",
    "form.reset": "重新输入学号",
    "seat.label": "你的座位",
    "side.left": "左",
    "side.right": "右",
    "action.question": "呼叫助教提问",
    "action.check": "呼叫助教检查",
    "action.withdraw": "撤销呼叫",
    "status.question": "提问",
    "status.check": "检查",
    "status.join": "和",
    "status.text": "该座位正在呼叫助教，请求{kinds}。将在{time}后自动撤销。",
    "info.title": "学号的使用",
    "info.p1": "学号仅用于查找你的座位，不会保存在服务器上。",
    "info.p2": "其他学生无法看到你的学号。",
    "info.p3": "学号来自 Moodle，仅用于本课程的运营。",
    "info.p4": "输入的学号会加密保存在此浏览器中，下次无需再次输入。",
    "info.close": "关闭",
    "error.notFound": "找不到该学号。请确认输入的号码。",
    "error.invalid": "学号请使用数字输入。",
  },
  en: {
    htmlTitle: "F1 Review Call",
    "app.code": "Programming Exercise 1 (F1)",
    "app.name": " Review Call",
    "header.info": "How your student ID is used",
    "header.repo": "GitHub repository",
    "lang.label": "Display language",
    "room.window": "Window side",
    "room.corridor": "Corridor side",
    "room.ta": "TA seats",
    "map.label": "Seat map",
    "flag.question": "Question",
    "flag.check": "Review",
    "form.id": "Student ID",
    "form.show": "Show my seat",
    "form.reset": "Enter a different student ID",
    "seat.label": "Your seat",
    "side.left": "Left",
    "side.right": "Right",
    "action.question": "Call for a question",
    "action.check": "Call for a review",
    "action.withdraw": "Withdraw",
    "status.question": "a question",
    "status.check": "a review",
    "status.join": " and ",
    "status.text":
      "This seat is calling for {kinds}. It will be withdrawn automatically in {time}.",
    "info.title": "How your student ID is used",
    "info.p1":
      "Your student ID is used only to find your seat. It is never stored on the server.",
    "info.p2": "Other students cannot see your student ID.",
    "info.p3":
      "Your student ID comes from Moodle and is used only to run this course.",
    "info.p4":
      "The ID you enter is stored encrypted in this browser, so you will not need to enter it next time.",
    "info.close": "Close",
    "error.notFound":
      "Student ID not found. Please verify the number you entered.",
    "error.invalid": "Please enter your student ID using digits.",
  },
};

const mapEl = document.getElementById("map");
const errEl = document.getElementById("err");
const idForm = document.getElementById("idForm");
const sidInput = document.getElementById("sid");
const meEl = document.getElementById("me");
const myDeskEl = document.getElementById("myDesk");
const mySideEl = document.getElementById("mySide");
const statusEl = document.getElementById("status");
const langSwitches = [...document.querySelectorAll(".lang")];
const langButtons = [...document.querySelectorAll("[data-lang]")];

const SIDES = [
  { key: "l", className: "left" },
  { key: "r", className: "right" },
];

let lang = "ja";
let errorKey = null;
let studentId = null;
let mySeat = null;
let raised = {};
let ws = null;

for (const row of ROWS) {
  for (const col of COLS) {
    const desk = `${col}${row}`;
    const el = document.createElement("div");
    el.className = "desk";
    if (col === 10) el.classList.add("ta-seat");
    el.dataset.desk = desk;
    // Each desk is split into a left and a right seat
    el.innerHTML = `<span class="half left" aria-hidden="true"><span class="remain"></span><span class="flags"></span></span><span class="half right" aria-hidden="true"><span class="remain"></span><span class="flags"></span></span><span class="name">${desk}</span>`;
    mapEl.append(el);
  }
}

/** A missing translation falls back to Japanese, which is always complete. */
function t(key) {
  return I18N[lang]?.[key] ?? I18N.ja[key] ?? key;
}

function sideLabel(side) {
  if (side === "l") return t("side.left");
  if (side === "r") return t("side.right");
  return "";
}

function storedLang() {
  try {
    return localStorage.getItem(LANG_KEY);
  } catch {
    return null;
  }
}

/** Saved choice first, then the browser's preferred language. */
function detectLang() {
  const saved = storedLang();
  if (LANGS.includes(saved)) return saved;
  for (const tag of navigator.languages ?? [navigator.language]) {
    const code = String(tag).toLowerCase();
    if (code.startsWith("zh")) return "zh";
    if (code.startsWith("ja")) return "ja";
    if (code.startsWith("en")) return "en";
  }
  return "ja";
}

/** Time left before the call is withdrawn for you, as m:ss. */
function fmtLeft(expiresAt) {
  const left = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
}

/** The clock ticks every second, so leave every unchanged node alone. */
function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}

/** Words used inside the "calling for ..." sentence, where English needs articles. */
function statusKinds(state) {
  return [
    state.question && t("status.question"),
    state.check && t("status.check"),
  ]
    .filter(Boolean)
    .join(t("status.join"));
}

function render() {
  for (const el of mapEl.children) {
    for (const { key, className } of SIDES) {
      const half = el.querySelector(`.half.${className}`);
      const seat = `${el.dataset.desk}:${key}`;
      const state = raised[seat];
      half.classList.toggle("q", Boolean(state?.question));
      half.classList.toggle("c", Boolean(state?.check));
      half.classList.toggle("mine", seat === mySeat);
      setText(
        half.querySelector(".flags"),
        state
          ? [
              state.question && t("flag.question"),
              state.check && t("flag.check"),
            ]
              .filter(Boolean)
              .join("\n")
          : "",
      );
      // Shown on the map too, so it reads before a student ID is entered
      setText(
        half.querySelector(".remain"),
        state ? fmtLeft(state.expiresAt) : "",
      );
    }
  }
  if (mySeat) {
    const [desk, side] = mySeat.split(":");
    setText(myDeskEl, desk);
    setText(mySideEl, sideLabel(side));
  }
  const mine = raised[mySeat];
  setText(
    statusEl,
    mine
      ? t("status.text")
          .replace("{kinds}", statusKinds(mine))
          .replace("{time}", fmtLeft(mine.expiresAt))
      : "",
  );
}

/** Translates the static markup; render() covers text built at runtime. */
function applyI18n() {
  document.title = t("htmlTitle");
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of document.querySelectorAll("[data-i18n-aria-label]")) {
    el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
  }
  for (const el of document.querySelectorAll("[data-i18n-title]")) {
    el.title = t(el.dataset.i18nTitle);
  }
  if (errorKey) errEl.textContent = t(errorKey);
  render();
}

function setLang(next, { persist = true, animate = true } = {}) {
  if (!LANGS.includes(next)) return;
  lang = next;
  if (persist) {
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      // Language still works for this page view without storage
    }
  }
  document.documentElement.lang = next;
  // Skip the thumb slide on the first paint, when the default was guessed
  if (!animate) {
    for (const switcher of langSwitches) {
      switcher.classList.add("no-transition");
    }
  }
  for (const switcher of langSwitches) switcher.dataset.active = next;
  for (const button of langButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.lang === next));
  }
  applyI18n();
  if (!animate) {
    void document.body.offsetWidth;
    for (const switcher of langSwitches) {
      switcher.classList.remove("no-transition");
    }
  }
}

// The server withdraws expired calls on its own; the client just ticks the clocks
setInterval(() => {
  if (Object.keys(raised).length) render();
}, 1000);

function showError(key) {
  errorKey = key;
  errEl.textContent = key ? t(key) : "";
}

function connect() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "state") {
      raised = msg.raised;
      render();
    } else if (msg.type === "error") {
      // The classroom only reports unknown student IDs over the socket
      showError("error.notFound");
    }
  });
  ws.addEventListener("close", () => {
    ws = null;
    setTimeout(connect, 2000);
  });
}

function send(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("f1", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("keys");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("keys", mode);
    const request = fn(tx.objectStore("keys"));
    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error);
  });
}

/** Keep the non-extractable key in IndexedDB and only the ciphertext in localStorage. */
async function getKey() {
  const key = await withStore("readonly", (store) => store.get("main"));
  if (key) return key;
  const created = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  await withStore("readwrite", (store) => store.put(created, "main"));
  return created;
}

const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text) =>
  Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

async function saveId(id) {
  try {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(id),
    );
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ iv: toBase64(iv), ct: toBase64(new Uint8Array(cipher)) }),
    );
  } catch {
    // Failing to save does not affect lookup or raising a hand
  }
}

async function loadId() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const { iv, ct } = JSON.parse(raw);
    const key = await getKey();
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(iv) },
      key,
      fromBase64(ct),
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

async function lookup(id) {
  showError(null);
  const res = await fetch("/api/lookup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ student_id: id }),
  });
  if (!res.ok) {
    showError("error.notFound");
    return;
  }
  const { desk, side } = await res.json();
  studentId = id;
  mySeat = `${desk}:${side}`;
  myDeskEl.textContent = desk;
  mySideEl.textContent = sideLabel(side);
  idForm.hidden = true;
  meEl.hidden = false;
  saveId(id);
  render();
}

idForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = sidInput.value.trim();
  if (!/^\d{6,20}$/.test(value)) {
    showError("error.invalid");
    return;
  }
  lookup(value);
});

for (const button of langButtons) {
  button.addEventListener("click", () => setLang(button.dataset.lang));
}

document.getElementById("raiseQuestion").addEventListener("click", () =>
  send({ type: "raise", student_id: studentId, kind: "question" }),
);
document.getElementById("raiseCheck").addEventListener("click", () =>
  send({ type: "raise", student_id: studentId, kind: "check" }),
);
document.getElementById("withdraw").addEventListener("click", () =>
  send({ type: "withdraw", student_id: studentId }),
);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Wait until a withdraw takes effect, before the user enters their ID again. */
async function withdrawMine() {
  if (!studentId || !mySeat || !raised[mySeat]) return;
  const deadline = Date.now() + 4000;
  // The socket may be reconnecting; give it a moment
  while ((!ws || ws.readyState !== WebSocket.OPEN) && Date.now() < deadline) {
    await wait(100);
  }
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  send({ type: "withdraw", student_id: studentId });
  while (raised[mySeat] && Date.now() < deadline) await wait(50);
}

document.getElementById("reset").addEventListener("click", async () => {
  await withdrawMine();
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

const dialog = document.getElementById("infoDialog");
document
  .getElementById("infoButton")
  .addEventListener("click", () => dialog.showModal());
document
  .getElementById("infoClose")
  .addEventListener("click", () => dialog.close());

setLang(detectLang(), { persist: false, animate: false });
connect();

(async () => {
  const stored = await loadId();
  if (stored) await lookup(stored);
})();
