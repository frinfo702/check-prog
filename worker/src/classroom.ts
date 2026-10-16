import { DurableObject } from "cloudflare:workers";

import type { Env } from "./types";
import { seatFor } from "./seatmap";

type Kind = "question" | "check";
/** Call state per seat ("1A:l"); expiresAt is when the call is withdrawn on its own */
type Raised = Record<string, { question?: true; check?: true; expiresAt: number }>;

/** A call stays up for this long when nobody withdraws it */
const TTL_MS = 5 * 60 * 1000;

/**
 * Shared state for one classroom. Every WebSocket client gets the same seat board,
 * and a raised hand is taken down on its own once the 5 minutes are up.
 */
export class Classroom extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("websocket が必要です", { status: 426 });
    }
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    const raised = await this.raised();
    server.send(JSON.stringify({ type: "state", raised }));
    // Scheduling here also repairs seats stored before expiresAt existed
    await this.schedule(raised);
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
    if (msg.type === "raise" && msg.kind !== "question" && msg.kind !== "check")
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
      raised[seat] = {
        ...raised[seat],
        [msg.kind as Kind]: true,
        expiresAt: Date.now() + this.ttlMs(),
      };
    } else {
      // State is keyed by seat, so a withdraw clears only that seat
      delete raised[seat];
    }
    await this.ctx.storage.put("raised", raised);
    this.broadcast({ type: "state", raised });
    await this.schedule(raised);
  }

  /** Withdraws the calls whose 5 minutes are up, then waits for the next one. */
  async alarm(): Promise<void> {
    const now = Date.now();
    const raised = await this.raised();
    let changed = false;
    for (const [seat, call] of Object.entries(raised)) {
      if (call.expiresAt <= now) {
        delete raised[seat];
        changed = true;
      }
    }
    if (changed) {
      await this.ctx.storage.put("raised", raised);
      this.broadcast({ type: "state", raised });
    }
    await this.schedule(raised);
  }

  /** A single alarm, set for the earliest expiry, is enough for the whole board. */
  private async schedule(raised: Raised): Promise<void> {
    const soonest = Math.min(
      ...Object.values(raised).map((call) => call.expiresAt),
      Infinity,
    );
    if (soonest === Infinity) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(Math.max(soonest, Date.now()));
  }

  /** The 5 minutes are fixed outside the smoke test, which shortens them. */
  private ttlMs(): number {
    const override = Number(this.env.HAND_TTL_MS);
    return override > 0 ? override : TTL_MS;
  }

  private async raised(): Promise<Raised> {
    const raised = (await this.ctx.storage.get<Raised>("raised")) ?? {};
    // Seats stored before expiresAt existed count as already due, so the alarm clears them
    for (const call of Object.values(raised)) call.expiresAt ??= 0;
    return raised;
  }

  private broadcast(payload: unknown): void {
    const body = JSON.stringify(payload);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(body);
      } catch {
        // Ignore connections that are already closed
      }
    }
  }
}
