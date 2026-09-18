import { getCurrentUser } from "@/lib/currentUser";

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) return null;
  return user;
}
