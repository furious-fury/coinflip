import { NextResponse } from "next/server";

/** Legacy server cash-out — replaced by `MonadCoinFlip.cashOut`. */
export async function POST() {
  return NextResponse.json(
    {
      error: "This endpoint is disabled. Cash out on-chain from the app.",
      code: "DEPRECATED_GAME_CASHOUT",
    },
    { status: 410 },
  );
}
