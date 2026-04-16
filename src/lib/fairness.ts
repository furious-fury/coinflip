import { keccak256, stringToHex } from "viem";

/**
 * Deterministic heads/tails from server seed, client seed, and toss nonce.
 * Fair split: LSB of keccak256(serverSeed:clientSeed:nonce).
 */
export function tossOutcome(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): "HEADS" | "TAILS" {
  const payload = `${serverSeed}:${clientSeed}:${nonce}`;
  const h = keccak256(stringToHex(payload));
  const bit = BigInt(h) & 1n;
  return bit === 0n ? "HEADS" : "TAILS";
}

export function outcomeHash(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): `0x${string}` {
  const payload = `${serverSeed}:${clientSeed}:${nonce}`;
  return keccak256(stringToHex(payload));
}

/** Commitment published before play: hash of the server seed string. */
export function commitServerSeed(serverSeed: string): `0x${string}` {
  return keccak256(stringToHex(serverSeed));
}
