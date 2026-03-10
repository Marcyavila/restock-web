import { AuthConfig } from "convex/server";

/**
 * Configure Clerk as the JWT issuer in Convex Dashboard:
 * Set env var CLERK_JWT_ISSUER_DOMAIN to your Clerk Frontend API URL
 * (e.g. https://your-app.clerk.accounts.dev)
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
