import { data, photos, session, json, deny, uid } from "../lib/core.mjs";
import { seed } from "../lib/sealed.mjs";

// One-time import of the worker's Sept 29, 2026 estimate document.
export default async (req: Request) => {
  const s = session(req);
  if (!s || s.role !== "editor") return deny("Editors only.", 403);
  const { items, images } = seed();
  const store = data();
  const { blobs } = await store.list({ prefix: "project/" });
  if (blobs.length) return json({ error: "Projects already exist, so the import was skipped." }, 409);
  const now = new Date().toISOString();
  for (const it of items as any[]) {
    const ph = [];
    for (const f of it.imgs) {
      const key = uid();
      await photos().set(key, Buffer.from((images as any)[f], "base64"), {
        metadata: { type: "image/jpeg", name: f, by: "Worker estimate doc", at: now },
      });
      ph.push({ key, stage: "before", caption: "" });
    }
    const id = uid();
    await store.setJSON(`project/${id}`, {
      id, num: it.num, location: it.location, title: it.title, section: it.section,
      priority: it.priority, hours: it.hours, materials: it.materials, labor: "", notes: "",
      status: "proposed", order: it.num, photos: ph,
      source: "Work estimates doc, Sept 29, 2026", createdAt: now, createdBy: s.name,
    });
  }
  return json({ ok: true, count: items.length });
};

export const config = { path: "/api/seed", method: "POST" };
