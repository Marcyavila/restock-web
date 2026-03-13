import React, { useEffect } from "react";
import { SignIn, SignedIn, useAuth, useClerk } from "@clerk/clerk-react";
import { CheckoutButton, usePlans } from "@clerk/clerk-react/experimental";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// Use your site-hosted logo asset (not Clerk's uploaded logo).
const logoUrl =
  typeof window !== "undefined" ? `${window.location.origin}/logospb.png` : "/logospb.png";

/** Full-page premium layout: gradient background, branding, centered card. */
function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-layout__card">
        <div className="auth-card__logoRow" aria-hidden="true">
          <img src={logoUrl} alt="" className="auth-card__logo" />
        </div>
        {children}
      </div>
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
const LOADING_FALLBACK_MS = 8000;
const PRODUCTION_CHECKOUT_URL = "https://getrestock.app/auth/checkout";

function ForceSignInIfFromExtension({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const location = useLocation();
  const [showLoadingFallback, setShowLoadingFallback] = React.useState(false);

  // #region agent log
  React.useEffect(() => {
    if (!isLoaded) {
      fetch("http://127.0.0.1:7257/ingest/271ef3f9-406e-477b-901e-da630fdc4f5b", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9304b4" }, body: JSON.stringify({ sessionId: "9304b4", location: "App.tsx:ForceSignIn-loading", message: "stuck Loading (wrapper)", data: { isLoaded: false, pathname: location.pathname }, timestamp: Date.now(), hypothesisId: "H1" }) }).catch(() => {});
    }
  }, [isLoaded, location.pathname]);
  // #endregion

  React.useEffect(() => {
    if (isLoaded) {
      setShowLoadingFallback(false);
      return;
    }
    const t = setTimeout(() => {
      setShowLoadingFallback(true);
      // #region agent log
      fetch("http://127.0.0.1:7257/ingest/271ef3f9-406e-477b-901e-da630fdc4f5b", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9304b4" }, body: JSON.stringify({ sessionId: "9304b4", location: "App.tsx:ForceSignIn-fallback", message: "loading fallback shown", data: { pathname: location.pathname }, timestamp: Date.now(), hypothesisId: "H1-verify" }) }).catch(() => {});
      // #endregion
    }, LOADING_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [isLoaded, location.pathname]);

  if (!isLoaded) {
    return (
      <div className="auth-page">
        {showLoadingFallback ? (
          <>
            <p className="auth-state-message">Sign-in is taking longer than usual on this page.</p>
            <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", opacity: 0.9 }}>
              Open checkout on the production site or from the extension:
            </p>
            <a
              href={PRODUCTION_CHECKOUT_URL}
              style={{
                display: "inline-block",
                marginTop: "1rem",
                padding: "0.5rem 1rem",
                fontSize: "0.95rem",
                color: "var(--clerk-primary, #0ea5e9)",
              }}
            >
              Open checkout at getrestock.app →
            </a>
          </>
        ) : (
          <p className="auth-state-message">Loading…</p>
        )}
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
  "https://unique-ptarmigan-750.convex.site";

/** Shows checkout error and runs a one-time ping to Convex /ping to see if the 502 is specific to createCheckoutSession or global. */
function CheckoutErrorDiagnostic({
  error,
  statusCode,
  convexUrl,
}: {
  error: string;
  statusCode: number | null;
  convexUrl: string;
}) {
  const [pingStatus, setPingStatus] = React.useState<"idle" | "ok" | "fail">("idle");
  const [pingDetail, setPingDetail] = React.useState<string>("");

  React.useEffect(() => {
    if (pingStatus !== "idle") return;
    let cancelled = false;
    fetch(`${convexUrl}/ping`)
      .then((res) => {
        if (cancelled) return;
        const hasCors = res.headers.get("access-control-allow-origin");
        if (res.ok) {
          setPingStatus("ok");
          setPingDetail(hasCors ? "OK, CORS present" : "OK, no CORS header");
        } else {
          setPingStatus("fail");
          setPingDetail(`HTTP ${res.status}${!hasCors ? ", no CORS" : ""}`);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setPingStatus("fail");
        setPingDetail(err?.message ?? "Request failed");
      });
    return () => { cancelled = true; };
  }, [convexUrl, pingStatus]);

  return (
    <>
      <p className="auth-state-message" style={{ color: "var(--clerk-error)" }}>{error}</p>
      {statusCode != null && (
        <p className="auth-state-message" style={{ fontSize: "0.85rem", opacity: 0.8 }}>
          (HTTP {statusCode})
        </p>
      )}
      {pingStatus !== "idle" && (
        <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", opacity: 0.85 }}>
          Server ping ({convexUrl}/ping): {pingStatus === "ok" ? pingDetail : pingDetail}
        </p>
      )}
    </>
  );
}

/** Redirect signed-in users to Stripe Checkout; otherwise show sign-in with redirect back here. */
function CheckoutRedirect() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const [statusCode, setStatusCode] = React.useState<number | null>(null);
  const [retryKey, setRetryKey] = React.useState(0);

  // #region agent log
  React.useEffect(() => {
    fetch("http://127.0.0.1:7257/ingest/271ef3f9-406e-477b-901e-da630fdc4f5b", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9304b4" }, body: JSON.stringify({ sessionId: "9304b4", location: "App.tsx:CheckoutRedirect-state", message: "checkout page state", data: { isLoaded, isSignedIn }, timestamp: Date.now(), hypothesisId: "H2" }) }).catch(() => {});
  }, [isLoaded, isSignedIn]);
  // #endregion

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    setError(null);
    setStatusCode(null);
    let cancelled = false;
    getToken()
      .then((token) => {
        // #region agent log
        fetch("http://127.0.0.1:7257/ingest/271ef3f9-406e-477b-901e-da630fdc4f5b", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9304b4" }, body: JSON.stringify({ sessionId: "9304b4", location: "App.tsx:checkout-fetch", message: "createCheckoutSession request", data: { hasToken: !!token, url: `${CONVEX_HTTP_URL}/createCheckoutSession` }, timestamp: Date.now(), hypothesisId: "H1" }) }).catch(() => {});
        // #endregion
        if (cancelled || !token) return null;
        return fetch(`${CONVEX_HTTP_URL}/createCheckoutSession`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then(async (res) => {
        if (cancelled) return null;
        if (res) setStatusCode(res.status);
        const text = res ? await res.text() : "";
        const corsHeader = res?.headers?.get?.("access-control-allow-origin") ?? null;
        // #region agent log
        fetch("http://127.0.0.1:7257/ingest/271ef3f9-406e-477b-901e-da630fdc4f5b", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9304b4" }, body: JSON.stringify({ sessionId: "9304b4", location: "App.tsx:checkout-response", message: "createCheckoutSession response", data: { status: res?.status, hasCors: !!corsHeader, bodyPreview: (text || "").slice(0, 200) }, timestamp: Date.now(), hypothesisId: "H2" }) }).catch(() => {});
        // #endregion
        let body: { url?: string; error?: string } = {};
        try {
          body = text ? (JSON.parse(text) as { url?: string; error?: string }) : {};
        } catch {
          body = { error: text && text.length < 300 ? text : `Request failed (${res?.status ?? "network"})` };
        }
        if (!res?.ok) {
          const msg = body?.error ?? `Request failed (${res?.status ?? "network"})`;
          throw new Error(msg);
        }
        return body as { url?: string };
      })
      .then((data: { url?: string } | null) => {
        if (cancelled || !data?.url) return;
        window.location.href = data.url;
      })
      .catch((err) => {
        // #region agent log
        const errMsg = (err && (err as Error).message) ? (err as Error).message : String(err);
        console.error("[Checkout] createCheckoutSession failed:", errMsg, err);
        fetch("http://127.0.0.1:7257/ingest/271ef3f9-406e-477b-901e-da630fdc4f5b", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9304b4" }, body: JSON.stringify({ sessionId: "9304b4", location: "App.tsx:checkout-catch", message: "createCheckoutSession error", data: { errName: (err as Error)?.name, errMessage: errMsg.slice(0, 150) }, timestamp: Date.now(), hypothesisId: "H3" }) }).catch(() => {});
        // #endregion
        if (!cancelled) {
          const message = err?.message ?? "Something went wrong. Try again or use the extension.";
          setError(message);
        }
      });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken, retryKey]);

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
        <CheckoutErrorDiagnostic
          error={error}
          statusCode={statusCode}
          convexUrl={CONVEX_HTTP_URL}
        />
        <button
          type="button"
          onClick={() => setRetryKey((k) => k + 1)}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            fontSize: "0.9rem",
            cursor: "pointer",
            background: "var(--clerk-primary)",
            color: "var(--clerk-primary-button-text)",
            border: "none",
            borderRadius: "6px",
          }}
        >
          Retry
        </button>
      </div>
    );
  }
  return (
    <div className="auth-page">
      <p className="auth-state-message">Redirecting to checkout…</p>
    </div>
  );
}

/** Direct checkout for the single paid plan (Pro). No pricing table — takes user straight to checkout. */
function DirectCheckoutPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { data: plans } = usePlans({ for: "user" });
  const proPlan = plans?.find(
    (p) => {
      const slug = (p as { slug?: string }).slug;
      const key = (p as { key?: string }).key;
      const name = (p as { name?: string }).name;
      return slug === "pro" || key === "pro" || (name && name.toLowerCase() === "pro");
    }
  );
  const redirectUrl = typeof window !== "undefined" ? `${window.location.origin}/auth` : "/auth";

  if (!isLoaded) {
    return (
      <div className="auth-page">
        <p className="auth-state-message">Loading…</p>
      </div>
    );
  }
  if (!isSignedIn) {
    return (
      <AuthLayout>
        <SignIn
          forceRedirectUrl={typeof window !== "undefined" ? `${window.location.origin}/auth/pricing` : "/auth/pricing"}
          signUpUrl="/auth/sign-up"
        />
        <p style={{ marginTop: "1rem", fontSize: "0.9rem", opacity: 0.8 }}>
          Sign in to upgrade to Pro.
        </p>
      </AuthLayout>
    );
  }
  if (!proPlan) {
    return (
      <div className="auth-page">
        <div className="auth-layout__card">
          <div className="auth-card__logoRow" aria-hidden="true">
            <img src={logoUrl} alt="" className="auth-card__logo" />
          </div>
          <p className="auth-state-message" style={{ marginTop: "1rem" }}>
            {plans === undefined ? "Loading…" : "Pro plan not found. In Clerk Dashboard → Billing → Subscription plans, set the Pro plan’s key/slug to \"pro\"."}
          </p>
        </div>
      </div>
    );
  }
  const planId = (proPlan as { id: string }).id;
  return (
    <div className="auth-page">
      <div className="auth-layout__card">
        <div className="auth-card__logoRow" aria-hidden="true">
          <img src={logoUrl} alt="" className="auth-card__logo" />
        </div>
        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <p className="auth-state-message" style={{ marginBottom: "1rem" }}>
            Upgrade to Pro
          </p>
          <SignedIn>
            <CheckoutButton
              for="user"
              planId={planId}
              planPeriod="month"
              onSubscriptionComplete={() => {
                window.location.href = redirectUrl;
              }}
            >
              <button
                type="button"
                style={{
                  padding: "0.75rem 1.5rem",
                  fontSize: "1rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: "var(--clerk-primary, #0ea5e9)",
                  color: "var(--clerk-primary-button-text, #fff)",
                  border: "none",
                  borderRadius: "8px",
                }}
              >
                Subscribe to Pro
              </button>
            </CheckoutButton>
          </SignedIn>
        </div>
      </div>
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
        <Route path="/pricing" element={<DirectCheckoutPage />} />
        <Route path="/checkout" element={<CheckoutRedirect />} />
        <Route path="/logout" element={<LogoutPage />} />
        <Route path="/logout/done" element={<LogoutDone />} />
        <Route path="/extension-callback" element={<ExtensionCallback />} />
        <Route path="/extension-callback/success" element={<ExtensionCallback />} />
      </Routes>
    </ForceSignInIfFromExtension>
  );
}
