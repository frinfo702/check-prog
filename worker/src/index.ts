import type { Env } from "./types";
import { deskFor } from "./seatmap";

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
      const desk = await deskFor(env.SEATMAP_SECRET, body?.student_id ?? "");
      if (!desk) return Response.json({ error: "not_found" }, { status: 404 });
      return Response.json({ desk });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
