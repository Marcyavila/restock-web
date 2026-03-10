/**
 * Content script: runs on getrestock.app. When the user is redirected to
 * /auth/extension-callback?token=..., we read the token, send it to the
 * extension background, and optionally navigate to a success state.
 */
(function () {
  const path = window.location.pathname;
  const isCallback = /\/auth\/extension-callback\/?$/i.test(path);
  if (!isCallback) return;

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (!token) return;

  chrome.runtime.sendMessage({ type: "AUTH_CALLBACK", token }, function () {
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    url.pathname = url.pathname.replace(/extension-callback\/?$/i, "extension-callback/success");
    window.location.replace(url.toString());
  });
})();
