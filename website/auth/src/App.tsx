import React, { useEffect } from "react";
import { SignIn, useAuth, useClerk } from "@clerk/clerk-react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

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
      <div style={{ padding: 24, color: "#8e8e98", textAlign: "center" }}>
        Signing out so you can choose how to sign in…
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

  if (!isLoaded) return <div style={{ padding: 24, color: "#8e8e98" }}>Loading…</div>;
  if (!isSignedIn) return <Navigate to="/" replace />;
  return (
    <div style={{ padding: 24, color: "#8e8e98", textAlign: "center" }}>
      Redirecting to extension…
    </div>
  );
}

function ExtensionCallback() {
  return (
    <div style={{ padding: 48, textAlign: "center", color: "#fafafa", fontFamily: "system-ui" }}>
      <p>You can close this tab and return to the ReStock Pro extension.</p>
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
    <div style={{ padding: 48, textAlign: "center", color: "#8e8e98", fontFamily: "system-ui" }}>
      <p>Signing out…</p>
    </div>
  );
}

function LogoutDone() {
  return (
    <div style={{ padding: 48, textAlign: "center", color: "#fafafa", fontFamily: "system-ui" }}>
      <p>You’re signed out. You can close this tab.</p>
    </div>
  );
}

// Force redirect to /auth/connect after sign-in so we can pass token to extension (full URL so Clerk respects it)
const connectUrl = typeof window !== "undefined" ? `${window.location.origin}/auth/connect` : "/auth/connect";

export default function App() {
  return (
    <ForceSignInIfFromExtension>
      <Routes>
        <Route path="/" element={<SignIn forceRedirectUrl={connectUrl} signUpUrl="/auth/sign-up" />} />
        <Route path="/sign-up" element={<SignIn signUpForceRedirectUrl={connectUrl} signInUrl="/auth" />} />
        <Route path="/connect" element={<ConnectExtension />} />
        <Route path="/logout" element={<LogoutPage />} />
        <Route path="/logout/done" element={<LogoutDone />} />
        <Route path="/extension-callback" element={<ExtensionCallback />} />
        <Route path="/extension-callback/success" element={<ExtensionCallback />} />
      </Routes>
    </ForceSignInIfFromExtension>
  );
}
