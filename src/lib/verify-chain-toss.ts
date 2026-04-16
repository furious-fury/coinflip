import type { Address, Hex, PublicClient } from "viem";
import { decodeEventLog, isHash, numberToHex } from "viem";
import { monadCoinFlipAbi } from "@/lib/monad-coin-flip";
import { isHeadsFromRawWord, onChainTossRawWord } from "@/lib/on-chain-fairness";

export type VerifyTossChainResult = {
  match: boolean;
  player: Address;
  outcome: "HEADS" | "TAILS";
  headsFromLog: boolean;
  rawWordComputed: Hex;
  rawWordFromLog: Hex;
  tossIndex: string;
  blockNumber: string;
};

export async function verifyTossFromChain(
  client: PublicClient,
  coinflip: Address,
  sessionOpenTxHash: Hex,
  tossTxHash: Hex,
): Promise<VerifyTossChainResult> {
  if (!isHash(sessionOpenTxHash) || !isHash(tossTxHash)) {
    throw new Error("Enter full transaction hashes (0x + 64 hex).");
  }

  const [openReceipt, tossReceipt, tossTx] = await Promise.all([
    client.getTransactionReceipt({ hash: sessionOpenTxHash }),
    client.getTransactionReceipt({ hash: tossTxHash }),
    client.getTransaction({ hash: tossTxHash }),
  ]);

  if (openReceipt.status !== "success" || tossReceipt.status !== "success") {
    throw new Error("One of the transactions failed on-chain.");
  }

  const player = tossTx.from;

  let clientSeed: Hex | undefined;
  for (const log of openReceipt.logs) {
    if (log.address.toLowerCase() !== coinflip.toLowerCase()) continue;
    try {
      const d = decodeEventLog({
        abi: monadCoinFlipAbi,
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]],
      });
      if (d.eventName !== "SessionOpened") continue;
      const args = d.args as unknown as {
        player: Address;
        clientSeed: Hex;
      };
      if (args.player.toLowerCase() === player.toLowerCase()) {
        clientSeed = args.clientSeed;
        break;
      }
    } catch {
      /* not this log */
    }
  }
  if (!clientSeed) {
    throw new Error(
      "Could not find SessionOpened for this wallet in the open-session transaction, or addresses do not match the toss.",
    );
  }

  let tossIndexBn: bigint | undefined;
  let rawFromLog: Hex | undefined;
  let headsFromLog: boolean | undefined;

  for (const log of tossReceipt.logs) {
    if (log.address.toLowerCase() !== coinflip.toLowerCase()) continue;
    try {
      const d = decodeEventLog({
        abi: monadCoinFlipAbi,
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]],
      });
      if (d.eventName !== "TossResult") continue;
      const args = d.args as unknown as {
        player: Address;
        tossIndex: bigint;
        rawWord: bigint;
        heads: boolean;
      };
      if (args.player.toLowerCase() === player.toLowerCase()) {
        tossIndexBn = args.tossIndex;
        rawFromLog = numberToHex(args.rawWord, { size: 32 });
        headsFromLog = args.heads;
        break;
      }
    } catch {
      /* skip */
    }
  }

  if (tossIndexBn === undefined || rawFromLog === undefined || headsFromLog === undefined) {
    throw new Error("Could not find TossResult in the toss transaction for this wallet.");
  }

  const block = await client.getBlock({
    blockNumber: tossReceipt.blockNumber,
    includeTransactions: false,
  });
  const prevrandao = (block as { prevRandao?: bigint }).prevRandao;
  if (prevrandao === undefined || prevrandao === null) {
    throw new Error("Block has no prevrandao — cannot verify on this network.");
  }

  const bn = tossReceipt.blockNumber;
  const rawWordComputed = onChainTossRawWord(
    prevrandao,
    bn,
    player,
    clientSeed,
    tossIndexBn,
  );

  const match =
    rawWordComputed.toLowerCase() === rawFromLog.toLowerCase() &&
    isHeadsFromRawWord(rawWordComputed) === headsFromLog;

  const outcome: "HEADS" | "TAILS" = isHeadsFromRawWord(rawWordComputed) ? "HEADS" : "TAILS";

  return {
    match,
    player,
    outcome,
    headsFromLog,
    rawWordComputed,
    rawWordFromLog: rawFromLog,
    tossIndex: tossIndexBn.toString(),
    blockNumber: bn.toString(),
  };
}
