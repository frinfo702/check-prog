// 起動中の `npm run dev` に対して、照合・挙手・取り下げの共有を確認する。
// 実行例: node test/smoke.mjs
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
const [studentId, desk] = rows[0];

const lookup = await fetch(`${base}/api/lookup`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ student_id: studentId }),
});
const found = await lookup.json();
assert(lookup.status === 200 && found.desk === desk, `照合: ${desk}`);

const missing = await fetch(`${base}/api/lookup`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ student_id: "1" }),
});
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

// 自分と、同じ画面を見ている別のブラウザの2枚で確認する
const mine = openSocket();
const other = openSocket();
await Promise.all([mine.ready, other.ready]);
assert((await mine.nextState()).type === "state", "接続直後に現在の状態が届く");
await other.nextState();

mine.send({ type: "raise", student_id: studentId, kind: "question" });
assert((await mine.nextState()).raised[desk]?.question === true, `挙手が ${desk} に反映される`);
assert((await other.nextState()).raised[desk]?.question === true, "挙手が他のブラウザにも届く");

other.send({ type: "withdraw", student_id: studentId });
assert(!(desk in (await other.nextState()).raised), `取り下げが ${desk} に反映される`);
assert(!(desk in (await mine.nextState()).raised), "取り下げも他のブラウザに届く");

mine.ws.close();
other.ws.close();
console.log("すべて確認しました");
