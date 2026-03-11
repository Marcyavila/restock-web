import React, { useEffect } from "react";
import { SignIn, useAuth, useClerk } from "@clerk/clerk-react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

const logoUrl =
  typeof window !== "undefined" ? `${window.location.origin}/logospb.png` : "/logospb.png";

/** Full-page premium layout: gradient background, branding, centered card. */
function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-layout__brand">
        <img src={logoUrl} alt="" className="auth-layout__logo" />
        <h1 className="auth-layout__title">ReStock Pro</h1>
        <p className="auth-layout__tagline">Sign in to sync your account</p>
      </div>
      <div className="auth-layout__card">{children}</div>
    </div>
  );
}

/**
 * When user arrives from the extension (?from_extension=1):
 * - If signed in → redirect to /connect (resolves to /auth/connect with basename) so the token is sent to the extension (no sign-out).
 *   This avoids signing users out immediately after Google/Discord OAuth (referrer-based
 *   detection is unreliable when referrer is stripped).
 * - If not signed in → show the sign-in form as usual.
 */
function ForceSignInIfFromExtension({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    return (
      <div className="auth-page">
        <p className="auth-state-message">Loading…</p>
      </div>
    );
  }

  const params = new URLSearchParams(location.search);
  if (params.get("from_extension") === "1" && isSignedIn) {
    return <Navigate to="/connect" replace />;
  }

  return <>{children}</>;
}

function ConnectExtension() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    getToken().then((token) => {
      if (token) {
        const authRoot = `${window.location.origin}/auth`;
        const callbackUrl = `${authRoot}/extension-callback?token=${encodeURIComponent(token)}`;
        window.location.href = callbackUrl;
      }
    });
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded) return <div className="auth-page"><p className="auth-state-message">Loading…</p></div>;
  if (!isSignedIn) return <Navigate to="/" replace />;
  return (
    <div className="auth-page">
      <p className="auth-state-message">Redirecting to extension…</p>
    </div>
  );
}

function ExtensionCallback() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const inIframe = window.self !== window.top;
    if (inIframe) {
      try {
        if (token) {
          window.parent.postMessage({ type: "AUTH_CALLBACK", token }, "*");
        } else {
          // Success page (no token in URL): tell parent to re-read storage so popup hides gate
          window.parent.postMessage({ type: "RESTOCK_AUTH_SUCCESS" }, "*");
        }
      } catch (_) {}
    }
  }, [location.search]);

  return (
    <div className="auth-page">
      <p className="auth-state-message auth-state-message--success">
        {window.self !== window.top ? "Signed in! The extension will update." : "You can close this tab and return to the ReStock Pro extension."}
      </p>
    </div>
  );
}

/** Full logout: clears Clerk session so the user is signed out everywhere (extension + web). */
function LogoutPage() {
  const { signOut } = useClerk();
  const [done, setDone] = React.useState(false);

  useEffect(() => {
    let cancelled = false;
    signOut({ redirectUrl: `${window.location.origin}/auth/logout/done` })
      .then(() => { if (!cancelled) setDone(true); })
      .catch(() => { if (!cancelled) window.location.href = `${window.location.origin}/auth`; });
    return () => { cancelled = true; };
  }, [signOut]);

  if (done) return null;
  return (
    <div className="auth-page">
      <p className="auth-state-message">Signing out…</p>
    </div>
  );
}

function LogoutDone() {
  return (
    <div className="auth-page">
      <p className="auth-state-message auth-state-message--success">You’re signed out. You can close this tab.</p>
    </div>
  );
}

/** Convex HTTP base URL for createCheckoutSession (set VITE_CONVEX_SITE_URL in .env to match extension). */
const CONVEX_HTTP_URL =
  (typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_CONVEX_SITE_URL?: string } }).env?.VITE_CONVEX_SITE_URL) ||
  "https://vibrant-gopher-82.convex.site";

/** Redirect signed-in users to Stripe Checkout; otherwise show sign-in with redirect back here. */
function CheckoutRedirect() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;
    let cancelled = false;
    getToken()
      .then((token) => {
        if (cancelled || !token) return;
        return fetch(`${CONVEX_HTTP_URL}/createCheckoutSession`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then((res) => {
        if (cancelled) return;
        if (!res?.ok) throw new Error("Could not start checkout");
        return res!.json();
      })
      .then((data: { url?: string }) => {
        if (cancelled || !data?.url) return;
        window.location.href = data.url;
      })
      .catch(() => {
        if (!cancelled) setError("Could not start checkout. Try again or use the extension.");
      });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded) return <div className="auth-page"><p className="auth-state-message">Loading…</p></div>;
  if (!isSignedIn) {
    const checkoutReturn = `${window.location.origin}/auth/checkout`;
    return (
      <AuthLayout>
        <SignIn forceRedirectUrl={checkoutReturn} signUpUrl="/auth/sign-up" />
        <p style={{ marginTop: "1rem", fontSize: "0.9rem", opacity: 0.8 }}>
          Sign in to continue to checkout.
        </p>
      </AuthLayout>
    );
  }
  if (error) {
    return (
      <div className="auth-page">
        <p className="auth-state-message" style={{ color: "var(--clerk-error)" }}>{error}</p>
      </div>
    );
  }
  return (
    <div className="auth-page">
      <p className="auth-state-message">Redirecting to checkout…</p>
    </div>
  );
}

// Force redirect to /auth/connect after sign-in so we can pass token to extension (full URL so Clerk respects it)
const connectUrl = typeof window !== "undefined" ? `${window.location.origin}/auth/connect` : "/auth/connect";

export default function App() {
  return (
    <ForceSignInIfFromExtension>
      <Routes>
        <Route
          path="/"
          element={
            <AuthLayout>
              <SignIn forceRedirectUrl={connectUrl} signUpUrl="/auth/sign-up" />
            </AuthLayout>
          }
        />
        <Route
          path="/sign-up"
          element={
            <AuthLayout>
              <SignIn signUpForceRedirectUrl={connectUrl} signInUrl="/auth" />
            </AuthLayout>
          }
        />
        <Route path="/connect" element={<ConnectExtension />} />
        <Route path="/checkout" element={<CheckoutRedirect />} />
        <Route path="/logout" element={<LogoutPage />} />
        <Route path="/logout/done" element={<LogoutDone />} />
        <Route path="/extension-callback" element={<ExtensionCallback />} />
        <Route path="/extension-callback/success" element={<ExtensionCallback />} />
      </Routes>
    </ForceSignInIfFromExtension>
  );
}
