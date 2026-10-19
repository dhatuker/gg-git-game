import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE, pickLang } from "./i18n/negotiate";

/** `/` → `/id` atau `/en`: cookie pilihan pemain dulu, lalu bahasa browser. */
export function proxy(request: NextRequest) {
  const lang = pickLang(request.cookies.get(LANG_COOKIE)?.value, request.headers.get("accept-language"));
  return NextResponse.redirect(new URL(`/${lang}`, request.url));
}

export const config = {
  matcher: ["/"],
};
