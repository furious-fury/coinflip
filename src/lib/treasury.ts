import { privateKeyToAccount } from "viem/accounts";

export function getTreasuryAddress(): `0x${string}` {
  const pk = process.env.TREASURY_PRIVATE_KEY;
  if (!pk) {
    throw new Error("TREASURY_PRIVATE_KEY is not set");
  }
  return privateKeyToAccount(pk as `0x${string}`).address;
}
