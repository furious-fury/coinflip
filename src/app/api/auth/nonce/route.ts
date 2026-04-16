import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_LOGIN_NONCE } from "@/lib/constants";
import { monadTestnet } from "@/lib/chain";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
  if (!address || !address.startsWith("0x") || address.length !== 42) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const nonce = randomBytes(24).toString("hex");
  const jar = await cookies();
  jar.set(COOKIE_LOGIN_NONCE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const message = [
    "CoinFlip sign-in",
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Chain: ${monadTestnet.name}`,
    `Chain ID: ${monadTestnet.id}`,
  ].join("\n");

  return NextResponse.json({ message, nonce });
}
