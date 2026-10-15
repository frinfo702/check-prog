const ROWS = ["A", "B", "C", "D", "E"];
const COLS = Array.from({ length: 10 }, (_, i) => i + 1);
const STORAGE_KEY = "f1.seat.v1";

const mapEl = document.getElementById("map");
const errEl = document.getElementById("err");
const idForm = document.getElementById("idForm");
const sidInput = document.getElementById("sid");
const meEl = document.getElementById("me");
const myDeskEl = document.getElementById("myDesk");
const mySideEl = document.getElementById("mySide");
const statusEl = document.getElementById("status");

const SIDES = [
  { key: "l", className: "left" },
  { key: "r", className: "right" },
];
const SIDE_LABEL = { l: "左", r: "右" };

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
    // 机ひとつは左右2席に分かれている
    el.innerHTML = `<span class="half left" aria-hidden="true"><span class="flags"></span></span><span class="half right" aria-hidden="true"><span class="flags"></span></span><span class="name">${desk}</span>`;
    mapEl.append(el);
  }
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
      half.querySelector(".flags").textContent = state
        ? [state.question && "質問", state.check && "チェック"]
            .filter(Boolean)
            .join("\n")
        : "";
    }
  }
  const mine = raised[mySeat];
  statusEl.textContent = mine
    ? `この席は ${[mine.question && "質問", mine.check && "チェック"].filter(Boolean).join(" と ")} で呼び出し中です。`
    : "";
}

function showError(message) {
  errEl.textContent = message;
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
      showError(msg.message);
    }
  });
  ws.addEventListener("close", () => {
    ws = null;
    setTimeout(connect, 2000);
  });
}

connect();

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

/** 取り出し不可の鍵をIndexedDBに置き、暗号文だけをlocalStorageに保存する。 */
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
    // 保存に失敗しても照合と挙手には影響しない
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
  errEl.textContent = "";
  const res = await fetch("/api/lookup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ student_id: id }),
  });
  if (!res.ok) {
    showError("学籍番号が見つかりません。入力した番号を確認してください。");
    return;
  }
  const { desk, side } = await res.json();
  studentId = id;
  mySeat = `${desk}:${side}`;
  myDeskEl.textContent = desk;
  mySideEl.textContent = SIDE_LABEL[side] ?? "";
  idForm.hidden = true;
  meEl.hidden = false;
  saveId(id);
  render();
}

idForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = sidInput.value.trim();
  if (!/^\d{6,20}$/.test(value)) {
    showError("学籍番号は数字で入力してください。");
    return;
  }
  lookup(value);
});

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

/** 呼び出し中なら取り下げが反映されるのを待つ。入力し直す前に使う。 */
async function withdrawMine() {
  if (!studentId || !mySeat || !raised[mySeat]) return;
  const deadline = Date.now() + 4000;
  // 接続が切れていたら、再接続を少し待つ
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

(async () => {
  const stored = await loadId();
  if (stored) await lookup(stored);
})();
