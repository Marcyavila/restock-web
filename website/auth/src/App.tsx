import { SignIn, useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

function ConnectExtension() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    getToken().then((token) => {
      if (token) {
        const base = window.location.origin + window.location.pathname.replace(/\/$/, "");
        const callbackUrl = `${base}/extension-callback?token=${encodeURIComponent(token)}`;
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SignIn afterSignInUrl="/auth/connect" signUpUrl="/auth/sign-up" />} />
      <Route path="/sign-up" element={<SignIn afterSignUpUrl="/auth/connect" signInUrl="/auth" />} />
      <Route path="/connect" element={<ConnectExtension />} />
      <Route path="/extension-callback" element={<ExtensionCallback />} />
      <Route path="/extension-callback/success" element={<ExtensionCallback />} />
    </Routes>
  );
}
