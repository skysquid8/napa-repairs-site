import { data, photos, session, json, deny, uid } from "../lib/core.mjs";
import { invoice } from "../lib/sealed.mjs";

// One-time additions, applied once each when an editor opens the site.
const MIGRATIONS: { id: string; projects?: any[]; ops?: any[]; receipts?: any[]; scrubName?: boolean }[] = [
  {
    id: "2026-10-27-new-projects",
    projects: [
      { location: "Roofline, around the house", section: "Exterior", priority: 1, water: true,
        short: "Rotted fascia boards, roofline",
        title: "Replace the rotted fascia boards (the trim boards along the top edge of the house where the gutters attach), plus any rotted soffit underneath. Prime, paint and re-hang gutters.",
        why: "Rotted fascia lets rain into the roof edge and walls and can pull the gutters loose.",
        notes: "Covers the full roofline. Related smaller items: #22, #29, #36, #41." },
      { location: "Driveway", section: "Exterior", priority: 2, water: true,
        short: "Cracks in asphalt driveway",
        title: "Clean out and fill the cracks in the asphalt driveway, then seal.",
        why: "Water in the cracks freezes and washes out the base, so the cracks spread each winter." },
      { location: "Laundry", section: "Interior", priority: 1, water: false,
        short: "Washing machine drain pump",
        title: "Replace the drain pump in the washing machine.",
        why: "The washer can't drain without it, and a failing pump can leak onto the floor." },
    ],
  },
  {
    id: "2026-10-27-woodpecker",
    projects: [
      { location: "Exterior siding", section: "Exterior", priority: 2, water: true,
        short: "Woodpecker holes, siding",
        title: "Patch the woodpecker holes in the exterior wood and put up flashing to cover and protect the damaged areas.",
        why: "Open holes let rain into the wall and invite more woodpecker and insect damage." },
    ],
  },
  {
    id: "2026-10-27-timothy-walkthrough",
    projects: [
      { location: "Patios", section: "Exterior", priority: 3, water: false,
        short: "Cracks in patio concrete",
        title: "Repair cracks in the concrete patios caused by the shifting foundation.",
        why: "Cracks widen over time and become trip hazards." },
    ],
    ops: [
      { num: 1, patch: { priority: 3, water: false, why: "Damage is from previous water intrusion; this does not need to be done before the rain." } },
      { num: 2, patch: { priority: 2, why: "Leak comes from the roof edge; it should be resolved by the fascia repair out front (#47)." } },
      { num: 3, patch: { short: "Possible GFI replacement, master bath", title: "Electrical connection inside the master bathroom. Likely needs a GFI outlet replacement.", why: "" } },
      { num: 4, patch: { priority: 3, water: false, why: "Pre-existing crack caused by the house foundation shifting." } },
      { num: 5, patch: { priority: 3, why: "From previous water damage caused by the rotted fascia." } },
      { num: 7, patch: { short: "Rotted wood under toilets", title: "Wood underneath the toilet is rotten. New toilets need to be put in, and possibly new floor tiling.", why: "Rotted subfloor under a toilet can fail and cause leaks into the floor.", water: true } },
      { num: 8, patch: { location: "Front door", short: "Door sweep, front door", title: "Front door: water comes in underneath when it rains. Install a door sweep.", water: true, why: "Keeps rain from running under the door onto the floor." } },
      { num: 9, patch: { priority: 2 } },
      { num: 11, patch: { priority: 2 } },
      { num: 12, patch: { priority: 3, short: "Replace kitchen sink faucet", title: "Replace the kitchen sink faucet. It no longer swivels and the head is broken.", why: "" } },
      { num: 13, patch: { location: "Kitchen power", short: "Shorted wire, kitchen power", title: "Kitchen power: there is likely a shorted wire underneath the house. We created a temporary bypass so the kitchen lights work. The repair is to go under the house, trace the line to the break, and repair it.", why: "A shorted wire is a fire and shock risk; the bypass is only temporary.", water: false } },
      { num: 14, patch: { priority: 3, short: "Adjust and install door/window latches", title: "Doors and windows do not lock securely. Adjust the latches and install new latches where needed.", why: "", water: false } },
      { num: 15, patch: { priority: 3 } },
      { num: 16, patch: { short: "Patch wall crack", title: "Patch the wall crack caused by the shifting foundation.", water: false, why: "" } },
      { num: 17, delete: true },
      { num: 18, patch: { priority: 1, water: true, short: "Water intrusion, office window", title: "Ongoing water intrusion has rotted the baseboard. This has been an ongoing problem due to an incorrect repair by others. We plan to fix it by installing flashing on top to keep water from running down there.", why: "Water is still getting in and the rot will spread until the flashing is installed." } },
      { num: 19, delete: true, movePhotosTo: 44 },
      { num: 20, patch: { short: "Repair rotted corner wood", title: "Clean out the rot, screw the pieces together and repair.", water: true } },
      { num: 22, patch: { short: "Repair rotted corner fascia", title: "Clean out the rot, screw the pieces together and repair.", water: true } },
      { num: 21, patch: { short: "Rotted trim, boiler door", title: "Boiler door exterior: the door itself is not rotten, the trim around it is. Repair the trim.", water: true } },
      { num: 25, patch: { private: true } },
      { num: 27, patch: { short: "Walkway post repairs + flashing caps", title: "Each walkway support post was rotted. We burred out all the rot, treated it and filled it with filler. Next: buy and install metal flashing covers over the post repairs.", water: true, why: "Metal caps keep rain off the repaired posts so the rot does not return." } },
      { num: 28, patch: { private: true } },
      { num: 30, patch: { short: "Reseal guest room door", title: "Repair the seal around the guest room door.", water: true } },
      { num: 33, patch: { status: "in_progress", askApproval: false } },
      { num: 37, patch: { location: "Fence near fans", short: "Collapsed fence", title: "The fence has collapsed and needs to be supported.", water: false, why: "" } },
      { num: 38, patch: { private: true } },
      { num: 39, patch: { status: "done", askApproval: false } },
      { num: 40, patch: { status: "done", askApproval: false } },
      { num: 42, patch: { short: "Bent garage gutter", title: "The garage gutter is bent and needs to be straightened. Water leaks out, eating the asphalt and getting inside the garage.", water: true, why: "Water is getting into the garage and eroding the driveway asphalt." } },
      { num: 45, patch: { short: "Repaint office front", title: "Paint on the front of the office is fading and needs to be repainted.", water: false, why: "" } },
      { num: 46, patch: { priority: 3, water: false } },
    ],
  },
  {
    id: "2026-10-27-fix-7",
    ops: [
      { num: 7, patch: { short: "Rotted subfloor under toilets", title: "Wood underneath the toilet is rotten. New posts need to be put in to support the floor, and possibly new floor tiling.", why: "The rotted wood no longer supports the toilet and floor; it can give way and leak into the subfloor." } },
    ],
  },
  {
    id: "2026-10-27-dedupe-woodpecker",
    ops: [{ matchShort: "Woodpecker holes, siding", delete: true }],
  },
  {
    id: "2026-10-27-fix-20",
    ops: [{ num: 20, patch: { short: "Rotted or separated exterior corners", title: "Exterior corners are rotted or the corner boards have separated. Clean out the rot, screw the pieces together and repair." } }],
  },
  {
    id: "2026-10-27-priorities-2",
    ops: [{ num: 37, patch: { priority: 3 } }, { num: 34, patch: { priority: 3 } }, { num: 31, patch: { priority: 3 } }],
  },
  {
    id: "2026-10-27-chimney-done",
    ops: [{ num: 26, patch: { status: "done", askApproval: false } }],
  },
  {
    id: "2026-10-27-fix-22",
    ops: [{ num: 22, patch: { location: "Chimney exterior", short: "Rotted fascia, chimney exterior", title: "The fascia board at the chimney exterior is rotted. Clean out the rot, screw the pieces together and repair.", water: true } }],
  },
  {
    id: "2026-10-27-estimates-1",
    ops: [
      { num: 49, patch: { hours: "2", materials: "$100" } },
      { num: 23, patch: { hours: "1.5", materials: "$30" } },
      { num: 48, patch: { hours: "2", materials: "$50" } },
      { num: 22, movePhotosTo: 20, patch: { notes: "Needs a photo of the chimney fascia. The earlier photo showed a separated exterior corner and was moved to #20." } },
      { num: 26, patch: { hours: "4", materials: "$400" } },
      { num: 34, patch: { hours: "1-2" } },
      { num: 46, patch: { hours: "3-4" } },
      { num: 12, patch: { hours: "1-2" } },
      { num: 8, patch: { hours: "0.5", materials: "$25" } },
      { num: 30, patch: { hours: "1", materials: "$20" } },
      { num: 52, patch: { hours: "0.5", materials: "$25" } },
      { num: 16, patch: { hours: "0.5", materials: "$10" } },
    ],
  },
  {
    id: "2026-10-27-estimates-2",
    ops: [
      { num: 26, patch: { materials: "$50" } },
      { num: 27, patch: { materials: "$400", hours: "3" } },
    ],
  },
  {
    id: "2026-10-27-invoice-MG26Oct29Napa",
    receipts: [{
      kind: "labor", vendor: "Handyman", invoiceNo: "MG26Oct29Napa", date: "2026-10-19", rate: 30, pdf: "MG26Oct29Napa",
      wlines: [
        { date: "2026-09-29", desc: "Reviewed the work to be done at the Napa house and organized the details into a document.", hours: 8.5, bill: true, billHours: 8.5, num: null, note: "Inspection of the house and written repair estimates" },
        { date: "2026-10-19", desc: "Began the underlayment work; got materials, then started on the roof replacing the trim around the roof vents.", hours: 9, bill: true, billHours: 9, num: 39, note: "Roof: underlayment and replaced rotted trim around the roof vents" },
        { date: "2026-10-20", desc: "Replaced a section of siding on the wall next to the chimney (side facing your room) and the trim around the chimney roof vent.", hours: 9, bill: true, billHours: 9, num: 26, note: "Chimney: replaced rotted siding section and vent trim" },
        { date: "2026-10-21", desc: "Replaced the silicone around the roof windows, applied silicone to some windows, replaced the trim on the bathroom window in your room.", hours: 8, bill: true, billHours: 8, num: 44, note: "Re-caulked roof windows and windows; replaced bathroom window trim" },
        { date: "2026-10-23", desc: "Replaced a section of the front siding facing the vineyard, then looked inside the washing machine and the hot tub.", hours: 8.5, bill: true, billHours: 7.5, num: 29, note: "Replaced rotted front siding facing the vineyard; diagnosed washing machine" },
      ],
      notes: "The handyman's sheet showed 51 hrs ($1,530). The 10/14 day (hot tub and an errand, 8 hrs) is removed, leaving 43 hrs ($1,290) counted as spent. Line for 10/23 is dated 2024 on his sheet; entered as 2026. Hot tub check on 10/23 (1 hr) is not billed to the landlord.",
    }],
  },
  {
    id: "2026-10-27-fixes-3",
    ops: [
      { num: 23, patch: { photos: [], cover: "" } },
      { num: 22, copyPhotoFrom: 26, patch: { notes: "" } },
      { num: 27, patch: { materials: "$400" } },
      { num: 30, patch: { hours: "1", materials: "$120" } },
      { num: 48, patch: { hours: "2", materials: "$50" } },
      { num: 16, patch: { title: "Patch the wall crack caused by the shifting foundation, sand it smooth and repaint." } },
      { num: 52, patch: { hours: "0.5", materials: "$25" } },
    ],
  },
  {
    id: "2026-10-27-fix-23",
    ops: [{ num: 23, patch: { location: "Chimney exterior", short: "Rotten chimney siding", title: "The siding on the chimney is rotten and needs to be replaced.", water: true } }],
  },
  {
    id: "2026-10-27-fix-23b",
    ops: [{ num: 23, patch: { short: "Rotten chimney side siding", hours: "3", materials: "$90", status: "done", askApproval: false } }],
  },
  {
    id: "2026-10-27-no-names",
    scrubName: true,
  },
  {
    id: "2026-10-27-est-47",
    ops: [{ num: 47, patch: { hours: "12-15", materials: "$500" } }],
  },
  {
    id: "2026-10-27-est-47b",
    ops: [{ num: 47, patch: { materials: "$400-600" } }],
  },
  {
    id: "2026-10-28-spares-v2",
    projects: [1, 2, 3].map((n) => ({ location: "Spare", section: "Interior", priority: 3, water: false, spare: true, askApproval: false,
      short: `Spare project ${n}`, title: `Spare project ${n}: drop photos here, then tell Claude what to name it.`, order: 100000 + n })),
  },
  {
    id: "2026-10-28-fix-42",
    ops: [{ num: 42, patch: { short: "Roof – gutter repair" } }],
  }
];

