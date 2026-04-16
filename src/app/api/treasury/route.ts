import { NextResponse } from "next/server";

/** Points clients at the on-chain game contract (replaces EOA treasury for custody). */
export async function GET() {
  const address = process.env.NEXT_PUBLIC_COINFLIP_ADDRESS;
  if (!address) {
    return NextResponse.json(
      { error: "Set NEXT_PUBLIC_COINFLIP_ADDRESS to the deployed MonadCoinFlip contract." },
      { status: 503 },
    );
  }
  return NextResponse.json({ address });
}
