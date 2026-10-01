import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { claimUserCommerce } from "./claim";
import { appBaseUrl, sendPasswordReset, sendVerificationEmail } from "./email";

const secret = process.env.BETTER_AUTH_SECRET;
const baseURL = appBaseUrl();

if (!secret) {
  throw new Error("BETTER_AUTH_SECRET is required");
}

export const authRateLimit = {
  customRules: {
    "/request-password-reset": { window: 60, max: 3 },
    "/send-verification-email": { window: 60, max: 3 },
  },
} as const;

export const auth = betterAuth({
  secret,
  baseURL,
  trustedOrigins: [baseURL],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordReset(user.email, url);
    },
  },
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    customRules: authRateLimit.customRules,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
    afterEmailVerification: async (verifiedUser) => {
      await claimUserCommerce(verifiedUser.id);
    },
  },
  user: {
    additionalFields: {
      phone: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (accountUser) => {
          return {
            data: {
              ...accountUser,
              role: "user",
            },
          };
        },
      },
      update: {
        before: async (data) => {
          if (data.role && data.role !== "user") {
            const next = { ...data };
            delete next.role;
            return { data: next };
          }
          return { data };
        },
      },
    },
    session: {
      create: {
        after: async (created) => {
          try {
            await claimUserCommerce(created.userId);
          } catch (error) {
            console.error("[glossy] failed to claim guest data", error);
          }
        },
      },
    },
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    nextCookies(),
  ],
});
