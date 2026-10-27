import { data, photos, session, json, deny, uid } from "../lib/core.mjs";

// POST {kind, id?, data, delete?}
export default async (req: Request) => {
  const s = session(req);
  if (!s) return deny();
  const body = await req.json().catch(() => null);
  if (!body) return json({ error: "Bad request" }, 400);
  const { kind } = body;
  const editor = s.role === "editor";
  const allowed = editor ? ["project", "review", "comment", "receipt", "settings", "dismiss"] : ["review", "comment"];
  if (!allowed.includes(kind)) return deny("Your link can approve and comment, but not edit projects.", 403);
  const store = data();

  if (kind === "dismiss") {
    const cur: any = (await store.get("settings/dismissed", { type: "json" })) || { keys: [] };
    const keys = [...new Set([...(cur.keys || []), ...((body.data?.keys || []) as string[])])];
    await store.setJSON("settings/dismissed", { keys });
    return json({ ok: true });
  }

  if (kind === "settings") {
    const cur = (await store.get("settings", { type: "json" })) || {};
    const next = { ...cur, ...body.data };
    await store.setJSON("settings", next);
    return json({ ok: true, record: next });
  }

  if (kind === "review") {
    const pid = String(body.id || "");
    if (!pid) return json({ error: "Missing project" }, 400);
    const decision = body.data?.decision;
    if (!["approved", "declined", null].includes(decision)) return json({ error: "Bad decision" }, 400);
    const rec = { id: pid, decision, by: s.name, role: s.role, at: new Date().toISOString() };
    await store.setJSON(`review/${pid}`, rec);
    if (decision === "approved") {
      const proj: any = await store.get(`project/${pid}`, { type: "json" });
      if (proj && (proj.status || "proposed") === "proposed")
        await store.setJSON(`project/${pid}`, { ...proj, status: "approved", updatedAt: rec.at, updatedBy: s.name });
    }
    return json({ ok: true, record: rec });
  }

  if (kind === "comment") {
    if (body.delete) {
      const cur: any = await store.get(`comment/${body.id}`, { type: "json" });
      if (cur && (editor || cur.by === s.name)) await store.delete(`comment/${body.id}`);
      return json({ ok: true });
    }
    const text = String(body.data?.text || "").trim().slice(0, 4000);
    if (!text) return json({ error: "Comment is empty" }, 400);
    const rec = { id: uid(), projectId: String(body.data?.projectId || ""), text, by: s.name, role: s.role,
      tag: body.data?.tag || null, at: new Date().toISOString() };
    await store.setJSON(`comment/${rec.id}`, rec);
    return json({ ok: true, record: rec });
  }

  // project / receipt (editors only)
  const id = body.id || uid();
  const key = `${kind}/${id}`;
  if (body.delete) {
    const cur: any = await store.get(key, { type: "json" });
    await store.delete(key);
    const keys = [...(cur?.photos || []).map((p: any) => p.key), cur?.file?.key].filter(Boolean);
    await Promise.all(keys.map((k: string) => photos().delete(k)));
    if (kind === "project") await store.delete(`review/${id}`);
    return json({ ok: true });
  }
  const cur: any = (await store.get(key, { type: "json" })) || { id, createdAt: new Date().toISOString(), createdBy: s.name };
  const patch = body.data || {};
  delete patch.id;
  const rec = { ...cur, ...patch, id, updatedAt: new Date().toISOString(), updatedBy: s.name };
  await store.setJSON(key, rec);
  return json({ ok: true, record: rec });
};

export const config = { path: "/api/save", method: "POST" };
