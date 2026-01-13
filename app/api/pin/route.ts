import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const COOKIE_NAME = "restaurantcards_pin";
const COOKIE_MAX_AGE = 60 * 60 * 12; // 12h

const json = (payload: Record<string, unknown>, status: number) =>
  NextResponse.json(payload, { status });

// HMAC assinatura para impedir cookie forjado
function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function makeToken(secret: string) {
  const issuedAt = Date.now();
  const nonce = crypto.randomBytes(16).toString("base64url");
  const payload = `${issuedAt}.${nonce}`;
  const sig = sign(payload, secret);
  return `${payload}.${sig}`;
}

function verifyToken(token: string, secret: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [issuedAtStr, nonce, sig] = parts;
  if (!issuedAtStr || !nonce || !sig) return false;

  const payload = `${issuedAtStr}.${nonce}`;
  const expected = sign(payload, secret);

  // comparação constante (evita timing attacks)
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;

  // expiração (12h)
  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > COOKIE_MAX_AGE * 1000) return false;

  return true;
}

export async function POST(request: Request) {
  const hash = process.env.PIN_HASH;
  const secret = process.env.PIN_COOKIE_SECRET;

  if (!hash) return json({ ok: false, error: "PIN_HASH not configured." }, 500);
  if (!secret || secret.length < 32)
    return json(
      { ok: false, error: "PIN_COOKIE_SECRET missing/too short (>=32 chars)." },
      500
    );

  let pin = "";
  try {
    const body = await request.json();
    if (typeof body?.pin === "string") pin = body.pin.trim();
  } catch {
    return json({ ok: false, error: "Invalid JSON payload." }, 400);
  }

  if (!pin) return json({ ok: false, error: "PIN is required." }, 400);

  const matches = await bcrypt.compare(pin, hash);
  if (!matches) return json({ ok: false, error: "Invalid PIN." }, 401);

  const token = makeToken(secret);

  const res = json({ ok: true }, 200);
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}

export async function GET(request: Request) {
  const secret = process.env.PIN_COOKIE_SECRET;
  if (!secret) return json({ ok: false }, 500);

  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1];

  if (!token) return json({ ok: false }, 401);

  const ok = verifyToken(token, secret);
  if (!ok) return json({ ok: false }, 401);

  return json({ ok: true }, 200);
}
