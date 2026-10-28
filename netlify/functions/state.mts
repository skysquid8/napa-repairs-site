import { data, session, json, deny, uid } from "../lib/core.mjs";
import { runMigrations } from "./migrate.mts";

export default async (req: Request) => {
  const s = session(req);
  if (!s) return deny();
  if (s.role === "editor") { try { await runMigrations(s); } catch (e: any) { console.log("migrations error", e?.stack || e); } }
  const store = data();
  const { blobs } = await store.list();
  const out: Record<string, any[]> = { project: [], review: [], comment: [], receipt: [] };
  let settings: any = {};
  await Promise.all(
    blobs.map(async ({ key }) => {
      const v = await store.get(key, { type: "json" });
      if (!v) return;
      if (key === "settings") { settings = v; return; }
      if (key.startsWith("migration/") || key.startsWith("settings/")) return;
      const kind = key.split("/")[0];
      if (out[kind]) out[kind].push(v);
    })
  );
  // Always keep three blank spare projects available for editors.
  if (false) {
    const spares = out.project.filter((p) => p.spare);
    console.log("state: projects", out.project.length, "spares", spares.length);
    let maxNum = Math.max(0, ...out.project.map((p) => +p.num || 0));
    for (let n = spares.length + 1; n <= 3; n++) {
      const id = uid();
      const rec = { id, num: ++maxNum, order: 100000 + maxNum, status: "queue", askApproval: false, spare: true, private: false,
        location: "Spare", section: "Interior", priority: 3, water: false, hours: "", materials: "", labor: "", notes: "", photos: [],
        short: `Spare project ${n}`, title: `Spare project ${n}: drop photos here, then tell Claude what to name it.`,
        createdAt: new Date().toISOString(), createdBy: "Claude" };
      await store.setJSON(`project/${id}`, rec);
      out.project.push(rec);
      console.log("state: created spare", rec.num);
    }
  }
  const preview = s.role === "editor" && new URL(req.url).searchParams.get("as") === "reviewer";
  if (s.role !== "editor" || preview) {
    // Private items are never sent to the reviewer.
    const hidden = new Set(out.project.filter((p) => p.private || p.spare).map((p) => p.id));
    out.project = out.project.filter((p) => !p.private && !p.spare);
    out.review = out.review.filter((r) => !hidden.has(r.id));
    out.comment = out.comment.filter((c) => !hidden.has(c.projectId));
    // Labor invoices: the manager sees hours billed at $40/hr, never the handyman's own rate or invoice.
    out.receipt = out.receipt.filter((r) => !r.private).map((r) =>
      r.kind !== "labor" ? r : (() => {
        if (Array.isArray(r.wlines) && r.wlines.length) {
          const wl = r.wlines.filter((l: any) => l.bill && +l.billHours > 0)
            .map((l: any) => ({ date: l.date, note: l.note || l.desc, billHours: +l.billHours, projectId: l.projectId || "" }));
          const h = wl.reduce((t: number, l: any) => t + l.billHours, 0);
          return { id: r.id, kind: "labor", vendor: "Labor (handyman)", date: r.date, invoiceNo: r.invoiceNo || "", rate: 40, hours: h,
            total: Math.round(h * 40 * 100) / 100, wlines: wl, allocations: r.allocations, file: null, lines: [], notes: "", private: r.private };
        }
        return { ...r, rate: 40, total: Math.round((+r.hours || 0) * 40 * 100) / 100, file: null, lines: [], notes: "" };
      })());
    out.receipt = out.receipt.map((r) => {
      const priv = (r.allocations || []).filter((a: any) => hidden.has(a.projectId));
      if (!priv.length) return r;
      const allocations = (r.allocations || []).filter((a: any) => !hidden.has(a.projectId));
      if (r.kind === "labor") {
        const ph = priv.reduce((t: number, a: any) => t + (+a.hours || 0), 0);
        const hours = Math.max(0, (+r.hours || 0) - ph);
        const total = Math.round(hours * 40 * 100) / 100;
        return { ...r, allocations, hours, total, file: null, lines: [] };
      }
      const pa = priv.reduce((t: number, a: any) => t + (+a.amount || 0), 0);
      return { ...r, allocations, total: Math.max(0, Math.round(((+r.total || 0) - pa) * 100) / 100), file: null, lines: [] };
    });
  }
  return json({ ...out, settings, me: { role: preview ? "reviewer" : s.role, name: s.name, realRole: s.role, preview } });
};

export const config = { path: "/api/state" };
