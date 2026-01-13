import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const COOKIE_NAME = "restaurantcards_pin";
const COOKIE_MAX_AGE = 60 * 60 * 12; // 12h

const json = (payload: Record<string, unknown>, status: number) =>
    NextResponse.json(payload, { status });

// ===== DEBUG FLAGS =====
const DEBUG_LOG_EVERYTHING_IN_PROD = false;

function fingerprint(label: string, value: string) {
  const fp = crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
  return `${label}[len=${value.length}, sha256_12=${fp}]`;
}

// HMAC assinatura
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

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;

  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > COOKIE_MAX_AGE * 1000) return false;

  return true;
}

// Monta header Set-Cookie
function buildSetCookie(value: string) {
  const parts = [
    `${COOKIE_NAME}=${value}`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];

  // Só use Secure em HTTPS (produção)
  if (process.env.NODE_ENV === "production") parts.push("Secure");

  return parts.join("; ");
}

function buildClearCookie() {
  const parts = [
    `${COOKIE_NAME}=`,
    "Max-Age=0",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (process.env.NODE_ENV === "production") parts.push("Secure");

  return parts.join("; ");
}

export async function POST(request: Request) {
  const hash = "$2a$06$eRCKTb96P1Zq1BLyjdz6geRme1OgMnr.JrRsPKA10jnezTfWoGKbW";
  const secret = "GxQ6oQy7h8C2vYz4N4n6a9LZb2P2y9R1e5pVdHcYxM0";

  // lê PIN do body
  let pin = "";
  try {
    const body = await request.json();
    if (typeof body?.pin === "string") pin = body.pin.trim();
  } catch {
    return json({ ok: false, error: "Invalid JSON payload." }, 400);
  }

  // ===== DEBUG (somente produção) =====
  if (process.env.NODE_ENV === "production") {
    console.log("🔐 [/api/pin] PROD DEBUG BEGIN");
    console.log("PIN recebido:", pin ? `len=${pin.length}` : "(vazio)");
    console.log("PIN_HASH:", hash ? fingerprint("PIN_HASH", hash) : "(missing)");
    console.log(
        "PIN_COOKIE_SECRET:",
        secret ? fingerprint("PIN_COOKIE_SECRET", secret) : "(missing)"
    );

    if (DEBUG_LOG_EVERYTHING_IN_PROD) {
      console.log("PIN recebido (texto):", pin);
      console.log("PIN_HASH carregado (raw):", hash);
      console.log("PIN_COOKIE_SECRET (raw):", secret);
    }
    console.log("🔐 [/api/pin] PROD DEBUG END");
  }

  if (!hash) return json({ ok: false, error: "PIN_HASH not configured." }, 500);
  if (!secret || secret.length < 32) {
    return json(
        { ok: false, error: "PIN_COOKIE_SECRET missing/too short (>=32 chars)." },
        500
    );
  }

  if (!pin) return json({ ok: false, error: "PIN is required." }, 400);

  const matches = await bcrypt.compare(pin, hash);
  if (!matches) return json({ ok: false, error: "Invalid PIN." }, 401);

  // cria token e seta cookie via header
  const token = makeToken(secret);

  const res = json({ ok: true }, 200);
  res.headers.set("Set-Cookie", buildSetCookie(token));
  return res;
}

export async function GET(request: Request) {
  const secret = process.env.PIN_COOKIE_SECRET ?? "";
  if (!secret) return json({ ok: false }, 500);

  // pega cookie do header
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${COOKIE_NAME}=`))
      ?.slice(`${COOKIE_NAME}=`.length);

  if (!token) return json({ ok: false }, 401);

  const ok = verifyToken(token, secret);
  if (!ok) return json({ ok: false }, 401);

  return json({ ok: true }, 200);
}

export async function DELETE() {
  const res = json({ ok: true }, 200);
  res.headers.set("Set-Cookie", buildClearCookie());
  return res;
}
