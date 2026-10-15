import { DurableObject } from "cloudflare:workers";

import type { Env } from "./types";
import { seatFor } from "./seatmap";

type Kind = "question" | "check";
/** 席("1A:l")ごとの呼び出し状態 */
type Raised = Record<string, { question?: true; check?: true }>;

/**
 * 教室ひとつぶんの共有状態。WebSocketで繋いだ全員に同じ座席表を配る。
 */
export class Classroom extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("websocket が必要です", { status: 426 });
    }
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.send(JSON.stringify({ type: "state", raised: await this.raised() }));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    if (typeof message !== "string") return;
    let msg: { type?: string; kind?: Kind; student_id?: string };
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }
    if (msg.type !== "raise" && msg.type !== "withdraw") return;
    if (msg.kind !== undefined && msg.kind !== "question" && msg.kind !== "check")
      return;

    const seat = await seatFor(this.env.SEATMAP_SECRET, msg.student_id ?? "");
    if (!seat) {
      ws.send(
        JSON.stringify({ type: "error", message: "学籍番号が見つかりません" }),
      );
      return;
    }

    const raised = await this.raised();
    if (msg.type === "raise") {
      (raised[seat] ??= {})[msg.kind as Kind] = true;
    } else {
      // 席ごとに持っているので、取り下げはその席だけ消える
      delete raised[seat];
    }
    await this.ctx.storage.put("raised", raised);
    this.broadcast({ type: "state", raised });
  }

  private async raised(): Promise<Raised> {
    return (await this.ctx.storage.get<Raised>("raised")) ?? {};
  }

  private broadcast(payload: unknown): void {
    const body = JSON.stringify(payload);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(body);
      } catch {
        // 閉じた接続は無視する
      }
    }
  }
}
