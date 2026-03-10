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
