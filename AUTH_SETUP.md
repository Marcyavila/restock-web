# ReStock Pro — Auth & Paid Tiers (Convex + Clerk + Stripe)

This guide gets you from zero to login + free/Pro limits in the extension and on the web.

---

## 1. Convex backend

1. **Create a Convex account** at [convex.dev](https://convex.dev) and install the CLI:
   ```bash
   npm install -g convex
   ```
2. **From the project root** (where this file is), run:
   ```bash
   npm install
   npx convex dev
   ```
   Log in when prompted and create a new Convex project. This creates a `convex/_generated` folder and deploys your schema and functions.

3. **Note your Convex deployment URL** (e.g. `https://xxx.convex.cloud`) and **HTTP base URL** (e.g. `https://xxx.convex.site`) from the Convex dashboard (Settings → URL and Deploy Key). The extension and auth app will call the **HTTP** URL for `GET /getPlan`.

---

## 2. Clerk auth

1. **Sign up at [clerk.com](https://clerk.com)** and create an application (e.g. “ReStock Pro”).
2. **Enable the Convex integration** in Clerk: Dashboard → Integrations → Convex. Copy your **Clerk Frontend API URL** (e.g. `https://xxx.clerk.accounts.dev`).
3. **In Convex Dashboard** (Settings → Environment Variables), add:
   - `CLERK_JWT_ISSUER_DOMAIN` = your Clerk Frontend API URL (e.g. `https://xxx.clerk.accounts.dev`)
4. Redeploy Convex so auth is applied:
   ```bash
   npx convex dev
   ```
5. In Clerk, under **Redirect URLs**, add:
   - `https://getrestock.app/auth/callback` (or your auth callback URL)
   - For local dev: `http://localhost:5173/auth/callback` (if you run the auth app locally)

6. **Force Google/Discord to show account picker** so users always choose an account (no silent sign-in):
   - Clerk Dashboard → **User & Authentication** → **Social connections** → **Google**. Look for **Authorization parameters**, **Custom parameters**, or **Always show account selector**. Add `prompt=select_account` (e.g. in "Additional authorization parameters") so Google shows "Choose an account" every time.
   - For **Discord**, if a similar option exists, enable it so users can pick which Discord account to use.

---

## 3. Auth app (login + “Connect extension”)

The extension opens a tab to your site so users can log in; after login they’re sent to a page that passes a token back to the extension.

- **Option A — Use the provided auth app** in `website/auth` (Vite + React + Clerk):
  1. `cd website/auth && npm install`
  2. Create `website/auth/.env` with:
     ```
     VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
     VITE_CONVEX_SITE_URL=https://YOUR_DEPLOYMENT.convex.site
     ```
     (Get the publishable key from Clerk → API Keys; Convex site URL from Convex dashboard.)
  3. `npm run build`
  4. Deploy the built app so it’s served at `https://getrestock.app/auth` (e.g. deploy the `auth` app to Vercel with base path `/auth`, or copy `dist/` into your main site’s `/auth`).

- **Option B — Your own auth**  
  You can replace this with any flow that:
  1. Lets the user sign in with Clerk.
  2. Gets a Clerk JWT (e.g. `getToken()`).
  3. Redirects the browser to:
     `https://getrestock.app/auth/extension-callback?token=JWT_HERE`  
     The extension’s content script on `getrestock.app` will read `token` and send it to the extension.

The extension expects to open a URL like `https://getrestock.app/auth` (or `/auth/login`), and after login to be redirected to `.../auth/extension-callback?token=...`.

---

## 4. Extension

1. **Host permissions**  
   In `manifest.json`, `host_permissions` must include:
   - `https://getrestock.app/*`
   - Your Convex HTTP base URL (e.g. `https://*.convex.site`) so the extension can call `GET /getPlan`.

2. **Content script for auth callback**  
   A content script runs on `getrestock.app`. When the page is `.../auth/extension-callback?token=...`, it reads `token`, stores it in `chrome.storage.local`, and then closes the tab or navigates to a “Success” page.

3. **Calling Convex**  
   When the extension has a stored token, it calls:
   ```http
   GET https://YOUR_DEPLOYMENT.convex.site/getPlan
   Authorization: Bearer <stored_token>
   ```
   The response is `{ plan: "free" | "pro", itemLimit: number, email?: string }`.

4. **Free tier limit**  
   In the extension, if `plan === "free"`, allow at most `itemLimit` tracked items (e.g. 5). If the user is at the limit and tries to add another, show a message like “Upgrade to Pro for more items” and optionally open your upgrade/checkout URL.

---

## 5. Stripe (Pro tier)

1. **Stripe account**  
   Create products/prices (e.g. “ReStock Pro” monthly or yearly) in the Stripe Dashboard.

2. **Checkout**  
   When a user clicks “Upgrade”:
   - Create a Stripe Customer (or reuse by email).
   - Create a Checkout Session with that `customer` (and `client_reference_id` or metadata if you store Convex userId).
   - Before or after checkout, ensure the Convex profile has `stripeCustomerId` (e.g. call `profiles.setStripeCustomerId` when you create the customer).

3. **Webhook**  
   In Stripe, add an endpoint pointing to:
   `https://YOUR_DEPLOYMENT.convex.site/stripe-webhook`  
   Use the same HTTP router you deployed (Convex HTTP action). In Convex Dashboard, set:
   - `STRIPE_WEBHOOK_SECRET` = the webhook signing secret from Stripe.

   The current webhook handler parses `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.paid`, and calls `setPlanFromStripe` with the Stripe customer ID. **Important:** In production you must verify the Stripe signature (e.g. with `stripe.webhooks.constructEvent`) before updating plan; the handler in `convex/http.ts` is a starting point and should be updated to verify the signature using your `STRIPE_WEBHOOK_SECRET`.

4. **Customer ID**  
   Your Convex `profiles` table has `stripeCustomerId`. When you create a Stripe Customer during checkout, save it with `profiles.setStripeCustomerId` so the webhook can find the profile and set `plan: "pro"` or `plan: "free"`.

---

## 6. Limits summary

| Plan | Tracked items |
|------|----------------|
| Free | 5 |
| Pro  | 999 (effectively unlimited) |

`getMyPlan` (query and HTTP `/getPlan`) returns `plan` and `itemLimit`. The extension should enforce `itemLimit` when adding items and show an upgrade CTA when at limit.

---

## 7. Optional: Restrict CORS

In `convex/http.ts`, `getPlan` uses `Access-Control-Allow-Origin: "*"`. For production, replace with your actual origins (e.g. `https://getrestock.app` and your Chrome extension origin) so only your app and extension can call `/getPlan`.
