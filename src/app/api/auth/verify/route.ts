import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { COOKIE_LOGIN_NONCE } from "@/lib/constants";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { ensureUser } from "@/lib/user";
import { z } from "zod";

const bodySchema = z.object({
  address: z.string(),
  message: z.string(),
  signature: z.string(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { address, message, signature } = parsed.data;
  const addr = address.toLowerCase();

  const jar = await cookies();
  const expectedNonce = jar.get(COOKIE_LOGIN_NONCE)?.value;
  if (!expectedNonce || !message.includes(`Nonce: ${expectedNonce}`)) {
    return NextResponse.json({ error: "Invalid or expired nonce — request a new one" }, { status: 401 });
  }

  const ok = await verifyMessage({
    address: addr as `0x${string}`,
    message,
    signature: signature as `0x${string}`,
  }).catch(() => false);

  if (!ok) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  jar.delete(COOKIE_LOGIN_NONCE);

  const user = await ensureUser(addr);
  const token = await createSessionToken({ userId: user.id, address: user.address });
  await setSessionCookie(token);

  console.log(JSON.stringify({ event: "auth_login", userId: user.id, address: user.address }));

  return NextResponse.json({ ok: true, userId: user.id, address: user.address });
}
