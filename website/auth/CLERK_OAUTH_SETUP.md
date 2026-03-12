# Clerk + Google/Discord OAuth — Fix "authorization_invalid"

When you see `clerk.getrestock.app/v1/oauth_callback?err_code=authorization_invalid`, both **Clerk** and the **OAuth provider** (Google or Discord) must have matching redirect URLs and credentials. Use this checklist for your **Production** instance and custom domain `clerk.getrestock.app`.

---

## 1. Clerk Dashboard (Production)

**Path:** [dashboard.clerk.com](https://dashboard.clerk.com) → switch to **Production** → **Configure** (or **Paths** / **Domains**).

### Application domain
- Already set: `getrestock.app` (no path, no trailing slash).

### Redirect URLs / Allowed redirect URLs
If your Clerk instance has a **Redirect URLs** or **Allowed redirect URLs** allowlist, add **every** URL your app can redirect to after sign-in/sign-up (exact, no trailing slash unless you use it):

```
https://www.getrestock.app/auth
https://www.getrestock.app/auth/connect
https://www.getrestock.app/auth/checkout
https://getrestock.app/auth
https://getrestock.app/auth/connect
https://getrestock.app/auth/checkout
```

### Social connections (Google)
- **Configure** → **Social connections** → **Google**
- Turn on **Enable for sign-up and sign-in** and **Use custom credentials**
- Copy the **Redirect URI** Clerk shows (e.g. `https://clerk.getrestock.app/v1/oauth_callback`) — you will add this **exactly** in Google in step 2
- Paste your Google OAuth **Client ID** and **Client Secret**

### Social connections (Discord)
- **Configure** → **Social connections** → **Discord**
- Turn on **Enable for sign-up and sign-in** and **Use custom credentials**
- Copy the **Redirect URI** Clerk shows — add this **exactly** in Discord in step 3
- Paste your Discord **Client ID** and **Client Secret**

---

## 2. Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → your project → **APIs & Services** → **Credentials**
2. Open your **OAuth 2.0 Client ID** (Web application) used for Clerk
3. **Authorized redirect URIs:** add the **exact** URI from Clerk (e.g. `https://clerk.getrestock.app/v1/oauth_callback`) — no trailing slash
4. **Authorized JavaScript origins:** add:
   - `https://clerk.getrestock.app`
   - `https://www.getrestock.app`
   - `https://getrestock.app`
5. Save

---

## 3. Discord Developer Portal

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications) → your application
2. **OAuth2** → **Redirects** → **Add Redirect**
3. Paste the **exact** Redirect URI from Clerk’s Discord social connection (e.g. `https://clerk.getrestock.app/v1/oauth_callback`)
4. Save (**Save Changes**)
5. Copy **Client ID** and **Client Secret** into Clerk (Social connections → Discord → Use custom credentials)

---

## 4. App config (already done)

The auth app already sets:

- **ClerkProvider** `allowedRedirectOrigins`: `https://getrestock.app`, `https://www.getrestock.app`, `http://localhost:5173`
- **forceRedirectUrl** to your app (e.g. `https://www.getrestock.app/auth/connect`) using `window.location.origin`

No code change needed if the URLs above match what you allowlist in Clerk.

---

## Quick checklist

| Where | What |
|--------|------|
| **Clerk** → Google | Custom credentials on; Redirect URI copied into Google |
| **Clerk** → Discord | Custom credentials on; Redirect URI copied into Discord |
| **Google Console** | Authorized redirect URI = exact Clerk value; JS origins include clerk.getrestock.app and getrestock.app |
| **Discord Portal** | OAuth2 Redirects = exact Clerk value |
| **Clerk** (if available) | Allowed redirect URLs include https://www.getrestock.app/auth, /auth/connect, /auth/checkout (and getrestock.app variants) |

After changing any of these, try sign-in with Google and Discord again. If it still fails, use the `clerk_trace_id` from the error JSON in Clerk’s dashboard or support to see the exact reason.
