# Deploy getrestock.app (including /auth)

## One-time: prepare the auth app for deploy

From your **project root** (ReStock Pro v1.0.5):

```bash
cd website/auth && npm install && npm run build
cd ../..
sh website/scripts/prepare-auth-deploy.sh
```

Or from the **website** folder:

```bash
cd auth && npm install && npm run build && cd ..
sh scripts/prepare-auth-deploy.sh
```

This builds the auth app and copies it into `website/auth-build/`. Your host will serve it at `/auth` (see below).

---

## Option 1: Vercel (recommended)

1. **Connect the repo** (if not already): [vercel.com](https://vercel.com) → Import your repo.

2. **Set the root directory** to `website` (or deploy only the `website` folder).
   - Project Settings → General → Root Directory → `website`.

3. **Build (optional).** If you want Vercel to run the auth build for you, set:
   - Build Command: `cd auth && npm install && npm run build && cd .. && sh scripts/prepare-auth-deploy.sh`
   - Output Directory: `.` (leave default if you're deploying a static site)

   **Or** run the “prepare auth deploy” script locally (see above) and push; then Vercel just deploys the static files.

4. **Deploy:** Push to your main branch. Vercel will deploy. The `website/vercel.json` rewrites send `/auth` and `/auth/*` to the files in `auth-build/`.

5. Your site will be at your Vercel URL (or `getrestock.app` if you added the custom domain).

---

## Option 2: Netlify

1. Connect the repo at [netlify.com](https://netlify.com). Set **Base directory** to `website`.

2. Add a file `website/netlify.toml` (create it) with:

```toml
[build]
  command = "cd auth && npm install && npm run build && cd .. && sh scripts/prepare-auth-deploy.sh"
  publish = "."

[[redirects]]
  from = "/auth/*"
  to = "/auth-build/:splat"
  status = 200

[[redirects]]
  from = "/auth"
  to = "/auth-build/index.html"
  status = 200
```

3. Deploy. Netlify will build the auth app, run the script, and serve `/auth` from `auth-build/`.

---

## Option 3: Manual / other host (FTP, cPanel, etc.)

1. Run the prepare script (see top of this file) so `website/auth-build/` exists.

2. Upload the **entire contents** of the `website` folder to your host’s public web root (so `index.html` is at the site root).

3. Configure your server so that:
   - `https://getrestock.app/auth` and `https://getrestock.app/auth/` serve `auth-build/index.html`.
   - `https://getrestock.app/auth/assets/*` serves files from `auth-build/assets/`.

   (Exact steps depend on your host; often this is “default document” for `/auth/` and static file mapping for `/auth/assets/`.)

---

## Check after deploy

- Main site: `https://getrestock.app`
- Auth (login): `https://getrestock.app/auth`

Open `/auth` and you should see the Clerk sign-in page.
