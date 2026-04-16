import { NextResponse } from "next/server";
import { z } from "zod";
import { isHeadsFromRawWord, onChainTossRawWord } from "@/lib/on-chain-fairness";

const bodySchema = z.object({
  prevrandaoWord: z.string().regex(/^\d+$/),
  blockNumber: z.coerce.bigint(),
  player: z.string().regex(/^0x[a-fA-F0-9]{40}$/i),
  clientSeedBytes32: z.string().regex(/^0x[a-fA-F0-9]{64}$/i),
  tossIndex: z.coerce.bigint(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { prevrandaoWord, blockNumber, player, clientSeedBytes32, tossIndex } =
    parsed.data;

  const rawWord = onChainTossRawWord(
    BigInt(prevrandaoWord),
    blockNumber,
    player as `0x${string}`,
    clientSeedBytes32 as `0x${string}`,
    tossIndex,
  );
  const heads = isHeadsFromRawWord(rawWord);
  return NextResponse.json({
    rawWord,
    heads,
    outcome: heads ? "HEADS" : "TAILS",
  });
}
