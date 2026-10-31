import { createHmac, timingSafeEqual } from "node:crypto";

export const SHARE_TTL_DAYS = 30;

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function sign(payload: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(`share:${payload}`).digest()).slice(0, 32);
}

/** Read-only share token: base64url(reportId.expiresAtSeconds).signature */
export function createShareToken(reportId: string, secret: string, now = Date.now()): { token: string; expiresAt: Date } {
  const exp = Math.floor(now / 1000) + SHARE_TTL_DAYS * 86_400;
  const payload = `${reportId}.${exp}`;
  return { token: `${b64url(Buffer.from(payload))}.${sign(payload, secret)}`, expiresAt: new Date(exp * 1000) };
}

export function verifyShareToken(token: string, secret: string, now = Date.now()): string | null {
  const [p, sig] = token.split(".");
  if (!p || !sig) return null;
  let payload: string;
  try {
    payload = Buffer.from(p, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = sign(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [id, expStr] = payload.split(".");
  const exp = Number(expStr);
  if (!id || !/^[0-9a-f-]{36}$/i.test(id) || !Number.isFinite(exp) || exp * 1000 < now) return null;
  return id;
}
