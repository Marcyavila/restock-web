import { SignIn, useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

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

// Force redirect to /auth/connect after sign-in so we can pass token to extension (full URL so Clerk respects it)
const connectUrl = typeof window !== "undefined" ? `${window.location.origin}/auth/connect` : "/auth/connect";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SignIn forceRedirectUrl={connectUrl} signUpUrl="/auth/sign-up" />} />
      <Route path="/sign-up" element={<SignIn signUpForceRedirectUrl={connectUrl} signInUrl="/auth" />} />
      <Route path="/connect" element={<ConnectExtension />} />
      <Route path="/extension-callback" element={<ExtensionCallback />} />
      <Route path="/extension-callback/success" element={<ExtensionCallback />} />
    </Routes>
  );
}
