# Auth / “Development mode” — Why it happens and how to fix it

## What was wrong

- **Vercel does not build the auth app.** The repo’s `.vercelignore` excludes the `auth` folder (source). Vercel only deploys what’s in the repo, so it serves the **pre-built** `auth-build` folder.
- The **committed `auth-build`** was built when the app still used the **test** Clerk key (`pk_test_...`). So the live site at getrestock.app/auth was serving that old build → Clerk showed **“Development mode”**.

## Fix (one-time and for future updates)

1. **Use production env for the auth build**  
   Ensure `website/auth/.env.production` has:
   - `VITE_CLERK_PUBLISHABLE_KEY=pk_live_...` (from Clerk Dashboard → Production → API Keys)
   - `VITE_CLERK_DOMAIN=clerk.getrestock.app`
   - `VITE_CONVEX_SITE_URL=https://unique-ptarmigan-750.convex.site`

2. **Build and refresh `auth-build`** (from project root):
   ```bash
   cd website/auth && npm run build && cd .. && sh scripts/prepare-auth-deploy.sh
   ```
   Or use the helper script:
   ```bash
   sh website/scripts/build-auth-for-production.sh
   ```

3. **Commit and push** the updated `website/auth-build/` (especially `auth-build/assets/*.js` and `auth-build/index.html`).  
   The next Vercel deploy will serve this build and the auth page will use production Clerk (no “Development mode”).

## Optional: Have Vercel build the auth app

If you want the auth app to be built on Vercel (so you don’t have to commit `auth-build` and can use Vercel env vars only):

1. **Remove** the `auth` folder from `website/.vercelignore` (delete the `auth` line or comment it out).
2. In **Vercel** → Project → **Settings** → **General**:
   - **Root Directory:** `website`
   - **Build Command:** `cd auth && npm install && npm run build && cd .. && sh scripts/prepare-auth-deploy.sh`
   - **Output Directory:** `.` (or leave default)
3. In **Vercel** → **Settings** → **Environment Variables** (for **Production**):
   - `VITE_CLERK_PUBLISHABLE_KEY` = `pk_live_...`
   - `VITE_CLERK_DOMAIN` = `clerk.getrestock.app`
   - `VITE_CONVEX_SITE_URL` = `https://unique-ptarmigan-750.convex.site`
4. Redeploy (with “Clear cache and redeploy” if needed).

Then every deploy will build the auth app on Vercel with those env vars, and you no longer need to commit `auth-build`.
