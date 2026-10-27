import { data, photos, session, json, deny } from "../lib/core.mjs";

// Photos that were uploaded but are not attached to any project or receipt.
export default async (req: Request) => {
  const s = session(req);
  if (!s || s.role !== "editor") return deny("Editors only.", 403);
  const store = data();
  const { blobs } = await store.list();
  const used = new Set<string>();
  const dismissed: any = (await store.get("settings/dismissed", { type: "json" })) || { keys: [] };
  for (const k of dismissed.keys || []) used.add(k);
  await Promise.all(blobs.filter((b) => b.key.startsWith("project/") || b.key.startsWith("receipt/")).map(async (b) => {
    const v: any = await store.get(b.key, { type: "json" });
    for (const p of v?.photos || []) used.add(p.key);
    if (v?.file?.key) used.add(v.file.key);
  }));
  const ph = photos();
  const { blobs: all } = await ph.list();
  const out = [];
  for (const b of all) {
    if (used.has(b.key)) continue;
    const m = await ph.getMetadata(b.key);
    const meta: any = m?.metadata || {};
    if (meta.type === "application/pdf") continue;
    out.push({ key: b.key, name: meta.name || "", at: meta.at || "" });
  }
  out.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return json({ photos: out });
};

export const config = { path: "/api/orphans" };
