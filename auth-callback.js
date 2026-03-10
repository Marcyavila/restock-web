/**
 * Content script: runs on getrestock.app. When the user is redirected to
 * .../extension-callback?token=... (e.g. /auth/extension-callback or /auth/connect/extension-callback),
 * we read the token, send it to the extension background, and navigate to success.
 */
(function () {
  const path = window.location.pathname || "";
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (!token) return;
  // Match /auth/extension-callback or /auth/connect/extension-callback (with optional trailing slash)
  if (!/\/extension-callback\/?$/i.test(path) && !path.includes("extension-callback")) return;

  chrome.runtime.sendMessage({ type: "AUTH_CALLBACK", token }, function () {
    var u = new URL(window.location.href);
    u.searchParams.delete("token");
    u.pathname = "/auth/extension-callback/success";
    window.location.replace(u.toString());
  });
})();
