import type { Abi } from "viem";
import monadCoinFlipAbiJson from "@/lib/abis/monadCoinFlip.json";

export const monadCoinFlipAbi = monadCoinFlipAbiJson as Abi;

export function coinflipContractAddress(): `0x${string}` | undefined {
  const raw = process.env.NEXT_PUBLIC_COINFLIP_ADDRESS;
  if (!raw || !/^0x[a-fA-F0-9]{40}$/i.test(raw)) return undefined;
  return raw as `0x${string}`;
}
