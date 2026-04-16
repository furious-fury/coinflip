import { NextResponse } from "next/server";

/** Legacy EOA-treasury deposit confirmation — replaced by on-chain `MonadCoinFlip.deposit`. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This endpoint is disabled. Deposit MON by calling the CoinFlip contract (see app UI and NEXT_PUBLIC_COINFLIP_ADDRESS).",
      code: "DEPRECATED_DEPOSIT_CONFIRM",
    },
    { status: 410 },
  );
}
