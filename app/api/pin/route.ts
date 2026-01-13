import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

const COOKIE_NAME = "restaurantcards_pin";

const buildResponse = (payload: Record<string, unknown>, status: number) =>
  NextResponse.json(payload, { status });

export async function POST(request: Request) {
  const hash = process.env.PIN_HASH;
  if (!hash) {
    return buildResponse(
      { ok: false, error: "PIN hash is not configured on the server." },
      500
    );
  }

  let pin = "";
  try {
    const body = await request.json();
    if (typeof body?.pin === "string") {
      pin = body.pin.trim();
    }
  } catch (error) {
    return buildResponse({ ok: false, error: "Invalid JSON payload." }, 400);
  }

  if (!pin) {
    return buildResponse({ ok: false, error: "PIN is required." }, 400);
  }

  const matches = await bcrypt.compare(pin, hash);
  if (!matches) {
    return buildResponse({ ok: false, error: "Invalid PIN." }, 401);
  }

  const response = buildResponse({ ok: true }, 200);
  response.cookies.set({
    name: COOKIE_NAME,
    value: "verified",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
    path: "/",
  });

  return response;
}

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const hasCookie = cookieHeader
    .split(";")
    .some((cookie) => cookie.trim().startsWith(`${COOKIE_NAME}=`));

  if (!hasCookie) {
    return buildResponse({ ok: false }, 401);
  }

  return buildResponse({ ok: true }, 200);
}
