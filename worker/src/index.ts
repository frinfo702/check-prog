import type { Env } from "./types";
import { seatFor } from "./seatmap";

export { Classroom } from "./classroom";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/ws") {
      return env.CLASSROOM.getByName("main").fetch(request);
    }

    if (pathname === "/api/lookup" && request.method === "POST") {
      const body = (await request.json().catch(() => null)) as {
        student_id?: string;
      } | null;
      const seat = await seatFor(env.SEATMAP_SECRET, body?.student_id ?? "");
      if (!seat) return Response.json({ error: "not_found" }, { status: 404 });
      const [desk, side] = seat.split(":");
      return Response.json({ desk, side });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
