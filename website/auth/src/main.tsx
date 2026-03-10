import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

// Allow redirects to our app and extension callback (production + local dev)
const allowedRedirectOrigins = [
  "https://getrestock.app",
  "http://localhost:5173",
];

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={publishableKey} allowedRedirectOrigins={allowedRedirectOrigins}>
      <BrowserRouter basename="/auth">
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
);
