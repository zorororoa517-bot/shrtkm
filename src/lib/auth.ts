import type { AuthOptions } from "next-auth";
import TwitchProvider from "next-auth/providers/twitch";
import { prisma } from "@/lib/prisma";

/**
 * The original static site did the Twitch OAuth "implicit" flow entirely in
 * the browser (response_type=token) and even shipped the app Client Secret
 * in client-side JS to fetch a fallback app token — that secret is visible
 * to anyone who opens devtools. Here we do the standard, secure Authorization
 * Code flow: Twitch redirects to our SERVER, our server (this file) holds
 * the secret and exchanges the code for tokens. The browser never sees it.
 */

const ALWAYS_ADMIN_LOGINS = ["abdo15xx"]; // ported from the original auth.js allow-list

export const authOptions: AuthOptions = {
  providers: [
    TwitchProvider({
      clientId: process.env.TWITCH_CLIENT_ID ?? "",
      clientSecret: process.env.TWITCH_CLIENT_SECRET ?? "",
      authorization: { params: { scope: "user:read:email" } }
    })
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    /** Runs on every sign-in: upsert our own persistent User row (coins, admin flag, etc.) */
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
    signIn: "/" // no custom sign-in page needed; the "دخول بتويتش" button triggers signIn() directly
  }
};
