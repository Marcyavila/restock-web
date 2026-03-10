import React, { useEffect } from "react";
import { SignIn, useAuth, useClerk } from "@clerk/clerk-react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { clerkAppearance } from "./clerkAppearance";

// #region agent log
function _debugLog(message: string, data: Record<string, unknown>, hypothesisId: string) {
  fetch("http://127.0.0.1:7257/ingest/271ef3f9-406e-477b-901e-da630fdc4f5b", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9304b4" },
    body: JSON.stringify({ sessionId: "9304b4", location: "App.tsx", message, data, hypothesisId, timestamp: Date.now() }),
  }).catch(() => {});
}
// #endregion

const logoUrl =
  typeof window !== "undefined" ? `${window.location.origin}/logospb.png` : "/logospb.png";

/** Full-page premium layout: gradient background, branding, centered card. */
function AuthLayout({ children }: { children: React.ReactNode }) {
  // #region agent log
  useEffect(() => {
    const t = setTimeout(() => {
      const card = document.querySelector(".auth-layout__card");
      const cardFirst = card?.firstElementChild;
      const headerLike = Array.from(document.querySelectorAll("*")).find((el) => el.textContent?.includes("Sign in to"));
      const colorScheme = document.documentElement ? getComputedStyle(document.documentElement).colorScheme : "";
      const sheetHrefs = Array.from(document.styleSheets)
        .map((s) => (s as CSSStyleSheet).href || "")
        .filter(Boolean);
      _debugLog("DOM and env", {
        cardExists: !!card,
        cardFirstClassName: cardFirst?.className ?? null,
        headerLikeClassName: headerLike?.className ?? null,
        headerLikeTag: headerLike?.tagName ?? null,
        headerLikeDisplay: headerLike ? getComputedStyle(headerLike).display : null,
        colorScheme,
        styleSheetCount: document.styleSheets.length,
        sheetHrefsSample: sheetHrefs.slice(0, 5),
        inIframe: window.self !== window.top,
        locationHref: window.location.href,
      }, "H2");
      _debugLog("appearance config", {
        hasTheme: !!clerkAppearance.theme,
        themeKeys: clerkAppearance.theme ? Object.keys(clerkAppearance.theme as object).slice(0, 5) : [],
        elementsKeys: Object.keys(clerkAppearance.elements || {}),
        optionsKeys: Object.keys(clerkAppearance.options || {}),
      }, "H3");
      _debugLog("build/cache", {
        colorScheme,
        hasAuthLayoutCard: !!document.querySelector(".auth-layout__card"),
        bodyBg: document.body ? getComputedStyle(document.body).background?.slice(0, 50) : null,
      }, "H1");
    }, 1500);
    return () => clearTimeout(t);
  }, []);
  // #endregion
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

/** When user arrives from the extension with ?from_extension=1, sign out first so they always see the sign-in form and can choose Google/Discord/email (and which account). */
function ForceSignInIfFromExtension({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { signOut } = useClerk();
  const location = useLocation();
  const [signingOut, setSigningOut] = React.useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const params = new URLSearchParams(location.search);
    if (params.get("from_extension") !== "1") return;

    setSigningOut(true);
    const authBase = `${window.location.origin}/auth`;
    signOut()
      .then(() => {
        window.location.replace(authBase);
      })
      .catch(() => {
        window.location.replace(authBase);
      });
  }, [isLoaded, isSignedIn, signOut, location.search]);

  if (signingOut || (isLoaded && isSignedIn && new URLSearchParams(location.search).get("from_extension") === "1")) {
    return (
      <div className="auth-page">
        <p className="auth-state-message">Signing out so you can choose how to sign in…</p>
      </div>
    );
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
    if (!token) return;
    if (window.self !== window.top) {
      try {
        window.parent.postMessage({ type: "AUTH_CALLBACK", token }, "*");
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

// Force redirect to /auth/connect after sign-in so we can pass token to extension (full URL so Clerk respects it)
const connectUrl = typeof window !== "undefined" ? `${window.location.origin}/auth/connect` : "/auth/connect";

/** When embedded in the extension popup iframe, Google/Discord OAuth may not work; offer opening in a new tab. */
function IframeBanner() {
  if (typeof window === "undefined" || window.self === window.top) return null;
  const authUrl = `${window.location.origin}/auth?from_extension=1`;
  return (
    <div className="auth-iframe-banner">
      <span className="auth-iframe-banner__text">Using Google or Discord?</span>{" "}
      <a href={authUrl} target="_blank" rel="noopener noreferrer" className="auth-iframe-banner__link">
        Open in new tab
      </a>
    </div>
  );
}

export default function App() {
  return (
    <ForceSignInIfFromExtension>
      <IframeBanner />
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
        <Route path="/logout" element={<LogoutPage />} />
        <Route path="/logout/done" element={<LogoutDone />} />
        <Route path="/extension-callback" element={<ExtensionCallback />} />
        <Route path="/extension-callback/success" element={<ExtensionCallback />} />
      </Routes>
    </ForceSignInIfFromExtension>
  );
}
