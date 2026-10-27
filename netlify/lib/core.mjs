import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

export const data = () => getStore({ name: "repairs", consistency: "strong" });
export const photos = () => getStore({ name: "photos", consistency: "strong" });

const secret = () => Netlify.env.get("SESSION_SECRET") || "dev-secret";
const b64u = (s) => Buffer.from(s).toString("base64url");
const sign = (p) => crypto.createHmac("sha256", secret()).update(p).digest("base64url");

export function makeCookie(session) {
  const payload = b64u(JSON.stringify({ ...session, exp: Date.now() + 1000 * 60 * 60 * 24 * 180 }));
  const v = `${payload}.${sign(payload)}`;
  return `nhr=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 180}`;
}
export const clearCookie = "nhr=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";

export function session(req) {
  const m = (req.headers.get("cookie") || "").match(/(?:^|;\s*)nhr=([^;]+)/);
  if (!m) return null;
  const [payload, sig] = m[1].split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sig), b = Buffer.from(sign(payload));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (s.exp < Date.now()) return null;
    return s;
  } catch { return null; }
}

export const json = (body, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
export const deny = (msg = "Please sign in again.", status = 401) => json({ error: msg }, status);
export const uid = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);
export const KINDS = ["project", "review", "comment", "receipt", "settings"];
