import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { BrowserRouter } from "react-router-dom";
import { clerkAppearance } from "./clerkAppearance";
import App from "./App";
import "./index.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

/** Optional: custom Clerk Frontend API domain (e.g. clerk.getrestock.app). Set in production env. */
const clerkDomain = import.meta.env.VITE_CLERK_DOMAIN;

/** Production = no "Development mode" badge. Keys starting with pk_live_ are production. */
const isProductionClerk = publishableKey.startsWith("pk_live_");
if (typeof document !== "undefined") {
  document.documentElement.dataset.clerkBuild = isProductionClerk ? "production" : "development";
}

const allowedRedirectOrigins = [
  "https://getrestock.app",
  "https://www.getrestock.app",
  "http://localhost:5173",
];

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={publishableKey}
      domain={clerkDomain || undefined}
      allowedRedirectOrigins={allowedRedirectOrigins}
      appearance={clerkAppearance}
    >
      <BrowserRouter basename="/auth">
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
);
