import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { checkRateLimit } from "./rate-limit";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          typeof credentials?.email !== "string" ||
          typeof credentials?.password !== "string"
        )
          return null;
        // Normalize to match register-time normalization (trim + lowercase),
        // so "Foo@Example.com" signs into "foo@example.com".
        const email = credentials.email.trim().toLowerCase();
        if (!email || !credentials.password) return null;
        // Second-layer login throttle per account. authorize() can only fail
        // as null/throw (no 429 JSON possible here) — the edge middleware
        // returns the real 429 + Retry-After for credential callbacks, so
        // this is defense in depth against per-account password spraying.
        const rl = checkRateLimit(
          `login-email:${email}`,
          10,
          15 * 60 * 1000
        );
        if (!rl.allowed)
          throw new Error("Too many login attempts. Try again later.");
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user || !user.passwordHash) return null;
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!isValid) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    ...(googleClientId && googleClientSecret
      ? [Google({ clientId: googleClientId, clientSecret: googleClientSecret })]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  // SESSION REVOCATION NOTE: `strategy: "jwt"` is stateless — there is no
  // server-side session record to revoke. Sign-out only clears the browser
  // cookie; a stolen JWT stays valid until it expires (default 30d maxAge).
  // True revocation (revoke-all-sessions, admin kick, reset-password
  // invalidation) requires EITHER database sessions (Auth.js `adapter` +
  // strategy "database", revokable via deleteSession) OR a `tokenVersion`
  // field on User, stamped into the JWT in jwt() and re-checked against the
  // DB in the session/jwt callbacks (bump on password change/reset). TODO
  // if per-session revocation becomes a requirement.
  session: { strategy: "jwt" },
});
