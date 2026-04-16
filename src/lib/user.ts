import { prisma } from "./prisma";

export async function ensureUser(address: string) {
  const a = address.toLowerCase();
  return prisma.user.upsert({
    where: { address: a },
    create: { address: a, balanceWei: "0" },
    update: {},
  });
}