export default async (req: Request) => {
  const s = session(req);
  if (!s || s.role !== "editor") return deny("Editors only.", 403);
  const store = data();
  const { blobs } = await store.list({ prefix: "project/" });
  if (!blobs.length) return json({ added: 0 }); // nothing imported yet; seed first
  const all: any[] = (await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })))).filter(Boolean);
  let maxNum = Math.max(0, ...all.map((p) => +p.num || 0));
  let maxOrd = Math.max(0, ...all.map((p) => +p.order || 0));
  let added = 0;
  const ran: string[] = [];
  for (const m of MIGRATIONS.filter(Boolean)) {
    const flag = `migration/${m.id}`;
    const existing = await store.get(flag, { type: "json" });
    if (existing) continue;
    console.log("migration start", m.id);
    try {
    const byNum = (n: number) => all.find((x) => +x.num === n && !x._deleted);
    for (const op of m.ops || []) {
      const cur = op.matchShort ? all.find((x) => x.short === op.matchShort && !x._deleted) : byNum(op.num);
      if (!cur) continue;
      if (op.movePhotosTo) {
        const dst = byNum(op.movePhotosTo);
        if (dst) { dst.photos = [...(dst.photos || []), ...(cur.photos || [])]; await store.setJSON(`project/${dst.id}`, dst); cur.photos = []; }
      }
      if (op.copyPhotoFrom) {
        const src = byNum(op.copyPhotoFrom);
        const ph = src && ((src.photos || []).find((x: any) => x.stage === "before") || (src.photos || [])[0]);
        if (ph) { op.patch = { ...(op.patch || {}), photos: [{ key: ph.key, stage: "before", caption: "" }], cover: ph.key }; }
      }
      if (op.delete) { await store.delete(`project/${cur.id}`); await store.delete(`review/${cur.id}`); cur._deleted = true; continue; }
      Object.assign(cur, op.patch, { updatedAt: new Date().toISOString(), updatedBy: "Claude (Timothy's edits)" });
      await store.setJSON(`project/${cur.id}`, cur);
    }
    if (m.scrubName) {
      const N = Buffer.from("TWlndWVs", "base64").toString(); const fix = (v: any): any => typeof v === "string" ? v.replace(new RegExp(N + " " + Buffer.from("R2lyb24=", "base64").toString(), "g"), "Handyman").replace(new RegExp(N + "'s", "g"), "the handyman's").replace(new RegExp(N, "g"), "the handyman").replace(/^the handyman/, "The handyman") : v;
      const { blobs: rb } = await store.list({ prefix: "receipt/" });
      for (const b of rb) { const r: any = await store.get(b.key, { type: "json" }); if (!r) continue;
        const n = { ...r, vendor: new RegExp(N, "i").test(r.vendor || "") ? "Handyman" : r.vendor, notes: fix(r.notes), file: r.file ? { ...r.file, name: fix(r.file.name) } : r.file };
        await store.setJSON(b.key, n); }
      for (const p of all) { if (p._deleted) continue; const n = { ...p, title: fix(p.title), notes: fix(p.notes), why: fix(p.why), short: fix(p.short), source: fix(p.source) };
        if (JSON.stringify(n) !== JSON.stringify(p)) await store.setJSON(`project/${p.id}`, n); }
    }
    for (const r of m.receipts || []) {
      const byN = (n: number | null) => (n == null ? null : byNum(n));
      let file = null;
      if (r.pdf === "MG26Oct29Napa") {
        const key = uid();
        await photos().set(key, Buffer.from(invoice().pdf, "base64"), { metadata: { type: "application/pdf", name: "Handyman invoice MG26Oct29Napa.pdf", by: s.name, at: new Date().toISOString() } });
        file = { key, type: "application/pdf", name: "Handyman invoice MG26Oct29Napa.pdf" };
      }
      const wlines = r.wlines.map((l: any) => ({ date: l.date, desc: l.desc, hours: l.hours, bill: l.bill, billHours: l.billHours, note: l.note, projectId: byN(l.num)?.id || "" }));
      const hours = wlines.reduce((t: number, l: any) => t + l.hours, 0);
      const alloc: Record<string, number> = {};
      for (const l of wlines) if (l.bill && l.projectId) alloc[l.projectId] = (alloc[l.projectId] || 0) + l.billHours;
      const id = uid();
      await store.setJSON(`receipt/${id}`, { id, kind: "labor", vendor: r.vendor, invoiceNo: r.invoiceNo, date: r.date, rate: r.rate, hours, total: hours * r.rate,
        wlines, allocations: Object.entries(alloc).map(([projectId, h]) => ({ projectId, hours: h, amount: null })), file, notes: r.notes, lines: [],
        createdAt: new Date().toISOString(), createdBy: "Claude" });
      added++;
    }
    for (const p of m.projects || []) {
      if (p.spare && all.some((x) => x.short === p.short && !x._deleted)) { console.log("spare exists", p.short); continue; }
      const id = uid();
      await store.setJSON(`project/${id}`, {
        id, num: ++maxNum, order: p.order ?? ++maxOrd, status: "queue", askApproval: true, hours: "", materials: "", labor: "",
        notes: "", photos: [], ...p, source: "Added Oct 26, 2026", createdAt: new Date().toISOString(), createdBy: "Claude",
      });
      added++;
    }
      await store.setJSON(flag, { at: new Date().toISOString(), by: s.name });
      ran.push(m.id);
      console.log("migration done", m.id);
    } catch (e: any) {
      console.log("migration FAILED", m.id, e?.stack || e);
    }
  }
  return json({ added, ran });
};

export const config = { path: "/api/migrate", method: "POST" };
