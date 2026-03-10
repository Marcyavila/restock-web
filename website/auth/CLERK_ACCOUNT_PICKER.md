# Force Google/Discord account picker (no silent sign-in)

So users always see "Choose an account" instead of being signed in with the browser’s default account:

## Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → your application.
2. **User & Authentication** → **Social connections** (or **SSO connections**).
3. **Google**:
   - Open the Google connection.
   - Find **"Authorization parameters"**, **"Custom parameters"**, **"Additional authorization parameters"**, or **"Always show account selector"** (wording varies by Clerk version).
   - Add: `prompt=select_account`  
     This tells Google to show the account chooser every time instead of auto-signing in.
4. **Discord** (if you use it):
   - Open the Discord connection.
   - If there is an option for authorization/custom parameters or “always show consent”, enable it so users can choose which Discord account to use.

Save the settings. Rebuild and redeploy the auth app if needed; the change is in Clerk, so a simple refresh of the auth page may be enough.
