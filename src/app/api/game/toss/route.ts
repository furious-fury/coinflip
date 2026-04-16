import { NextResponse } from "next/server";

/** Legacy server toss — replaced by `MonadCoinFlip.toss`. */
export async function POST() {
  return NextResponse.json(
    {
      error: "This endpoint is disabled. Toss on-chain from the app.",
      code: "DEPRECATED_GAME_TOSS",
    },
    { status: 410 },
  );
}
