import crypto from "node:crypto";
import { blob as seedBlob } from "./seed-data.enc.mjs";
import { blob as invBlob } from "./inv-mg26oct.enc.mjs";
const open = (b64) => {
  const key = Buffer.from(Netlify.env.get("SEED_KEY") || "", "hex");
  const buf = Buffer.from(b64, "base64");
  const d = crypto.createDecipheriv("aes-256-gcm", key, buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString());
};
export const seed = () => open(seedBlob);
export const invoice = () => open(invBlob);
