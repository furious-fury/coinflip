import { NextResponse } from "next/server";

/** Legacy treasury-signed withdrawal — replaced by `MonadCoinFlip.withdraw`. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This endpoint is disabled. Withdraw MON from your on-chain bankroll via the contract (see app UI).",
      code: "DEPRECATED_WITHDRAW",
    },
    { status: 410 },
  );
}
