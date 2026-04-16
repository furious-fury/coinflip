import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "./chain";

const rpc =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://testnet-rpc.monad.xyz";

export function getPublicClient() {
  return createPublicClient({
    chain: monadTestnet,
    transport: http(rpc),
  });
}

export function getTreasuryWalletClient() {
  const pk = process.env.TREASURY_PRIVATE_KEY;
  if (!pk) throw new Error("TREASURY_PRIVATE_KEY is not set");
  const account = privateKeyToAccount(pk as `0x${string}`);
  return createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(rpc),
  });
}
