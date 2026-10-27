import type { Context } from "@netlify/functions";
import { photos, session } from "../lib/core.mjs";

export default async (req: Request, context: Context) => {
  if (!session(req)) return new Response("Sign in required", { status: 401 });
  const r = await photos().getWithMetadata(context.params.key, { type: "arrayBuffer" });
  if (!r) return new Response("Not found", { status: 404 });
  return new Response(r.data as ArrayBuffer, {
    headers: {
      "content-type": (r.metadata as any)?.type || "application/octet-stream",
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
};

export const config = { path: "/api/photo/:key" };
