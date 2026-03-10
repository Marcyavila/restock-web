# Step 4 — Install, .env, build, deploy

## Is “Install and build” already done?

**Yes.** You already ran `npm install` and `npm run build` successfully. The built files are in `website/auth/dist/`. You do **not** need to run those again unless you change code or add the `.env` file and want to rebuild.

---

## Where to put the .env values

### 1. Create the file

- **Folder:** `website/auth/` (the same folder that has `package.json` and `src/`).
- **Filename:** `.env` (starts with a dot, no `.txt`).

So the full path is:

```
ReStock Pro v1.0.5/
  website/
    auth/
      .env          ← create this file here
      package.json
      src/
      ...
```

### 2. What to put inside .env

Open `.env` in a text editor and add **one line** (the auth app only needs the Clerk key):

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx
```

Replace `pk_test_xxxxxxxxxxxxxxxxxxxxxxxx` with your **real** Clerk publishable key.

### 3. Where to get the real value

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com).
2. Open your app (e.g. ReStock).
3. In the left sidebar: **Configure** → **API Keys** (or **Developers** → **API Keys**).
4. Copy the **Publishable key** (it starts with `pk_test_` for development or `pk_live_` for production).
5. Paste it into `.env` after the `=`:

   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_abc123yourActualKeyHere
   ```

No quotes, no spaces around `=`. Save the file.

### 4. Rebuild (optional)

If you already built before adding `.env`, run once from `website/auth/`:

```bash
npm run build
```

Then deploy the contents of `website/auth/dist/` to `https://getrestock.app/auth` (see main AUTH_SETUP.md for deploy options).
