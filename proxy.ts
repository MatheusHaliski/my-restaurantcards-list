import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";

const COOKIE_NAME = "restaurantcards_pin";
const COOKIE_MAX_AGE = 60 * 60 * 12;

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function verifyToken(token: string, secret: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [issuedAtStr, nonce, sig] = parts;
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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/restaurantcardspage") || pathname.startsWith("/api/pin")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/restaurantinfopage")) {
    const secret = process.env.PIN_COOKIE_SECRET;
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!secret || !token || !verifyToken(token, secret)) {
      const url = request.nextUrl.clone();
      url.pathname = "/restaurantcardspage";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/restaurantcardspage", "/restaurantinfopage/:path*"],
};
