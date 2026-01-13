import { NextResponse } from "next/server";
import { cookies } from "next/headers";
 
const COOKIE_NAME = "woz_auth";
 
export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
 
  const sitePassword = process.env.SITE_PASSWORD || "";
  if (!sitePassword) {
    return NextResponse.json({ ok: false, error: "SITE_PASSWORD is not configured." }, { status: 500 });
  }
 
  if (!password || password !== sitePassword) {
    return NextResponse.json({ ok: false, error: "Incorrect password. Please try again." }, { status: 401 });
  }
 
  const twelveHours = 60 * 60 * 12;
 
  cookies().set(COOKIE_NAME, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: twelveHours,
    path: "/"
  });
 
  return NextResponse.json({ ok: true });
}