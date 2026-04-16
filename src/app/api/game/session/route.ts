import { NextResponse } from "next/server";

/** Legacy server-side session — replaced by `MonadCoinFlip.openSession`. */
export async function POST() {
  return NextResponse.json(
    {
      error: "This endpoint is disabled. Open a session with a contract transaction from the app.",
      code: "DEPRECATED_GAME_SESSION",
    },
    { status: 410 },
  );
}
