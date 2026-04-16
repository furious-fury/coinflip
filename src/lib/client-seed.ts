import { keccak256, stringToHex } from "viem";

/** Hash user-entered client seed for `openSession` bytes32 (deterministic, verifiable). */
export function clientSeedStringToBytes32(clientSeed: string): `0x${string}` {
  return keccak256(stringToHex(clientSeed));
}
