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
2. **Enable the Convex integration** in Clerk: Dashboard → Integrations → Convex. Copy your **Clerk Frontend API URL** (e.g. `https://viable-teal-46.clerk.accounts.dev`).
3. **In Convex Dashboard** (Settings → Environment Variables), add:
   - `CLERK_JWT_ISSUER_DOMAIN` = your Clerk Frontend API URL (e.g. `https://viable-teal-46.clerk.accounts.dev`)
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

7. **Clerk "frame-ancestors" (embedding / iframe)**  
   If the extension shows the auth page in an iframe and you see a CSP error like "Framing 'https://xxx.accounts.dev/' violates… frame-ancestors", add your origins in Clerk so Clerk's UI can be embedded:
   - In **Clerk Dashboard** → **Configure** → **Paths** (or **Domains** / **Security**), find the setting for **allowed frame ancestors** or **domains that can embed Clerk**.
   - Add: `https://getrestock.app`, `https://www.getrestock.app`. If the login iframe is loaded from the extension popup, also add your extension origin, e.g. `chrome-extension://YOUR_EXTENSION_ID` (ID from `chrome://extensions`).

8. **Convex 401 on `/getPlan`**  
   If the extension gets 401 from Convex after sign-in, ensure Convex has the correct Clerk issuer:
   - Convex Dashboard → **Settings** → **Environment Variables** → `CLERK_JWT_ISSUER_DOMAIN` = your Clerk Frontend API URL (e.g. `https://viable-teal-46.clerk.accounts.dev`), with no trailing slash.
   - Redeploy Convex after changing env vars.

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

## 5. Stripe (Pro tier) — live payments

Checkout is implemented: the extension and the site call Convex to create a Stripe Checkout Session, then Stripe webhooks update the user’s plan in Convex.

1. **Stripe account & product**  
   - Sign up at [stripe.com](https://stripe.com) and complete account setup.
   - In Stripe Dashboard → **Product catalog** → **Add product** (e.g. “ReStock Pro”).
   - Add a **recurring** price (e.g. monthly or yearly) and copy the **Price ID** (starts with `price_`).

2. **Convex environment variables**  
   In Convex Dashboard → your project → **Settings** → **Environment Variables**, add:
   - `STRIPE_SECRET_KEY` = your Stripe secret key (Stripe Dashboard → Developers → API keys → Secret key; use test key for testing).
   - `STRIPE_PRICE_ID` = the Price ID from step 1 (e.g. `price_1ABC...`).
   - `STRIPE_WEBHOOK_SECRET` = from step 3 below (webhook signing secret).

3. **Stripe webhook**  
   - Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**.
   - **Endpoint URL:** `https://YOUR_DEPLOYMENT.convex.site/stripe-webhook`  
     (use your Convex HTTP URL from Convex Dashboard → Settings → URL).
   - **Events to send:**  
     `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`.
   - After creating the endpoint, open it and reveal **Signing secret** (starts with `whsec_`). Set that as `STRIPE_WEBHOOK_SECRET` in Convex (step 2).
   - Redeploy Convex after changing env vars.

4. **Flow**  
   - User clicks “Upgrade to Pro” in the extension (or on getrestock.app/upgrade).  
   - If logged in, the app calls Convex `GET /createCheckoutSession` with the Clerk JWT; Convex creates a Stripe Checkout Session and returns the URL; the user is sent to Stripe to pay.  
   - After payment, Stripe sends `checkout.session.completed` (and subscription events) to your webhook. The handler verifies the signature and updates the Convex profile (links `stripeCustomerId`, sets `plan: "pro"`).  
   - The extension’s `/getPlan` (and next open) will show Pro.

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
