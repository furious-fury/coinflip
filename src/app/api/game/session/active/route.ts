import { NextResponse } from "next/server";

/** Legacy DB-backed active session — game state lives on-chain. */
export async function GET() {
  return NextResponse.json(
    {
      error: "Active session is read from the MonadCoinFlip contract in the app.",
      code: "DEPRECATED_ACTIVE_SESSION",
      session: null,
    },
    { status: 410 },
  );
}
