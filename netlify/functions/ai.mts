import Anthropic from "@anthropic-ai/sdk";
import { photos, session, json, deny } from "../lib/core.mjs";

const MODEL = () => Netlify.env.get("AI_MODEL") || "claude-sonnet-5-5";

function parseJSON(text: string) {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b < 0) throw new Error("No JSON in reply");
  return JSON.parse(text.slice(a, b + 1));
}

export default async (req: Request) => {
  const s = session(req);
  if (!s) return deny();
  if (s.role !== "editor") return deny("Only editors can use AI fill-in.", 403);
  if (!process.env.ANTHROPIC_BASE_URL && !process.env.ANTHROPIC_API_KEY)
    return json({ error: "AI isn't switched on for this site yet." }, 503);
  const body = await req.json().catch(() => ({}));
  const client = new Anthropic();

  try {
    if (body.mode === "project") {
      const prompt = `You turn a quick spoken or typed note about a house repair into structured fields for a rental-house repair tracker in Napa, CA.
Note: """${String(body.text || "").slice(0, 4000)}"""
Known locations already used in this house (reuse the same wording when it matches): ${JSON.stringify((body.locations || []).slice(0, 80))}
Return ONLY a JSON object with these keys:
"location": short place in the house (e.g. "Master bathroom", "Garage door"),
"title": one clear sentence describing the problem and the fix, written for the landlord,
"section": "Interior" or "Exterior",
"priority": 1 (urgent, as soon as possible), 2 (before rainy season) or 3 (needed, not urgent),
"hours": estimated labor hours as a number or range string like "2-3", or "" if not said,
"materials": estimated materials cost like "$50-60", or "" if not said,
"notes": any extra detail worth keeping, or "".
Only include numbers the note gives or clearly implies; leave others "".`;
      const imgs: any[] = [];
      for (const k of (body.keys || []).slice(0, 4)) {
        const got = await photos().getWithMetadata(String(k), { type: "arrayBuffer" });
        if (got) imgs.push({ type: "image", source: { type: "base64", media_type: (got.metadata as any)?.type || "image/jpeg", data: Buffer.from(got.data as ArrayBuffer).toString("base64") } });
      }
      const extra = imgs.length ? `\nPhotos of the problem are attached. Use them to identify the location and the problem when the note is short or empty. Also return "short": a 3-7 word title like "Rotten window trim, master bedroom", "why": one sentence on why it matters to the owner, and "water": true/false for water/leak/rot problems.` : "";
      const r = await client.messages.create({ model: MODEL(), max_tokens: 900,
        messages: [{ role: "user", content: [...imgs, { type: "text", text: prompt + extra }] }] });
      const text = r.content.map((c: any) => c.text || "").join("");
      return json({ fields: parseJSON(text) });
    }

    if (body.mode === "titles") {
      const items = (body.projects || []).slice(0, 60);
      const prompt = `You are writing for a property manager who must approve repairs on a rental house in Napa, CA. For each project below, write:
"short": a clear title of 3-7 words in the form "Problem, place" (e.g. "Rotten window trim, master bedroom"),
"why": one plain sentence (max 18 words) on why it matters to the owner: water damage, safety, security, or wear. No exaggeration; only what the note supports.
"water": true if the problem involves water getting in, leaks, rot, mold, caulking, flashing, gutters or roof; otherwise false.
Projects: ${JSON.stringify(items.map((p: any) => ({ id: p.id, where: p.location, note: p.title })))}
Return ONLY a JSON object {"items":[{"id":...,"short":...,"why":...,"water":true|false}]}.`;
      const r = await client.messages.create({ model: MODEL(), max_tokens: 8000, messages: [{ role: "user", content: prompt }] });
      return json({ fields: parseJSON(r.content.map((c: any) => c.text || "").join("")) });
    }

    if (body.mode === "photo") {
      const got = await photos().getWithMetadata(String(body.key || ""), { type: "arrayBuffer" });
      if (!got) return json({ error: "Photo not found" }, 404);
      const type = (got.metadata as any)?.type || "image/jpeg";
      const prompt = `This photo was taken at a rental house in Napa, CA, for one of the repair projects listed below.
Projects: ${JSON.stringify(body.projects || [])}
If the photo is a store receipt, invoice or bill (a paper or screen showing items and prices), return {"projectId":"RECEIPT","stage":"before","reason":"receipt from <store>"}.
Otherwise decide which project it belongs to and whether it shows the problem before work ("before"), work underway such as removed trim, exposed framing, tools, primer or patching ("during"), or the finished repair ("after").
Return ONLY a JSON object: {"projectId": id from the list or "" if you can't tell, "stage": "before"|"during"|"after", "reason": a few words on what you see}.`;
      const r = await client.messages.create({ model: Netlify.env.get("AI_PHOTO_MODEL") || "claude-sonnet-5-5", max_tokens: 300,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: type, data: Buffer.from(got.data as ArrayBuffer).toString("base64") } },
          { type: "text", text: prompt } ] }] });
      return json({ fields: parseJSON(r.content.map((c: any) => c.text || "").join("")) });
    }

    if (body.mode === "receipt") {
      const got = await photos().getWithMetadata(String(body.key || ""), { type: "arrayBuffer" });
      if (!got) return json({ error: "File not found" }, 404);
      const type = (got.metadata as any)?.type || "image/jpeg";
      const b64 = Buffer.from(got.data as ArrayBuffer).toString("base64");
      const block: any = type === "application/pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
        : { type: "image", source: { type: "base64", media_type: type === "image/jpg" ? "image/jpeg" : type, data: b64 } };
      const prompt = `This is a store receipt or a laborer's invoice for repairs on a rental house. Read it and split its cost across the repair projects below.
Projects: ${JSON.stringify(body.projects || [])}
Return ONLY a JSON object:
"kind": "receipt" (materials/parts purchase) or "labor" (a worker's invoice for hours),
"vendor": store or worker name,
"date": YYYY-MM-DD or "",
"total": total amount paid as a number,
"hours": total hours billed (labor only) as a number or null,
"rate": hourly rate (labor only) as a number or null,
"lines": every line item as a short string like "2x Wood filler 16oz - $24.98",
"days": for labor invoices only, one entry per dated line: {"date":"YYYY-MM-DD","desc":the worker's description,"hours":number,"projectId":best matching project id or ""},
"allocations": array of {"projectId": id from the list, "amount": dollars (receipts) or null, "hours": hours (labor) or null, "why": short reason}.
Only allocate to a project when an item clearly belongs to it. Leave anything you can't place unallocated rather than guessing.`;
      const r = await client.messages.create({ model: MODEL(), max_tokens: 2000,
        messages: [{ role: "user", content: [block, { type: "text", text: prompt }] }] });
      const text = r.content.map((c: any) => c.text || "").join("");
      return json({ fields: parseJSON(text) });
    }
    return json({ error: "Unknown mode" }, 400);
  } catch (e: any) {
    return json({ error: `AI couldn't read that: ${e?.message || e}` }, 502);
  }
};

export const config = { path: "/api/ai", method: "POST" };
