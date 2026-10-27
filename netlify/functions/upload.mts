import { photos, session, json, deny, uid } from "../lib/core.mjs";

export default async (req: Request) => {
  const s = session(req);
  if (!s) return deny();
  if (s.role !== "editor") return deny("Only editors can upload.", 403);
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return json({ error: "No file" }, 400);
  const ok = /^(image\/(jpeg|png|webp|gif|heic|heif)|application\/pdf)$/.test(file.type);
  if (!ok) return json({ error: "Upload a photo (JPG/PNG/HEIC) or a PDF." }, 400);
  const key = uid();
  await photos().set(key, await file.arrayBuffer(), {
    metadata: { type: file.type, name: file.name.slice(0, 120), by: s.name, at: new Date().toISOString() },
  });
  return json({ key, type: file.type, name: file.name });
};

export const config = { path: "/api/upload", method: "POST" };
