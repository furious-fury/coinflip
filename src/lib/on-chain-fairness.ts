import { encodePacked, keccak256, type Address, type Hex } from "viem";

/** Matches `MonadCoinFlip.toss` entropy (must use the toss tx block’s prevrandao and block number). */
export function onChainTossRawWord(
  prevrandaoWord: bigint,
  blockNumber: bigint,
  player: Address,
  clientSeedBytes32: Hex,
  tossIndex: bigint,
): Hex {
  return keccak256(
    encodePacked(
      ["uint256", "uint256", "address", "bytes32", "uint256"],
      [prevrandaoWord, blockNumber, player, clientSeedBytes32, tossIndex],
    ),
  );
}

export function isHeadsFromRawWord(rawWord: Hex): boolean {
  return (BigInt(rawWord) & 1n) === 0n;
}
