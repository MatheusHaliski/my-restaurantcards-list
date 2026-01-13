import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "restaurantcards_pin";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/restaurantcardspage")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/restaurantinfopage")) {
    const hasCookie = request.cookies.get(COOKIE_NAME)?.value;
    if (!hasCookie) {
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
