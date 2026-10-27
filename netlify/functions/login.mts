import { makeCookie, clearCookie, session, json } from "../lib/core.mjs";

export default async (req: Request) => {
  if (req.method === "GET") {
    const s = session(req);
    return json({ session: s ? { role: s.role, name: s.name } : null });
  }
  if (req.method === "DELETE") return new Response(null, { status: 204, headers: { "set-cookie": clearCookie } });
  const { code, name } = await req.json().catch(() => ({}));
  const c = String(code || "").trim().toUpperCase();
  let role: string | null = null;
  if (c && c === (Netlify.env.get("EDITOR_CODE") || "").toUpperCase()) role = "editor";
  else if (c && c === (Netlify.env.get("REVIEWER_CODE") || "").toUpperCase()) role = "reviewer";
  if (!role) return json({ error: "That access code didn't match. Check the link you were sent." }, 403);
  let nm = String(name || "").trim().slice(0, 60);
  if (!nm && role === "reviewer") nm = "Property manager";
  if (!nm) return json({ error: "Enter your name so your changes are labeled.", needName: true }, 400);
  return new Response(JSON.stringify({ session: { role, name: nm } }), {
    headers: { "content-type": "application/json", "cache-control": "no-store", "set-cookie": makeCookie({ role, name: nm }) },
  });
};

export const config = { path: "/api/login" };
