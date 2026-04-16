import { NextResponse } from "next/server";

export async function GET() {
  const coinFlipAddress = process.env.NEXT_PUBLIC_COINFLIP_ADDRESS ?? null;
  return NextResponse.json({
    chainId: 10143,
    faucetUrl: "https://faucet.monad.xyz",
    coinFlipAddress,
  });
}
