import { NextResponse } from "next/server";
import { cookies } from "next/headers";
 
const COOKIE_NAME = "woz_auth";
 
export async function POST() {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/"
  });
 
  return NextResponse.json({ ok: true });
}