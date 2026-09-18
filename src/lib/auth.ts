import type { AuthOptions } from "next-auth";
import TwitchProvider from "next-auth/providers/twitch";
import { prisma } from "@/lib/prisma";

const ALWAYS_ADMIN_LOGINS = ["abdo15xx"];

export const authOptions: AuthOptions = {
  providers: [
    TwitchProvider({
      clientId: process.env.TWITCH_CLIENT_ID ?? "",
      clientSecret: process.env.TWITCH_CLIENT_SECRET ?? "",
      client: { token_endpoint_auth_method: "none" },
      authorization: { params: { scope: "user:read:email" } },
      checks: ["pkce", "state"]
    })
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, profile }) {
      const twitchProfile = profile as { preferred_username?: string; login?: string } | undefined;
      const login = (twitchProfile?.preferred_username ?? twitchProfile?.login ?? user.name ?? "")
        .toLowerCase()
        .trim();
      if (!login) return false;

      await prisma.user.upsert({
        where: { login },
        create: {
          login,
          twitchId: user.id,
          displayName: user.name ?? login,
          avatarUrl: user.image,
          email: user.email,
          isAdmin: ALWAYS_ADMIN_LOGINS.includes(login)
        },
        update: {
          twitchId: user.id,
          displayName: user.name ?? login,
          avatarUrl: user.image,
          email: user.email
        }
      });
      return true;
    },
    async jwt({ token, profile }) {
      const twitchProfile = profile as { preferred_username?: string; login?: string } | undefined;
      if (twitchProfile) {
        token.login = (twitchProfile.preferred_username ?? twitchProfile.login ?? "").toLowerCase().trim();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.login === "string") {
        session.user.login = token.login;
      }
      return session;
    }
  },
  pages: {
    signIn: "/"
  }
};
