// Checks lookup, raise and withdraw sharing against a running `npm run dev`.
// Usage: node test/smoke.mjs
import { readFileSync } from "node:fs";

const base = process.env.BASE ?? "http://127.0.0.1:8787";

function assert(condition, label) {
  if (!condition) throw new Error(`NG: ${label}`);
  console.log(`ok: ${label}`);
}

const rows = readFileSync(
  new URL("../../data/student_ids_with_desk_ids.csv", import.meta.url),
  "utf8",
)
  .trim()
  .split("\n")
  .slice(1)
  .map((line) => line.split(",").map((field) => field.trim()));
const [leftId, desk] = rows[0];
const [rightId] = rows[1];

async function lookup(studentId) {
  const res = await fetch(`${base}/api/lookup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ student_id: studentId }),
  });
  return { status: res.status, body: await res.json() };
}

const left = await lookup(leftId);
assert(left.status === 200 && left.body.desk === desk && left.body.side === "l", `照合: ${desk} 左`);

const right = await lookup(rightId);
assert(right.body.desk === desk && right.body.side === "r", `同じ机の次の行は ${desk} 右`);

const missing = await lookup("1");
assert(missing.status === 404, "未登録の学籍番号は404");

function openSocket() {
  const ws = new WebSocket(`${base.replace(/^http/, "ws")}/ws`);
  const queue = [];
  let waiter = null;
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (waiter) {
      const resolve = waiter;
      waiter = null;
      resolve(msg);
    } else {
      queue.push(msg);
    }
  });
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });
  const nextState = () =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("NG: タイムアウト")), 3000);
      const done = (msg) => {
        clearTimeout(timer);
        resolve(msg);
      };
      if (queue.length) done(queue.shift());
      else waiter = done;
    });
  const send = (msg) => ws.send(JSON.stringify(msg));
  return { ws, ready, nextState, send };
}

// Two clients: this browser and another one watching the same board
const mine = openSocket();
const other = openSocket();
await Promise.all([mine.ready, other.ready]);
assert((await mine.nextState()).type === "state", "接続直後に現在の状態が届く");
await other.nextState();

const leftSeat = `${desk}:l`;
const rightSeat = `${desk}:r`;

mine.send({ type: "raise", student_id: leftId, kind: "question" });
assert((await mine.nextState()).raised[leftSeat]?.question === true, `左の席の挙手が ${desk} に反映される`);
assert((await other.nextState()).raised[leftSeat]?.question === true, "挙手が他のブラウザにも届く");

other.send({ type: "raise", student_id: rightId, kind: "check" });
assert((await other.nextState()).raised[rightSeat]?.check === true, "同じ机の右の席も別に呼べる");
assert((await mine.nextState()).raised[leftSeat]?.question === true, "右の挙手で左の席は消えない");

other.send({ type: "withdraw", student_id: rightId });
const clearedRight = await other.nextState();
assert(!(rightSeat in clearedRight.raised), "右の取り下げが反映される");
assert(leftSeat in clearedRight.raised, "右の取り下げで左の席は消えない");
await mine.nextState();

mine.send({ type: "withdraw", student_id: leftId });
const clearedLeft = await mine.nextState();
assert(!(leftSeat in clearedLeft.raised), "左の取り下げが反映される");
await other.nextState();

// 時間切れの自動取り下げ。待てるのは HAND_TTL_MS を短くした dev だけなので、長いときは飛ばす
mine.send({ type: "raise", student_id: leftId, kind: "check" });
const ticking = await mine.nextState();
const expiresAt = ticking.raised[leftSeat]?.expiresAt;
assert(typeof expiresAt === "number", "挙手に自動取り下げの期限が付く");
await other.nextState();

if (expiresAt - Date.now() > 3000) {
  console.log(
    `skip: 時間切れの自動取り下げ（期限まで約 ${Math.round((expiresAt - Date.now()) / 1000)} 秒。HAND_TTL_MS を短くした dev なら確認できる）`,
  );
  mine.send({ type: "withdraw", student_id: leftId });
}
const expired = await mine.nextState();
assert(!(leftSeat in expired.raised), "時間切れの挙手は自動的に取り下げられる");
assert(!((await other.nextState()).raised[leftSeat]), "自動取り下げが他のブラウザにも届く");

mine.ws.close();
other.ws.close();
console.log("すべて確認しました");
