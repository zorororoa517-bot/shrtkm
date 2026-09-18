import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.login) return null;
  return prisma.user.findUnique({ where: { login: session.user.login } });
}
