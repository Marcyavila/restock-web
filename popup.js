let countdownInterval;
let newlyAddedTcin = null;
let inputHintTimeout = null;
let countdownSweptThisCycle = false;
/** Scroll position to restore in pocket after a scan-triggered re-render (set when scanComplete is received, used in renderProductList). */
let pocketScrollTopToRestore = null;
/** Last scroll event time; used to defer image loading while user is scrolling. */
let lastScrollTime = 0;
let scrollEndTimeout = null;
/** Parallax: one rAF per frame so we don't update transform 60+ times/sec during fast scroll. */
let _parallaxRaf = null;
let _parallaxScrollEl = null;
let _parallaxBgEl = null;
/** Throttle defer timer reschedule so we don't do clearTimeout+setTimeout on every scroll event. */
let _lastDeferSchedule = 0;
const _DEFER_SCHEDULE_THROTTLE_MS = 120;

/** Production Convex HTTP URL — users never see or set this. Replace with your deployment from Convex Dashboard → Settings → URL. */
const CONVEX_HTTP_URL = "https://vibrant-gopher-82.convex.site";

/** Language: default English; Spanish optional in settings. */
const TRANSLATIONS = {
  en: {
    ready: "Ready",
    startMonitoring: "Start monitoring",
    stopMonitoring: "Stop monitoring",
    trackedItems: "Tracked items",
    clearList: "Clear list",
    clearListAria: "Clear all tracked items",
    addProduct: "Add product",
    addItemToList: "Add item to list",
    addToListItem: "Add to list",
    addA: "Add a",
    ghostItem: "n item to monitor",
    ghostUrl: "Target URL",
    ghostTcin: "n 8-digit TCIN / SKU",
    ghostUpc: "12-digit UPC",
    addAtLeastOne: "Add at least one item above to start monitoring",
    startOrStop: "Start or stop monitoring",
    settings: "Settings",
    openSettings: "Open settings",
    closeSettings: "Close settings",
    done: "Done",
    language: "Language",
    languageDesc: "English or Spanish.",
    locationCheckInterval: "Location & check interval",
    locationCheckDesc: "We use your ZIP to check stock near you. Set how often we check (in seconds).",
    zipCode: "ZIP code",
    checkEvery: "Check every (seconds)",
    checkIntervalAria: "Check interval in seconds",
    backgroundTheme: "Background theme",
    backgroundThemeDesc: "Pick a look for the popup background.",
    classic: "Classic",
    velvet: "Velvet",
    pulse: "Pulse",
    depth: "Depth",
    peek: "Peek",
    developedBy: "Developed by @marcy — Support: ",
    venmo: "Venmo",
    checking: "Checking",
    scanning: "Scanning",
    dismiss: "Dismiss",
    monitorStatus: "Monitor status",
    running: "Running",
    noItemsYet: "No items yet. Add a Target product link, TCIN/SKU, or UPC above to start monitoring stock.",
    noItemsMatch: "No items match your search. Try a different term.",
    resume: "Resume",
    pause: "Pause",
    searchItems: "Search items...",
    searchItemsAria: "Search tracked items",
    exportCsv: "Export CSV",
    importCsv: "Import CSV",
    exportCsvAria: "Export list as CSV",
    importCsvAria: "Import TCINs from CSV",
    status: "Status",
    assets: "Assets",
    nextScanIn: "Next scan in",
    ping: "Ping",
    name: "Name",
    actions: "Actions",
    paused: "Paused",
    notLive: "Not live",
    productUnavailable: "Unavailable (re-add from product page)",
    outOfStock: "Out of stock",
    inStock: "In stock",
    notMonitored: "Not monitored",
    remove: "Remove",
    reloadItem: "Reload item",
    searchOnTarget: "Search on Target",
    itemRemoved: "Item removed",
    itemAdded: "Item added",
    itemsAdded: "Added {n} items",
    listCleared: "List cleared",
    scanComplete: "Scan complete",
    exportedCsv: "Exported CSV",
    noRowsInFile: "No rows in file",
    noValidTcins: "No valid TCINs in file",
    importedCount: "Imported {n} item(s)",
    itemPaused: "Item paused",
    itemResumed: "Item resumed",
    resumedScanningItem: "Resumed scanning this item only",
    disabledHint: "Add at least one item above to start monitoring",
    controlPanel: "Control panel",
    resultsGallery: "Results gallery",
    globalStatus: "Global status",
    openInWindow: "Open in separate window",
    nextScanInS: "Next scan in {n}s",
    account: "Account",
    accountDesc: "Log in to sync your plan and unlock Pro.",
    loginGateTitle: "Log in to use ReStock Pro",
    loginGateSub: "Sign in or create an account",
    continueWithGoogle: "Continue with Google",
    continueWithDiscord: "Continue with Discord",
    signInWithEmail: "Sign in with email",
    login: "Log in",
    logOut: "Log out",
    planFree: "Free",
    planPro: "Pro",
    upgradeHint: "Upgrade to Pro for more items."
  },
  es: {
    ready: "Listo",
    startMonitoring: "Iniciar monitoreo",
    stopMonitoring: "Detener monitoreo",
    trackedItems: "Productos en seguimiento",
    clearList: "Vaciar lista",
    clearListAria: "Vaciar todos los productos",
    addProduct: "Agregar producto",
    addItemToList: "Agregar producto a la lista",
    addToListItem: "Agregar a la lista",
    addA: "Agrega un",
    ghostItem: " producto a monitorear",
    ghostUrl: " enlace de Target",
    ghostTcin: " TCIN / SKU de 8 dígitos",
    ghostUpc: " UPC de 12 dígitos",
    addAtLeastOne: "Agrega al menos un producto arriba para iniciar el monitoreo",
    startOrStop: "Iniciar o detener monitoreo",
    settings: "Configuración",
    openSettings: "Abrir configuración",
    closeSettings: "Cerrar configuración",
    done: "Listo",
    language: "Idioma",
    languageDesc: "Inglés o Español.",
    locationCheckInterval: "Ubicación e intervalo de verificación",
    locationCheckDesc: "Usamos tu código postal para verificar el inventario cerca de ti. Ajusta la frecuencia de revisión (en segundos).",
    zipCode: "Código postal",
    checkEvery: "Verificar cada (segundos)",
    checkIntervalAria: "Intervalo de verificación en segundos",
    backgroundTheme: "Tema de fondo",
    backgroundThemeDesc: "Elige un diseño para el fondo de la ventana.",
    classic: "Clásico",
    velvet: "Terciopelo",
    pulse: "Pulso",
    depth: "Profundidad",
    peek: "Peek",
    developedBy: "Desarrollado por @marcy — Apoyar: ",
    venmo: "Venmo",
    checking: "Verificando",
    scanning: "Escaneando",
    dismiss: "Descartar",
    monitorStatus: "Estado del monitoreo",
    running: "Activo",
    noItemsYet: "No hay productos todavía. Agrega un enlace de Target, TCIN/SKU o UPC arriba para iniciar el monitoreo.",
    noItemsMatch: "Ningún producto coincide con tu búsqueda. Prueba con otro término.",
    resume: "Reanudar",
    pause: "Pausar",
    searchItems: "Buscar productos...",
    searchItemsAria: "Buscar productos en seguimiento",
    exportCsv: "Exportar CSV",
    importCsv: "Importar CSV",
    exportCsvAria: "Exportar lista como CSV",
    importCsvAria: "Importar TCINs desde CSV",
    status: "Estado",
    assets: "Productos",
    nextScanIn: "Próximo escaneo en",
    ping: "Ping",
    name: "Nombre",
    actions: "Acciones",
    paused: "En pausa",
    notLive: "Fuera de línea",
    productUnavailable: "No disponible (agrégalo de nuevo desde la página)",
    outOfStock: "Agotado",
    inStock: "En stock",
    notMonitored: "Sin seguimiento",
    remove: "Eliminar",
    reloadItem: "Recargar producto",
    searchOnTarget: "Buscar en Target",
    itemRemoved: "Producto eliminado",
    itemAdded: "Producto agregado",
    itemsAdded: "Se agregaron {n} productos",
    listCleared: "Lista vaciada",
    scanComplete: "Escaneo finalizado",
    exportedCsv: "CSV exportado",
    noRowsInFile: "El archivo está vacío",
    noValidTcins: "No se encontraron TCINs válidos en el archivo",
    importedCount: "Se importaron {n} producto(s)",
    itemPaused: "Producto en pausa",
    itemResumed: "Producto reanudado",
    resumedScanningItem: "Escaneo reanudado solo para este producto",
    disabledHint: "Agrega al menos un producto arriba para iniciar el monitoreo",
    controlPanel: "Panel de control",
    resultsGallery: "Galería de resultados",
    globalStatus: "Estado global",
    openInWindow: "Abrir en ventana separada",
    nextScanInS: "Próximo escaneo en {n}s",
    account: "Cuenta",
    accountDesc: "Inicia sesión para sincronizar tu plan y desbloquear Pro.",
    loginGateTitle: "Inicia sesión para usar ReStock Pro",
    loginGateSub: "Inicia sesión o crea una cuenta",
    continueWithGoogle: "Continuar con Google",
    continueWithDiscord: "Continuar con Discord",
    signInWithEmail: "Iniciar sesión con correo",
    login: "Iniciar sesión",
    logOut: "Cerrar sesión",
    planFree: "Gratis",
    planPro: "Pro",
    upgradeHint: "Actualiza a Pro para más productos."
  }
};

let userPlan = null;

async function fetchUserPlan() {
  const { authToken } = await chrome.storage.local.get(["authToken"]);
  if (!authToken) {
    userPlan = null;
    return null;
  }
  const base = (typeof CONVEX_HTTP_URL !== "undefined" ? CONVEX_HTTP_URL : "").replace(/\/$/, "");
  if (!base) {
    userPlan = null;
    return null;
  }
  const url = base + "/getPlan";
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${authToken}` } });
    if (!res.ok) {
      if (res.status === 401) chrome.storage.local.remove("authToken");
      userPlan = null;
      return null;
    }
    const data = await res.json();
    userPlan = data;
    return data;
  } catch (_) {
    userPlan = null;
    return null;
  }
}

function updateAccountUI() {
  const statusEl = document.getElementById("accountStatus");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  if (!statusEl || !loginBtn || !logoutBtn) return;
  if (userPlan) {
    statusEl.textContent = (userPlan.plan === "pro" ? t("planPro") : t("planFree")) + (userPlan.email ? " · " + userPlan.email : "");
    loginBtn.style.display = "none";
    logoutBtn.style.display = "block";
  } else {
    statusEl.textContent = t("accountDesc");
    loginBtn.style.display = "block";
    logoutBtn.style.display = "none";
  }
}

let currentLocale = "en";
function t(key, replacements) {
  const str = TRANSLATIONS[currentLocale]?.[key] ?? TRANSLATIONS.en[key] ?? key;
  if (replacements && typeof replacements === "object") {
    return str.replace(/\{(\w+)\}/g, (_, k) => (replacements[k] != null ? String(replacements[k]) : ""));
  }
  return str;
}
function getStatusCheckingDots() {
  return `<span class="status-checking-dots" aria-label="${t("checking")}"><span class="status-dot"></span><span class="status-dot"></span><span class="status-dot"></span></span>`;
}

function applyLocale(locale) {
  currentLocale = locale === "es" ? "es" : "en";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    if (key) el.setAttribute("aria-label", t(key));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (key) el.setAttribute("title", t(key));
  });
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    const lang = btn.getAttribute("data-lang");
    const active = lang === currentLocale;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
  const toggleBtn = document.getElementById("toggleMonitoring");
  if (toggleBtn && toggleBtn.textContent) {
    const isRunning = toggleBtn.classList.contains("running");
    toggleBtn.textContent = isRunning ? t("stopMonitoring") : t("startMonitoring");
  }
}

/** Update all JS-built translated strings (no data-i18n). Call after applyLocale when language changes. state optional: { isRunning } for pulse status. */
function refreshDynamicTranslations(state) {
  if (document.body.classList.contains("standalone-mode")) {
    const pulseTotal = document.getElementById("pulseTotal");
    const pulseStatus = document.getElementById("pulseStatus");
    const pulseNextScan = document.getElementById("pulseNextScan");
    if (pulseTotal) {
      const lbl = pulseTotal.querySelector(".pulse-pill-label");
      if (lbl) lbl.textContent = t("assets");
    }
    if (pulseStatus) {
      const lbl = pulseStatus.querySelector(".pulse-pill-label");
      if (lbl) lbl.textContent = t("status");
      const val = pulseStatus.querySelector(".pulse-pill-value");
      if (val) val.textContent = (state && state.isRunning) || pulseStatus.classList.contains("is-live") ? t("running") : t("ready");
    }
    if (pulseNextScan) {
      const lbl = pulseNextScan.querySelector(".pulse-pill-label");
      if (lbl) lbl.textContent = t("nextScanIn");
    }
    const pulsePing = document.getElementById("pulsePing");
    if (pulsePing) {
      const lbl = pulsePing.querySelector(".pulse-pill-label");
      if (lbl) lbl.textContent = t("ping");
    }
    const dashboardSearch = document.getElementById("dashboardSearch");
    if (dashboardSearch) {
      dashboardSearch.placeholder = t("searchItems");
      dashboardSearch.setAttribute("aria-label", t("searchItemsAria"));
    }
    const exportCsvBtn = document.getElementById("exportCsvBtn");
    if (exportCsvBtn) {
      exportCsvBtn.textContent = t("exportCsv");
      exportCsvBtn.setAttribute("aria-label", t("exportCsvAria"));
    }
    const importCsvBtn = document.getElementById("importCsvBtn");
    if (importCsvBtn) {
      importCsvBtn.textContent = t("importCsv");
      importCsvBtn.setAttribute("aria-label", t("importCsvAria"));
    }
    const tableHeader = document.querySelector(".dashboard-table-header");
    if (tableHeader) {
      const nameTh = tableHeader.querySelector(".dth-name");
      const statusTh = tableHeader.querySelector(".dth-status");
      const actionsTh = tableHeader.querySelector(".dth-actions");
      if (nameTh) nameTh.textContent = t("name");
      if (statusTh) statusTh.textContent = t("status");
      if (actionsTh) actionsTh.textContent = t("actions");
    }
    const sidebar = document.querySelector(".dashboard-sidebar");
    if (sidebar) sidebar.setAttribute("aria-label", t("controlPanel"));
    const canvas = document.querySelector(".dashboard-canvas");
    if (canvas) canvas.setAttribute("aria-label", t("resultsGallery"));
    const pulseHeaderEl = document.querySelector(".pulse-header");
    if (pulseHeaderEl) pulseHeaderEl.setAttribute("aria-label", t("globalStatus"));
  }
}

/** Reload icon: circular arrow (stroke, inherits color). */
const RELOAD_ICON_SVG = '<svg class="reload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>';


/** Affiliate: one link for all products; u= passes destination so we get referral credit. */
const AFFILIATE_BASE = "https://goto.target.com/jRr2b6";
function getAffiliateProductUrl(tcin) {
  const dest = `https://www.target.com/p/-/A-${tcin}`;
  return AFFILIATE_BASE + "?u=" + encodeURIComponent(dest);
}
function getAffiliateSearchUrl(searchTerm) {
  const dest = `https://www.target.com/s?searchTerm=${encodeURIComponent(searchTerm)}`;
  return AFFILIATE_BASE + "?u=" + encodeURIComponent(dest);
}

function hydrateDeferredImages() {
  document.querySelectorAll("img[data-defer-src]").forEach((img) => {
    const src = img.getAttribute("data-defer-src");
    if (src) {
      img.src = src;
      img.removeAttribute("data-defer-src");
      setImagePlaceholderOnError(img);
    }
  });
}

function onScrollForDefer() {
  lastScrollTime = Date.now();
  const now = lastScrollTime;
  if (now - _lastDeferSchedule >= _DEFER_SCHEDULE_THROTTLE_MS || !scrollEndTimeout) {
    _lastDeferSchedule = now;
    if (scrollEndTimeout) clearTimeout(scrollEndTimeout);
    scrollEndTimeout = setTimeout(() => {
      hydrateDeferredImages();
      scrollEndTimeout = null;
    }, 180);
  }
}

function _tickParallax() {
  _parallaxRaf = null;
  if (_parallaxScrollEl && _parallaxBgEl) {
    const y = _parallaxScrollEl.scrollTop * 0.22;
    _parallaxBgEl.style.transform = `translate3d(0, ${-y}px, 0)`;
  }
}

function runScanSweep() {
  const listEl = document.getElementById("itemStatuses");
  if (!listEl || !listEl.children.length) return;
  listEl.classList.remove("scan-sweep");
  void listEl.offsetWidth;
  listEl.classList.add("scan-sweep");
  setTimeout(() => listEl.classList.remove("scan-sweep"), 900);
}

function showError(msg) {
  const el = document.getElementById("errorBanner");
  if (!el) return;
  const msgEl = el.querySelector(".error-banner-message");
  if (msg) {
    if (msgEl) msgEl.textContent = msg;
    el.classList.add("is-visible");
  } else {
    if (msgEl) msgEl.textContent = "";
    el.classList.remove("is-visible");
  }
}

function showInputHint(msg, type = "") {
  const el = document.getElementById("inputHint");
  if (!el) return;
  if (inputHintTimeout) clearTimeout(inputHintTimeout);
  el.textContent = msg || "";
  el.className = "input-hint" + (type ? " " + type : "");
  if (msg) {
    inputHintTimeout = setTimeout(() => {
      el.textContent = "";
      el.className = "input-hint";
      inputHintTimeout = null;
    }, type === "error" ? 3500 : 2500);
  }
}

function initRotatingAddItemHint() {
  const input = document.getElementById("itemInput");
  const wrap = document.getElementById("itemInputWrap");
  const ghost = document.getElementById("itemInputGhost");
  const stripEl = document.getElementById("itemInputGhostStrip");
  const line1El = document.getElementById("itemInputGhostLine1");
  const line2El = document.getElementById("itemInputGhostLine2");
  if (!input || !wrap || !ghost || !stripEl || !line1El || !line2El) return;
  const nbsp = "\u00A0"; // non-breaking space so space after "Add a" doesn't collapse
  function getGhostSuggestions() {
    const a = [t("ghostItem"), nbsp + t("ghostUrl").trim(), t("ghostTcin"), nbsp + t("ghostUpc")];
    // In Spanish, use nbsp for leading space so it doesn’t get trimmed/collapsed (e.g. " TCIN / SKU...").
    if (currentLocale === "es") return a.map((s) => (s.charAt(0) === " " ? nbsp + s.slice(1) : s));
    return a;
  }
  const suggestions = getGhostSuggestions();
  const LINE_HEIGHT_EM = 1.25;
  const SLIDE_DURATION_MS = 400;
  const SLIDE_EASING = "cubic-bezier(0.33, 1, 0.68, 1)"; // ease-out: new text lands gently
  const PAUSE_BETWEEN_MS = 2800; // time each line is visible before next scrolls up
  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let idx = 0;
  let timer = null;
  function shouldShowGhost() {
    return input.value.trim() === "" && document.activeElement !== input;
  }
  function setGhostVisible(visible) {
    wrap.setAttribute("data-show-ghost", visible ? "true" : "false");
  }
  function render() {
    const s = getGhostSuggestions();
    line1El.textContent = s[idx % s.length];
    line2El.textContent = s[(idx + 1) % s.length];
    stripEl.style.transition = "none";
    stripEl.style.transform = "translateY(0)";
  }
  function next() {
    stripEl.style.transition = `transform ${SLIDE_DURATION_MS}ms ${SLIDE_EASING}`;
    stripEl.style.transform = `translateY(-${LINE_HEIGHT_EM}em)`;
    const onEnd = (e) => {
      if (e && e.propertyName && e.propertyName !== "transform") return;
      stripEl.removeEventListener("transitionend", onEnd);
      requestAnimationFrame(() => {
        stripEl.style.transition = "none";
        stripEl.style.transform = "translateY(0)";
        const s = getGhostSuggestions();
        line1El.textContent = line2El.textContent;
        idx = (idx + 1) % s.length;
        line2El.textContent = s[(idx + 1) % s.length];
      });
    };
    stripEl.addEventListener("transitionend", onEnd);
  }
  function start() {
    if (timer) clearInterval(timer);
    timer = null;
    render();
    setGhostVisible(shouldShowGhost());
    if (!prefersReducedMotion) {
      timer = setInterval(() => {
        if (!shouldShowGhost()) return;
        next();
      }, PAUSE_BETWEEN_MS);
    }
  }
  input.addEventListener("focus", () => setGhostVisible(false));
  input.addEventListener("blur", () => {
    setGhostVisible(shouldShowGhost());
    start();
  });
  input.addEventListener("input", () => setGhostVisible(shouldShowGhost()));
  start();
  window.__refreshGhostForLocale = function () { render(); };
}

function removeFirstTcin(arr, id) {
  const list = arr || [];
  const idx = list.indexOf(id);
  if (idx < 0) return list;
  return [...list.slice(0, idx), ...list.slice(idx + 1)];
}

function updateToggleButtonState(tcinsList) {
  const btn = document.getElementById("toggleMonitoring");
  const hint = document.getElementById("disabledHint");
  if (!btn) return;
  const empty = !(tcinsList || []).length;
  btn.disabled = empty;
  btn.title = empty ? t("addAtLeastOne") : t("startOrStop");
  if (hint) hint.style.display = empty ? "block" : "none";
}

function setBgStyle(value) {
    const wrapper = document.getElementById("mainWrapper");
    if (wrapper) wrapper.setAttribute("data-bg", value);
    document.querySelectorAll(".bg-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-bg") === value);
    });
    chrome.storage.local.set({ bgStyle: value });
  }

  function initBgLayers() {
    const layers = [
      { id: "bgClassic", count: 58, smallRatio: 0.35, backRatio: 0 },
      { id: "bgVelvet", count: 58, smallRatio: 0.35, backRatio: 0 },
      { id: "bgPulse", count: 58, smallRatio: 0.35, backRatio: 0 },
      { id: "bgDepth", count: 58, smallRatio: 0, backRatio: 0.45 },
      { id: "bgPeek", count: 58, smallRatio: 0.35, backRatio: 0 }
    ];
    layers.forEach(({ id, count, smallRatio, backRatio }) => {
      const el = document.getElementById(id);
      if (!el || el.children.length) return;
      for (let i = 0; i < count; i++) {
        const star = document.createElement("span");
        const isBack = backRatio > 0 && Math.random() < backRatio;
        star.className = isBack ? "star star--back" : (Math.random() < smallRatio ? "star star--small" : "star");
        star.style.left = Math.random() * 100 + "%";
        star.style.top = Math.random() * 100 + "%";
        star.style.animationDelay = (Math.random() * 3.5 - 3.5) + "s";
        el.appendChild(star);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
  var search = window.location.search || "";
  var params = new URLSearchParams(search);
  var hasStandaloneParam = search.indexOf("standalone=true") !== -1 || params.get("standalone") === "true" || params.get("standalone") === "1";
  if (hasStandaloneParam) {
    document.documentElement.classList.add("is-standalone", "standalone-window", "standalone-mode");
    document.body.classList.add("is-standalone", "standalone-window", "standalone-mode");
  }
  const { locale: storedLocale } = await chrome.storage.local.get(["locale"]);
  currentLocale = storedLocale === "es" ? "es" : "en";
  initBgLayers();

  const mainWrapper = document.getElementById("mainWrapper");
  const { authToken } = await chrome.storage.local.get(["authToken"]);
  function setLoggedIn(hasToken) {
    if (!mainWrapper) return;
    if (hasToken) mainWrapper.classList.add("logged-in");
    else mainWrapper.classList.remove("logged-in");
  }
  setLoggedIn(!!authToken);

  const AUTH_URL = "https://getrestock.app/auth?from_extension=1";
  function initLoginGate() {
    const gateTitle = document.querySelector(".login-gate-text");
    const gateSub = document.querySelector(".login-gate-sub");
    const btnGoogle = document.getElementById("loginGateGoogle");
    const btnDiscord = document.getElementById("loginGateDiscord");
    const btnEmail = document.getElementById("loginGateEmail");
    if (gateTitle) gateTitle.textContent = t("loginGateTitle");
    if (gateSub) gateSub.textContent = t("loginGateSub");
    [btnGoogle, btnDiscord, btnEmail].forEach((btn) => {
      if (!btn) return;
      if (btn === btnGoogle) btn.textContent = t("continueWithGoogle");
      else if (btn === btnDiscord) btn.textContent = t("continueWithDiscord");
      else if (btn === btnEmail) btn.textContent = t("signInWithEmail");
      btn.addEventListener("click", () => { chrome.tabs.create({ url: AUTH_URL }); });
    });
  }
  if (!authToken) initLoginGate();

  if (document.body.classList.contains("standalone-mode")) {
    const mainWrapper = document.getElementById("mainWrapper");
    const topBar = document.querySelector(".top-bar");
    const bottomBar = document.querySelector(".bottom-bar");
    const listHeaderRow = topBar && topBar.querySelector(".list-header-row");
    const itemStatuses = document.getElementById("itemStatuses");
    const settingsOverlay = document.getElementById("settingsOverlay");
    if (mainWrapper && topBar && bottomBar && itemStatuses) {
      if (listHeaderRow) listHeaderRow.parentNode.removeChild(listHeaderRow);
      itemStatuses.parentNode.removeChild(itemStatuses);
      const dashboardWrapper = document.createElement("div");
      dashboardWrapper.className = "dashboard-wrapper";
      dashboardWrapper.setAttribute("role", "main");
      const dashboardSidebar = document.createElement("aside");
      dashboardSidebar.className = "dashboard-sidebar";
      dashboardSidebar.setAttribute("aria-label", t("controlPanel"));
      topBar.parentNode.removeChild(topBar);
      bottomBar.parentNode.removeChild(bottomBar);
      dashboardSidebar.appendChild(topBar);
      dashboardSidebar.appendChild(bottomBar);
      const dashboardCanvas = document.createElement("div");
      dashboardCanvas.className = "dashboard-canvas";
      dashboardCanvas.setAttribute("aria-label", "Results gallery");
      const pulseHeader = document.createElement("div");
      pulseHeader.className = "pulse-header";
      pulseHeader.setAttribute("aria-label", t("globalStatus"));
      pulseHeader.setAttribute("draggable", "false");
      pulseHeader.innerHTML = `
        <span class="pulse-pill" id="pulseTotal"><span class="pulse-pill-label">${t("assets")}</span><span class="pulse-pill-value" id="pulseTotalValue">0</span></span>
        <span class="pulse-pill pulse-pill-live" id="pulseStatus"><span class="pulse-pill-label">${t("status")}</span><span class="pulse-status-value-wrap"><span class="pulse-pill-dot"></span><span class="pulse-pill-value" id="pulseStatusText">${t("ready")}</span></span></span>
        <span class="pulse-pill" id="pulseNextScan"><span class="pulse-pill-label">${t("nextScanIn")}</span><span class="pulse-pill-value" id="pulseNextScanValue" data-empty="true">—</span></span>
        <span class="pulse-pill" id="pulsePing"><span class="pulse-pill-label">${t("ping")}</span><span class="pulse-pill-value" id="pulsePingValue" data-empty="true">—</span></span>
      `;
      dashboardCanvas.appendChild(pulseHeader);
      if (listHeaderRow) dashboardCanvas.appendChild(listHeaderRow);
      const listToolbar = document.createElement("div");
      listToolbar.className = "dashboard-list-toolbar";
      listToolbar.innerHTML = `
        <input type="text" id="dashboardSearch" class="dashboard-search-input" placeholder="${t("searchItems")}" aria-label="${t("searchItemsAria")}">
        <div class="dashboard-toolbar-actions">
          <button type="button" id="exportCsvBtn" class="dashboard-btn dashboard-btn-secondary" aria-label="${t("exportCsvAria")}">${t("exportCsv")}</button>
          <button type="button" id="importCsvBtn" class="dashboard-btn dashboard-btn-secondary" aria-label="${t("importCsvAria")}">${t("importCsv")}</button>
          <input type="file" id="importCsvFile" accept=".csv,.restock" style="display:none" aria-hidden="true">
        </div>
      `;
      dashboardCanvas.appendChild(listToolbar);
      const tableWrap = document.createElement("div");
      tableWrap.className = "dashboard-table-wrap";
      const tableHeader = document.createElement("div");
      tableHeader.className = "dashboard-table-header";
      tableHeader.setAttribute("data-sort", "name");
      tableHeader.setAttribute("data-dir", "1");
      tableHeader.innerHTML = `
        <span class="dth dth-img" aria-hidden="true"></span>
        <span class="dth dth-name sortable" data-sort="name" role="button" tabindex="0">${t("name")}</span>
        <span class="dth dth-status sortable" data-sort="status" role="button" tabindex="0">${t("status")}</span>
        <span class="dth dth-actions">${t("actions")}</span>
      `;
      tableWrap.appendChild(tableHeader);
      tableWrap.appendChild(itemStatuses);
      dashboardCanvas.appendChild(tableWrap);
      const toastContainer = document.createElement("div");
      toastContainer.id = "toastContainer";
      toastContainer.className = "toast-container";
      toastContainer.setAttribute("aria-live", "polite");
      dashboardCanvas.appendChild(toastContainer);
      dashboardWrapper.appendChild(dashboardSidebar);
      dashboardWrapper.appendChild(dashboardCanvas);
      bottomBar.classList.add("dashboard-action-zone");
      /* countdown progress bar is already in popup.html inside #monitorContainer */
      const bgLayers = mainWrapper.querySelector(".bg-layers");
      const loginGate = document.getElementById("loginGate");
      while (mainWrapper.firstChild) mainWrapper.removeChild(mainWrapper.firstChild);
      if (bgLayers) mainWrapper.appendChild(bgLayers);
      if (loginGate) mainWrapper.appendChild(loginGate);
      mainWrapper.appendChild(dashboardWrapper);
      if (settingsOverlay) mainWrapper.appendChild(settingsOverlay);
    }
  }

  const data = await chrome.storage.local.get(["tcins", "interval", "isRunning", "lastCheckTime", "productDetails", "zipCode", "lastError", "bgStyle", "stockStatuses", "lastUpcResolution", "lastScanMs", "lastPingMs", "locale"]);
  const itemInput = document.getElementById("itemInput");
  const rawTcins = data.tcins || [];
  const tcins = rawTcins.filter(isValidListId);
  if (rawTcins.length !== tcins.length) {
    chrome.storage.local.set({ tcins }).catch(() => {});
  }
  const addItemBtn = document.getElementById("addItemBtn");
  const toggleBtn = document.getElementById("toggleMonitoring");

  const validBg = ["classic", "velvet", "pulse", "depth", "peek"].includes(data.bgStyle) ? data.bgStyle : "peek";
  setBgStyle(validBg);
  document.querySelectorAll(".bg-btn").forEach((btn) => {
    btn.addEventListener("click", () => setBgStyle(btn.getAttribute("data-bg")));
  });

  const settingsOverlay = document.getElementById("settingsOverlay");
  const settingsTrigger = document.getElementById("settingsTrigger");
  const settingsClose = document.getElementById("settingsClose");
  function openSettings() {
    if (settingsOverlay) {
      settingsOverlay.classList.add("is-open");
      settingsOverlay.setAttribute("aria-hidden", "false");
    }
  }
  function closeSettings() {
    if (settingsOverlay) {
      settingsOverlay.classList.remove("is-open");
      settingsOverlay.setAttribute("aria-hidden", "true");
    }
  }
  if (settingsTrigger) settingsTrigger.addEventListener("click", () => {
    openSettings();
    fetchUserPlan().then(updateAccountUI);
  });
  if (settingsClose) settingsClose.addEventListener("click", closeSettings);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && settingsOverlay?.classList.contains("is-open")) closeSettings();
  });
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  if (loginBtn) loginBtn.addEventListener("click", () => { chrome.tabs.create({ url: AUTH_URL }); });
  if (logoutBtn) logoutBtn.addEventListener("click", async () => {
    chrome.runtime.sendMessage({ action: "stop" });
    await chrome.storage.local.set({ isRunning: false });
    await chrome.storage.local.remove("authToken");
    userPlan = null;
    setLoggedIn(false);
    updateAccountUI();
    chrome.tabs.create({ url: "https://getrestock.app/auth/logout" });
  });

  fetchUserPlan().then(updateAccountUI);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.authToken) {
      const hasToken = !!changes.authToken.newValue;
      setLoggedIn(hasToken);
      if (hasToken) {
        fetchUserPlan().then(updateAccountUI);
      }
    }
  });

  const openWindowBtn = document.getElementById("window-button");
  if (openWindowBtn) {
    openWindowBtn.addEventListener("click", () => {
      const s = window.screen || {};
      const availW = s.availWidth ?? 1024;
      const availH = s.availHeight ?? 768;
      const availLeft = s.availLeft ?? 0;
      const availTop = s.availTop ?? 0;
      const width = Math.round(Math.min(1200, Math.max(900, availW * 0.7)));
      const height = Math.round(Math.min(900, Math.max(600, availH * 0.85)));
      const left = availLeft + Math.max(0, Math.round((availW - width) / 2));
      const top = availTop + Math.max(0, Math.round((availH - height) / 2));
      chrome.windows.create({
        url: chrome.runtime.getURL("popup.html?standalone=true"),
        type: "popup",
        width,
        height,
        left,
        top
      });
    });
  }

  const scrollArea = document.getElementById("scrollArea");
  const bgLayers = document.querySelector(".bg-layers");
  if (scrollArea && bgLayers) {
    scrollArea.addEventListener("scroll", () => {
      _parallaxScrollEl = scrollArea;
      _parallaxBgEl = bgLayers;
      if (!_parallaxRaf) _parallaxRaf = requestAnimationFrame(_tickParallax);
      onScrollForDefer();
    }, { passive: true });
  }
  if (document.body.classList.contains("standalone-mode")) {
    const listScroll = document.getElementById("itemStatuses");
    const bgLayersStandalone = document.querySelector(".bg-layers");
    if (listScroll && bgLayersStandalone) {
      listScroll.addEventListener("scroll", () => {
        _parallaxScrollEl = listScroll;
        _parallaxBgEl = bgLayersStandalone;
        if (!_parallaxRaf) _parallaxRaf = requestAnimationFrame(_tickParallax);
        onScrollForDefer();
      }, { passive: true });
    }
  }

  showError(data.lastError || null);
  function updateUpcDebug() {
    const el = document.getElementById("upcDebug");
    if (el) el.textContent = "";
  }
  updateUpcDebug();
  await renderProductList(tcins, data.productDetails || {}, data.stockStatuses || {});
  if (document.body.classList.contains("standalone-mode")) {
    updatePulseHeader(tcins.length, !!data.isRunning, data.lastScanMs, data.lastPingMs);
    requestAnimationFrame(() => {
      const container = document.getElementById("itemStatuses");
      if (container && !container.children.length) {
        renderProductList(tcins, data.productDetails || {}, data.stockStatuses || {});
        updatePulseHeader(tcins.length, !!data.isRunning, data.lastScanMs, data.lastPingMs);
      }
    });
  }
  document.getElementById("interval").value = data.interval ?? 3;
  document.getElementById("zipCode").value = data.zipCode || "90028";

  currentLocale = (data.locale === "es" ? "es" : "en");
  applyLocale(currentLocale);

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const lang = btn.getAttribute("data-lang");
      if (lang !== currentLocale) {
        currentLocale = lang === "es" ? "es" : "en";
        await chrome.storage.local.set({ locale: currentLocale });
        applyLocale(currentLocale);
        const d = await chrome.storage.local.get(["tcins", "productDetails", "stockStatuses", "isRunning", "lastCheckTime", "interval", "lastScanMs", "lastPingMs"]);
        const tcins = (d.tcins || []).filter(isValidListId);
        refreshDynamicTranslations({ isRunning: d.isRunning });
        await renderProductList(tcins, d.productDetails || {}, d.stockStatuses || {});
        updateToggleButtonState(tcins);
        if (typeof window.__refreshGhostForLocale === "function") window.__refreshGhostForLocale();
        const statusEl = document.getElementById("status");
        const countdownEl = document.getElementById("countdown");
        if (statusEl) statusEl.innerHTML = d.isRunning ? '<span class="dot dot-checking"></span> ' + t("running") : '<span class="dot dot-ready"></span> ' + t("ready");
        if (countdownEl && !d.isRunning) countdownEl.textContent = "—";
        if (document.body.classList.contains("standalone-mode")) updatePulseHeader(tcins.length, !!d.isRunning, d.lastScanMs, d.lastPingMs);
      }
    });
  });

  updateToggleButtonState(tcins);

  itemInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
    if (e.key === "Escape") { e.target.blur(); itemInput.value = ""; showInputHint(""); }
  });
  initRotatingAddItemHint();

  if (data.isRunning) {
    updateSystemStatus(true);
    startCountdown(data.interval || 3, data.lastCheckTime);
    toggleBtn.textContent = t("stopMonitoring");
    toggleBtn.classList.add("running");
  } else {
    const countdownEl = document.getElementById("countdown");
    if (countdownEl) countdownEl.textContent = "—";
    const fillEl = document.getElementById("countdownProgressFill");
    if (fillEl) fillEl.style.width = "0%";
    if (typeof updatePulseNextScan === "function") updatePulseNextScan("—");
  }

  const SCAN_ANIMATION_MIN_MS = 800;
  const SCAN_DOTS_BEFORE_SWEEP_MS = 80;

  function makeBeepWavDataUrl(freq, sec, sampleRate = 44100) {
    const numSamples = Math.floor(sec * sampleRate);
    const buf = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buf);
    const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, numSamples * 2, true);
    const omega = (2 * Math.PI * freq) / sampleRate;
    for (let i = 0; i < numSamples; i++) {
      const s = 0.2 * Math.sin(omega * i) * Math.exp(-i / (sampleRate * 0.1));
      view.setInt16(44 + i * 2, s * 32767, true);
    }
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    return "data:audio/wav;base64," + b64;
  }

  let alertSoundUnlocked = false;
  let alertAudioEl = null;
  const BEEP_URL = makeBeepWavDataUrl(523.25, 0.15);
  const BEEP2_URL = makeBeepWavDataUrl(659.25, 0.2);

  function unlockAlertSound() {
    if (alertSoundUnlocked) return;
    try {
      alertAudioEl = new Audio(BEEP_URL);
      alertAudioEl.volume = 0;
      alertSoundUnlocked = true;
      alertAudioEl.play().catch(() => {});
    } catch (_) {}
  }
  document.addEventListener("click", unlockAlertSound, { once: true });
  document.addEventListener("keydown", unlockAlertSound, { once: true });

  function playAlertSound() {
    try {
      if (alertSoundUnlocked && alertAudioEl) {
        alertAudioEl.src = BEEP_URL;
        alertAudioEl.currentTime = 0;
        alertAudioEl.volume = 0.4;
        alertAudioEl.play().catch(() => {});
        setTimeout(() => {
          try {
            alertAudioEl.src = BEEP2_URL;
            alertAudioEl.currentTime = 0;
            alertAudioEl.play().catch(() => {});
          } catch (_) {}
        }, 180);
        return;
      }
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const play = () => {
        playTone(523.25, 0, 0.15);
        playTone(659.25, 0.18, 0.2);
      };
      if (ctx.state === "suspended") ctx.resume().then(play).catch(() => {});
      else play();
    } catch (_) {}
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "scanComplete") {
      if (!document.body.classList.contains("standalone-mode")) {
        const el = document.getElementById("scrollArea");
        if (el && el.scrollTop > 0) pocketScrollTopToRestore = el.scrollTop;
      }
      setAddButtonLoading(false);
      const countdownEl = document.getElementById("countdown");
      if (countdownEl) countdownEl.innerHTML = t("scanning") + " <span class=\"scan-dots\"><span>.</span><span>.</span><span>.</span></span>";
      if (document.body.classList.contains("standalone-mode")) showToast(t("scanComplete"), "success");
      if (typeof updateUpcDebug === "function") updateUpcDebug();
      setTimeout(() => {
        chrome.storage.local.get(["interval", "lastCheckTime", "productDetails", "tcins", "lastError", "isRunning", "stockStatuses", "lastScanMs"], async (latest) => {
          showError(latest.lastError || null);
          await renderProductList(latest.tcins || [], latest.productDetails || {}, latest.stockStatuses || {});
          updateToggleButtonState(latest.tcins || []);
          if (document.body.classList.contains("standalone-mode")) {
            updatePulseHeader((latest.tcins || []).length, !!latest.isRunning, latest.lastScanMs, latest.lastPingMs);
          }
          if (typeof updateUpcDebug === "function") updateUpcDebug();
          runScanSweep();
          setTimeout(() => {
            if (latest.isRunning) {
              countdownSweptThisCycle = false;
              startCountdown(latest.interval || 3, latest.lastCheckTime);
            } else {
              clearInterval(countdownInterval);
              const cd = document.getElementById("countdown");
              if (cd) cd.textContent = "—";
              if (typeof updatePulseNextScan === "function") updatePulseNextScan("—");
              document.getElementById("status").innerHTML = '<span class="dot dot-ready"></span> ' + t("ready");
              document.getElementById("monitorContainer")?.classList.remove("monitor-card--active");
              const fill = document.getElementById("countdownProgressFill");
              if (fill) fill.style.width = "0%";
              const toggleBtn = document.getElementById("toggleMonitoring");
              if (toggleBtn) {
                toggleBtn.textContent = t("startMonitoring");
                toggleBtn.classList.remove("running");
              }
            }
          }, Math.max(0, SCAN_ANIMATION_MIN_MS - SCAN_DOTS_BEFORE_SWEEP_MS));
        });
      }, SCAN_DOTS_BEFORE_SWEEP_MS);
    }
  });

  const setAddButtonLoading = (loading) => {
    const btn = document.getElementById("addItemBtn");
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? "…" : "+";
    btn.setAttribute("aria-busy", loading ? "true" : "false");
  };

  /** Parse one token (URL, 8–12 digit TCIN, or 12-digit UPC) into an itemId or null.
   * For Target PDP URLs, prefers the variant TCIN from ?preselect= so we track the exact size/color (e.g. Beige XS), not the parent A-number. */
  function parseOneToken(token) {
    const t = token.trim();
    if (!t) return null;
    if (/target\.com.*\/p\//i.test(t) || /\/A-\d+/.test(t)) {
      const preselectMatch = t.match(/[?&]preselect=(\d{8})(?:&|#|$)/i);
      if (preselectMatch) return preselectMatch[1];
      const urlMatch = t.match(/A-(\d+)/);
      if (urlMatch) {
        const fromUrl = urlMatch[1];
        if (fromUrl.length >= 8 && fromUrl.length <= 12) return fromUrl;
        if (fromUrl.length > 12) return fromUrl.slice(0, 12);
        return fromUrl.padStart(8, "0").slice(0, 8);
      }
    }
    const digitsOnly = t.replace(/\D/g, "");
    if (digitsOnly.length >= 8 && digitsOnly.length <= 12) return digitsOnly;
    return null;
  }

  const handleAdd = async () => {
    unlockAlertSound();
    const val = itemInput.value.trim();
    const tokens = val.split(",").map((s) => s.trim()).filter(Boolean);
    const itemIds = [];
    for (const token of tokens) {
      const id = parseOneToken(token);
      if (id && id.length >= 8 && id.length <= 12 && /^\d+$/.test(id) && !itemIds.includes(id)) itemIds.push(id);
    }
    if (itemIds.length === 0) {
      itemInput.classList.add("shake");
      setTimeout(() => itemInput.classList.remove("shake"), 400);
      showInputHint("Enter one or more Target URLs, 8-digit TCINs/SKUs, or 12-digit UPCs, separated by commas.", "error");
      return;
    }

    const { tcins = [], productDetails = {} } = await chrome.storage.local.get(["tcins", "productDetails"]);
    const existing = (tcins || []).filter(isValidListId);
    const toAdd = itemIds.filter((id) => !existing.includes(id));
    if (userPlan && userPlan.plan === "free" && (existing.length + toAdd.length) > userPlan.itemLimit) {
      showInputHint(t("upgradeHint"), "error");
      return;
    }
    if (toAdd.length === 0) {
      showInputHint("Already in list", "success");
      const first = itemIds[0];
      const existingEl = document.querySelector(`[data-tcin="${first}"]`);
      if (existingEl) {
        existingEl.classList.remove("highlight-flash");
        void existingEl.offsetWidth;
        existingEl.classList.add("highlight-flash");
        existingEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      itemInput.value = "";
      itemInput.focus();
      return;
    }

    const updated = [...toAdd, ...existing];
    newlyAddedTcin = toAdd.length === 1 ? toAdd[0] : null;
    const updatedDetails = { ...productDetails };
    for (const id of toAdd) {
      if (id.length === 12) updatedDetails[id] = { name: `UPC ${id}`, image: "https://via.placeholder.com/100?text=UPC" };
    }
    await chrome.storage.local.set({ tcins: updated, productDetails: updatedDetails });
    itemInput.value = "";
    if (toAdd.some((id) => id.length === 12)) {
      showInputHint("UPC(s) added — resolving & monitoring on Target…", "success");
    } else {
      showInputHint("");
    }
    setAddButtonLoading(true);
    document.getElementById("monitorContainer")?.classList.add("monitor-card--active");
    document.getElementById("status").innerHTML = "<span class=\"dot dot-checking\"></span> " + t("checking") + "…";
    document.getElementById("countdown").innerHTML = t("scanning") + " <span class=\"scan-dots\"><span>.</span><span>.</span><span>.</span></span>";
    chrome.runtime.sendMessage({ action: "checkNow", tcins: updated });
    const statuses = (await new Promise(r => chrome.runtime.sendMessage({ action: "getStatuses" }, r)))?.statuses || {};
    await renderProductList(updated, data.productDetails || {}, statuses);
    updateToggleButtonState(updated);
    if (document.body.classList.contains("standalone-mode")) {
      showToast(toAdd.length === 1 ? t("itemAdded") : t("itemsAdded", { n: toAdd.length }), "success");
    }
    itemInput.focus();
  };

  const errorBannerClose = document.querySelector("#errorBanner .error-banner-close");
  if (errorBannerClose) {
    errorBannerClose.addEventListener("click", () => {
      showError(null);
      chrome.storage.local.set({ lastError: null });
    });
  }

  addItemBtn.addEventListener("click", handleAdd);
  toggleBtn.addEventListener("click", async () => {
    unlockAlertSound();
    const { isRunning } = await chrome.storage.local.get("isRunning");
    if (isRunning) {
      chrome.runtime.sendMessage({ action: "stop" });
      const { tcins: currentTcins = [] } = await chrome.storage.local.get("tcins");
      await chrome.storage.local.set({ isRunning: false, pausedTCINs: currentTcins });
      toggleBtn.textContent = t("startMonitoring");
      toggleBtn.classList.remove("running");
      updateSystemStatus(false);
      clearInterval(countdownInterval);
      document.getElementById("countdown").textContent = "—";
      if (typeof updatePulseNextScan === "function") updatePulseNextScan("—");
      if (document.body.classList.contains("standalone-mode")) {
        const d = await chrome.storage.local.get(["tcins", "productDetails", "stockStatuses"]);
        await renderProductList(d.tcins || [], d.productDetails || {}, d.stockStatuses || {});
      }
    } else {
      const interval = parseInt(document.getElementById("interval").value) || 3;
      await chrome.storage.local.set({ isRunning: true, interval, zipCode: document.getElementById("zipCode").value, lastCheckTime: Date.now(), pausedTCINs: [] });
      chrome.runtime.sendMessage({ action: "start", interval });
      toggleBtn.textContent = t("stopMonitoring");
      toggleBtn.classList.add("running");
      updateSystemStatus(true);
      startCountdown(interval);
    }
  });

  document.getElementById("interval").addEventListener("blur", async () => {
    let v = parseInt(document.getElementById("interval").value, 10);
    if (isNaN(v) || v < 1) v = 1;
    if (v > 300) v = 300;
    document.getElementById("interval").value = v;
    await chrome.storage.local.set({ interval: v });
  });
  document.getElementById("zipCode").addEventListener("blur", async () => {
    let z = (document.getElementById("zipCode").value || "").replace(/\D/g, "").slice(0, 5);
    if (z.length < 5) z = "90028";
    document.getElementById("zipCode").value = z;
    await chrome.storage.local.set({ zipCode: z });
  });

  document.getElementById("clearList").addEventListener("click", async () => {
    if (confirm("Clear all items? This cannot be undone.")) {
      await chrome.storage.local.set({ tcins: [], productDetails: {}, pausedTCINs: [] });
      chrome.runtime.sendMessage({ action: "clearStatuses" });
      showError(null);
      await renderProductList([], {}, {});
      updateToggleButtonState([]);
      document.getElementById("status").innerHTML = '<span class="dot dot-ready"></span> ' + t("ready");
      document.getElementById("countdown").textContent = "—";
      if (typeof updatePulseNextScan === "function") updatePulseNextScan("—");
      document.getElementById("monitorContainer")?.classList.remove("monitor-card--active");
      const fill = document.getElementById("countdownProgressFill");
      if (fill) fill.style.width = "0%";
      closeSettings();
      if (document.body.classList.contains("standalone-mode")) showToast(t("listCleared"), "info");
      itemInput.focus();
    }
  });

  /* Standalone dashboard: search, sort, export/import */
  const dashboardSearch = document.getElementById("dashboardSearch");
  if (dashboardSearch) {
    let searchDebounce;
    dashboardSearch.addEventListener("input", () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(async () => {
        const d = await chrome.storage.local.get(["tcins", "productDetails", "stockStatuses"]);
        await renderProductList(d.tcins || [], d.productDetails || {}, d.stockStatuses || {});
      }, 200);
    });
  }
  const tableHeader = document.querySelector(".dashboard-table-header");
  if (tableHeader) {
    tableHeader.addEventListener("click", (e) => {
      const sortable = e.target.closest(".sortable");
      if (!sortable) return;
      const sort = sortable.getAttribute("data-sort");
      const current = tableHeader.getAttribute("data-sort");
      let dir = parseInt(tableHeader.getAttribute("data-dir"), 10) || 1;
      if (sort === current) dir = -dir;
      else dir = 1;
      tableHeader.setAttribute("data-sort", sort);
      tableHeader.setAttribute("data-dir", String(dir));
      tableHeader.querySelectorAll(".sortable").forEach(s => {
        s.removeAttribute("data-dir");
        if (s.getAttribute("data-sort") === tableHeader.getAttribute("data-sort")) s.setAttribute("data-dir", dir === 1 ? "↑" : "↓");
      });
      chrome.storage.local.get(["tcins", "productDetails", "stockStatuses"], async (d) => {
        await renderProductList(d.tcins || [], d.productDetails || {}, d.stockStatuses || {});
      });
    });
    tableHeader.querySelectorAll(".sortable").forEach(s => {
      if (s.getAttribute("data-sort") === "name") s.setAttribute("data-dir", "↑");
    });
  }
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", async () => {
      const d = await chrome.storage.local.get(["tcins", "productDetails", "stockStatuses"]);
      const tcins = d.tcins || [];
      const details = d.productDetails || {};
      const statuses = d.stockStatuses || {};
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const dateStr = `${y}.${m}.${day}`;
      const filename = `${dateStr}-RestockApp.csv`;
      const meta = [`# author: getrestock.app`, `# exported: ${now.toISOString().slice(0, 19).replace("T", " ")}`];
      const rows = [["TCIN", "Name", "Status"]];
      const isPlaceholderName = (n) => /^Item\s*\(?\d{8,12}\)?\s*$/i.test((n || "").trim());
      tcins.forEach(t => {
        const rawName = (details[t] && details[t].name) ? details[t].name : `Item ${t}`;
        const name = rawName.replace(/"/g, '""');
        let status = statuses[t] === "gone" ? t("productUnavailable") : statuses[t] === "not_live" ? t("notLive") : statuses[t] === true ? t("outOfStock") : t("inStock");
        if (status === t("outOfStock") && isPlaceholderName(rawName)) status = t("notLive");
        rows.push([t, `"${name}"`, status]);
      });
      const csv = meta.join("\n") + "\n" + rows.map(r => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 500);
      showToast(t("exportedCsv"), "success");
    });
  }
  const importCsvBtn = document.getElementById("importCsvBtn");
  const importCsvFile = document.getElementById("importCsvFile");
  if (importCsvBtn && importCsvFile) {
    importCsvBtn.addEventListener("click", () => importCsvFile.click());
    importCsvFile.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      let text = await file.text();
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      const lines = text.split(/\r\n|\r|\n/).map((s) => s.trim()).filter(Boolean);
      if (!lines.length) { showToast(t("noRowsInFile"), "error"); e.target.value = ""; return; }
      /** Parse a CSV line into fields (handles quoted fields with commas). */
      function parseCsvLine(line) {
        const out = [];
        let i = 0;
        const s = line.trim();
        while (i < s.length) {
          if (s[i] === '"') {
            let end = i + 1;
            let str = "";
            while (end < s.length) {
              if (s[end] === '"' && s[end + 1] === '"') { str += '"'; end += 2; continue; }
              if (s[end] === '"') { end++; break; }
              str += s[end++];
            }
            out.push(str);
            i = end;
            if (s[i] === ",") i++;
          } else {
            const comma = s.indexOf(",", i);
            const val = (comma === -1 ? s.slice(i) : s.slice(i, comma)).trim();
            out.push(val);
            i = comma === -1 ? s.length : comma + 1;
          }
        }
        return out;
      }
      const firstLine = parseCsvLine(lines[0])[0].toLowerCase();
      const hasHeader = /tcin/.test(firstLine) && !/^\d{8}$/.test(firstLine.replace(/\D/g, ""));
      const tcinsFromCsv = [];
      const namesFromCsv = {};
      for (let i = hasHeader ? 1 : 0; i < lines.length; i++) {
        const fields = parseCsvLine(lines[i]);
        const first = (fields[0] || "").trim();
        const tcin = first.replace(/\D/g, "");
        if (tcin.length >= 8 && tcin.length <= 12 && /^\d+$/.test(tcin)) {
          const id = tcin.length === 12 ? tcin : tcin.slice(0, 8);
          tcinsFromCsv.push(id);
          const name = (fields[1] || "").trim().replace(/""/g, '"');
          if (name) namesFromCsv[id] = name;
        }
      }
      if (!tcinsFromCsv.length) { showToast(t("noValidTcins"), "error"); e.target.value = ""; return; }
      const d = await chrome.storage.local.get(["tcins", "productDetails"]);
      const existing = (d.tcins || []).filter(isValidListId);
      const added = tcinsFromCsv.filter(t => !existing.includes(t));
      const merged = [...existing, ...added].filter(isValidListId);
      const productDetails = d.productDetails || {};
      for (const id of Object.keys(namesFromCsv)) {
        const name = namesFromCsv[id];
        if (name && merged.includes(id)) {
          const existingEntry = productDetails[id];
          productDetails[id] = existingEntry ? { ...existingEntry, name } : { name, image: "https://via.placeholder.com/100" };
        }
      }
      await chrome.storage.local.set({ tcins: merged, productDetails });
      const details = (await chrome.storage.local.get(["productDetails"])).productDetails || {};
      const statuses = (await new Promise(r => chrome.runtime.sendMessage({ action: "getStatuses" }, r)))?.statuses || {};
      await renderProductList(merged, details, statuses);
      updateToggleButtonState(merged);
      showToast(t("importedCount", { n: added.length }), "success");
      e.target.value = "";
    });
  }
});

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "status");
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast-visible"));
  setTimeout(() => {
    toast.classList.remove("toast-visible");
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function updatePulseHeader(totalAssets, isLive, lastScanMs, lastPingMs) {
  const totalEl = document.getElementById("pulseTotalValue");
  const pingEl = document.getElementById("pulsePingValue");
  const statusPill = document.getElementById("pulseStatus");
  if (totalEl) totalEl.textContent = totalAssets;
  if (pingEl) {
    const pingVal = !isLive ? "—" : (lastPingMs != null && lastPingMs >= 0 ? `${lastPingMs} ms` : "—");
    pingEl.textContent = pingVal;
    if (pingVal === "—") pingEl.dataset.empty = "true";
    else delete pingEl.dataset.empty;
  }
  if (!isLive && typeof updatePulseNextScan === "function") updatePulseNextScan("—");
  if (statusPill) {
    const valueEl = statusPill.querySelector(".pulse-pill-value");
    const dotEl = statusPill.querySelector(".pulse-pill-dot");
    if (valueEl) valueEl.textContent = isLive ? t("running") : t("ready");
    statusPill.classList.toggle("is-live", isLive);
    if (dotEl) dotEl.classList.toggle("breathing", isLive);
  }
}

function updatePulseNextScan(text) {
  if (!document.body.classList.contains("standalone-mode")) return;
  const el = document.getElementById("pulseNextScanValue");
  if (el) {
    if (text === "__dots__") {
      el.innerHTML = "<span class=\"scan-dots\" aria-hidden=\"true\"><span>.</span><span>.</span><span>.</span></span>";
      delete el.dataset.empty;
    } else {
      el.textContent = text;
      if (text === "—") el.dataset.empty = "true";
      else delete el.dataset.empty;
    }
  }
}

/** Data URL for placeholder when image is missing or item is not live (image icon). */
/** Placeholder image: Heroicons "photo" (MIT) on dark panel — https://heroicons.com */
const NOT_LIVE_PLACEHOLDER_IMG =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">' +
    '<rect width="100" height="100" fill="#151b26" rx="10"/>' +
    '<g transform="translate(50,50) scale(3.6) translate(-12,-12)" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M2.25 15.75L7.40901 10.591C8.28769 9.71231 9.71231 9.71231 10.591 10.591L15.75 15.75M14.25 14.25L15.659 12.841C16.5377 11.9623 17.9623 11.9623 18.841 12.841L21.75 15.75M3.75 19.5H20.25C21.0784 19.5 21.75 18.8284 21.75 18V6C21.75 5.17157 21.0784 4.5 20.25 4.5H3.75C2.92157 4.5 2.25 5.17157 2.25 6V18C2.25 18.8284 2.92157 19.5 3.75 19.5ZM14.25 8.25H14.2575V8.2575H14.25V8.25ZM14.625 8.25C14.625 8.45711 14.4571 8.625 14.25 8.625C14.0429 8.625 13.875 8.45711 13.875 8.25C13.875 8.04289 14.0429 7.875 14.25 7.875C14.4571 7.875 14.625 8.04289 14.625 8.25Z"/>' +
    '</g></svg>'
  );

/** If the image fails to load (e.g. 404), show the placeholder. Works with CSP (no inline onerror). */
function setImagePlaceholderOnError(img) {
  if (!img || !img.src) return;
  if (img.src === NOT_LIVE_PLACEHOLDER_IMG || img.src.startsWith("data:")) return;
  img.addEventListener("error", () => {
    img.src = NOT_LIVE_PLACEHOLDER_IMG;
  });
}

function decodeHtmlEntities(text) {
  if (!text || typeof text !== "string") return text;
  const el = document.createElement("div");
  el.innerHTML = text;
  return el.textContent || text;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function isUpc(id) {
  return typeof id === "string" && /^\d{12}$/.test(id);
}

function isValidListId(id) {
  const s = String(id).trim();
  return s.length >= 8 && s.length <= 12 && /^\d+$/.test(s);
}

/** Restart skeleton shimmer from the beginning for a row (standalone loading state). */
function restartSkeletonAnimation(rowEl) {
  if (!rowEl || !document.body.classList.contains("standalone-mode")) return;
  const skeletons = rowEl.querySelectorAll(".col-img.col-img--skeleton, .col-name .skeleton-line");
  skeletons.forEach((el) => el.classList.add("skeleton-restart"));
  requestAnimationFrame(() => {
    skeletons.forEach((el) => el.classList.remove("skeleton-restart"));
  });
}

async function renderProductList(tcins, details, statuses = {}) {
  const container = document.getElementById("itemStatuses");
  if (!container) return;
  tcins = (tcins || []).filter(isValidListId);
  const clearBtn = document.getElementById("clearList");
  if (clearBtn) clearBtn.style.display = tcins.length ? "" : "none";
  const isStandalone = document.body.classList.contains("standalone-mode");
  const deferImages = (Date.now() - lastScrollTime) < 200;

  if (isStandalone) {
    const header = document.querySelector(".dashboard-table-header");
    const sortBy = (header && header.getAttribute("data-sort")) || "name";
    const sortDir = (header && parseInt(header.getAttribute("data-dir"), 10)) || 1;
    const searchEl = document.getElementById("dashboardSearch");
    const filter = (searchEl && searchEl.value.trim().toLowerCase()) || "";
    const { pausedTCINs = [], isRunning = false } = await chrome.storage.local.get(["pausedTCINs", "isRunning"]);
    let list = [...tcins];
    if (filter) {
      list = list.filter(t => {
        const name = decodeHtmlEntities((details[t] || {}).name || "").toLowerCase();
        return name.includes(filter);
      });
    }
    const nameIsPlaceholderForSort = (n) => /^Item\s*\(?\d{8,12}\)?\s*$/i.test((n || "").trim());
    const getStatusOrder = t => (pausedTCINs.includes(t) ? 4 : statuses[t] === true && !nameIsPlaceholderForSort((details[t] || {}).name) ? 2 : statuses[t] === "not_live" || statuses[t] === "gone" || (statuses[t] === true && nameIsPlaceholderForSort((details[t] || {}).name)) || (statuses[t] === undefined && nameIsPlaceholderForSort((details[t] || {}).name)) ? 1 : isUpc(t) && statuses[t] === undefined ? 3 : 0);
    const getName = t => (details[t] && details[t].name) ? decodeHtmlEntities(details[t].name).toLowerCase() : "";
    list.sort((a, b) => {
      if (sortBy === "name") {
        const cmp = getName(a).localeCompare(getName(b));
        return sortDir === 1 ? cmp : -cmp;
      }
      const cmp = getStatusOrder(a) - getStatusOrder(b);
      return sortDir === 1 ? cmp : -cmp;
    });
    if (Object.keys(statuses).length === 0) {
      const res = await new Promise(r => chrome.runtime.sendMessage({ action: "getStatuses" }, r));
      statuses = res?.statuses || {};
    }
    const existingRows = container.querySelectorAll(".product-item.dashboard-row");
    const existingTcins = Array.from(existingRows).map((el) => el.getAttribute("data-tcin"));
    let listUnchanged = list.length === existingTcins.length && list.every((t, i) => t === existingTcins[i]);
    if (listUnchanged && container.querySelector(".product-item.loading")) listUnchanged = false;
    if (listUnchanged && list.length > 0) {
      const nameIsPlaceholder = nameIsPlaceholderForSort;
      existingRows.forEach((row, i) => {
        const tcin = list[i];
        const isLoading = !details[tcin] && !isUpc(tcin);
        const info = details[tcin] || {};
        const isOut = statuses[tcin] === true && !nameIsPlaceholder(info.name);
        const isNotLive = statuses[tcin] === "not_live" || statuses[tcin] === "gone" || (statuses[tcin] === true && nameIsPlaceholder(info.name)) || (statuses[tcin] === undefined && nameIsPlaceholder(info.name));
        const unmonitored = isUpc(tcin) && statuses[tcin] === undefined && !nameIsPlaceholder(info.name);
        const paused = pausedTCINs.includes(tcin);
        const notMonitored = paused || !isRunning;
        const statusClass = notMonitored ? "col-status status-paused" : unmonitored ? "col-status status-unmonitored" : isNotLive ? "col-status status-not-live" : isOut ? "col-status status-out" : "col-status status-in";
        const statusLabel = notMonitored ? t("paused") : unmonitored ? t("notMonitored") : statuses[tcin] === "gone" ? t("productUnavailable") : isNotLive ? t("notLive") : isOut ? t("outOfStock") : t("inStock");
        row.className = row.className.replace(/\s*product-item--paused\s*/g, " ").replace(/\s*loading\s*/g, " ").trim();
        if (notMonitored) row.classList.add("product-item--paused");
        if (isLoading) {
          row.classList.add("loading");
          const loadingNotLive = statuses[tcin] === "not_live" || statuses[tcin] === "gone" || (statuses[tcin] === undefined && !isUpc(tcin));
          const loadingStatusClass = !isRunning ? "col-status status-paused" : (loadingNotLive ? "col-status status-not-live" : (statuses[tcin] === true ? "col-status status-out" : "col-status status-paused"));
          const loadingStatusLabel = !isRunning ? t("paused") : (loadingNotLive ? (statuses[tcin] === "gone" ? t("productUnavailable") : t("notLive")) : statuses[tcin] === true ? t("outOfStock") : getStatusCheckingDots());
          row.innerHTML = `
          <div class="col-img-wrap"><div class="col-img col-img--skeleton"></div></div>
          <div class="col-name"><span class="skeleton-line short"></span></div>
          <span class="${loadingStatusClass}">${loadingStatusLabel}</span>
          <div class="col-actions"><button type="button" class="action-btn reload-btn" aria-label="${t("reloadItem")}">${RELOAD_ICON_SVG}</button><button type="button" class="action-btn remove-btn" aria-label="${t("remove")}">✕</button></div>`;
          restartSkeletonAnimation(row);
          const removeBtn = row.querySelector(".remove-btn");
          const reloadBtn = row.querySelector(".reload-btn");
          if (reloadBtn) {
            reloadBtn.addEventListener("click", async (e) => {
              e.stopPropagation();
              row.classList.add("loading");
              row.innerHTML = `
          <div class="col-img-wrap"><div class="col-img col-img--skeleton"></div></div>
          <div class="col-name"><span class="skeleton-line short"></span></div>
          <span class="col-status status-paused">${getStatusCheckingDots()}</span>
          <div class="col-actions"><button type="button" class="action-btn remove-btn" aria-label="${t("remove")}">✕</button></div>`;
              restartSkeletonAnimation(row);
              row.querySelector(".remove-btn")?.addEventListener("click", async (ev) => {
                ev.stopPropagation();
                const d = await chrome.storage.local.get(["tcins", "pausedTCINs"]);
                const filtered = removeFirstTcin(d.tcins, tcin);
                let paused = (d.pausedTCINs || []).filter(id => id !== tcin);
                await chrome.storage.local.set({ tcins: filtered, pausedTCINs: paused });
                const details2 = (await chrome.storage.local.get(["productDetails"])).productDetails || {};
                const statuses2 = (await new Promise(r => chrome.runtime.sendMessage({ action: "getStatuses" }, r)))?.statuses || {};
                await renderProductList(filtered, details2, statuses2);
                updateToggleButtonState(filtered);
                if (isStandalone) showToast(t("itemRemoved"), "info");
              });
              chrome.runtime.sendMessage({ action: "refreshItem", storageId: tcin });
            });
          }
          if (removeBtn) {
            removeBtn.addEventListener("click", async (e) => {
              e.stopPropagation();
              const d = await chrome.storage.local.get(["tcins", "pausedTCINs"]);
              const filtered = removeFirstTcin(d.tcins, tcin);
              let paused = (d.pausedTCINs || []).filter(id => id !== tcin);
              await chrome.storage.local.set({ tcins: filtered, pausedTCINs: paused });
              const details2 = (await chrome.storage.local.get(["productDetails"])).productDetails || {};
              const statuses2 = (await new Promise(r => chrome.runtime.sendMessage({ action: "getStatuses" }, r))).statuses || {};
              await renderProductList(filtered, details2, statuses2);
              updateToggleButtonState(filtered);
              if (isStandalone) showToast(t("itemRemoved"), "info");
            });
          }
        } else {
          const statusEl = row.querySelector(".col-status");
          if (statusEl) {
            statusEl.className = statusClass;
            statusEl.textContent = statusLabel;
          }
          const pauseBtn = row.querySelector(".pause-btn");
          if (pauseBtn) {
            const showPlay = !isRunning || paused;
            pauseBtn.textContent = showPlay ? "▶" : "⏸";
            pauseBtn.setAttribute("aria-label", !isRunning ? t("startMonitoring") : (paused ? t("resume") : t("pause")));
          }
        }
      });
      newlyAddedTcin = null;
      chrome.storage.local.get(["isRunning", "lastScanMs", "lastPingMs"], (d) => {
        updatePulseHeader(tcins.length, !!d.isRunning, d.lastScanMs, d.lastPingMs);
      });
      return;
    }
    container.innerHTML = "";
    if (!list.length) {
      const msg = filter ? t("noItemsMatch") : t("noItemsYet");
      container.innerHTML = `<div class="list-empty list-empty-dashboard">${msg}</div>`;
      chrome.storage.local.get(["lastScanMs", "lastPingMs"], (d) => {
        updatePulseHeader(tcins.length, false, d.lastScanMs, d.lastPingMs);
      });
      newlyAddedTcin = null;
      return;
    }
    const nameIsPlaceholder = nameIsPlaceholderForSort;
    for (const tcin of list) {
      const isLoading = !details[tcin] && !isUpc(tcin);
      const info = details[tcin] || { name: isUpc(tcin) ? `UPC ${tcin}` : `Item ${tcin}`, image: "https://via.placeholder.com/100" };
      const isOut = statuses[tcin] === true && !nameIsPlaceholder(info.name);
      const isNotLive = statuses[tcin] === "not_live" || statuses[tcin] === "gone" || (statuses[tcin] === true && nameIsPlaceholder(info.name)) || (statuses[tcin] === undefined && nameIsPlaceholder(info.name));
      const unmonitored = isUpc(tcin) && statuses[tcin] === undefined && !nameIsPlaceholder(info.name);
      const paused = pausedTCINs.includes(tcin);
      const notMonitored = paused || !isRunning;
      const displayName = escapeHtml(decodeHtmlEntities(info.name));
      const row = document.createElement("div");
      row.className = `product-item dashboard-row ${notMonitored ? "product-item--paused" : ""} ${tcin === newlyAddedTcin ? "highlight-flash" : ""} ${isLoading ? "loading" : ""}`;
      row.setAttribute("data-tcin", tcin);
      if (isLoading) {
        const loadingNotLive = statuses[tcin] === "not_live" || statuses[tcin] === "gone" || (statuses[tcin] === undefined && !isUpc(tcin));
        const loadingStatusClass = !isRunning ? "col-status status-paused" : (loadingNotLive ? "col-status status-not-live" : (statuses[tcin] === true ? "col-status status-out" : "col-status status-paused"));
        const loadingStatusLabel = !isRunning ? t("paused") : (loadingNotLive ? (statuses[tcin] === "gone" ? t("productUnavailable") : t("notLive")) : statuses[tcin] === true ? t("outOfStock") : getStatusCheckingDots());
        row.innerHTML = `
          <div class="col-img-wrap"><div class="col-img col-img--skeleton"></div></div>
          <div class="col-name"><span class="skeleton-line short"></span></div>
          <span class="${loadingStatusClass}">${loadingStatusLabel}</span>
          <div class="col-actions"><button type="button" class="action-btn remove-btn" aria-label="${t("remove")}">✕</button></div>`;
        restartSkeletonAnimation(row);
      } else {
        const statusClass = notMonitored ? "col-status status-paused" : unmonitored ? "col-status status-unmonitored" : isNotLive ? "col-status status-not-live" : isOut ? "col-status status-out" : "col-status status-in";
        const statusLabel = notMonitored ? t("paused") : unmonitored ? t("notMonitored") : statuses[tcin] === "gone" ? t("productUnavailable") : isNotLive ? t("notLive") : isOut ? t("outOfStock") : t("inStock");
        const targetTcin = isUpc(tcin) ? (info.tcin || null) : tcin;
        const searchTargetUrl = getAffiliateSearchUrl(tcin);
        const nameCell = targetTcin
          ? `<div class="col-name"><a href="${getAffiliateProductUrl(targetTcin)}" target="_blank" rel="noopener">${displayName}</a></div>`
          : (unmonitored ? `<div class="col-name">${displayName} <a href="${searchTargetUrl}" class="search-target-link" target="_blank" rel="noopener">${t("searchOnTarget")}</a></div>` : `<div class="col-name">${displayName}</div>`);
        const imgSrc = info.image || NOT_LIVE_PLACEHOLDER_IMG;
        const imgDisplaySrc = (deferImages && imgSrc && imgSrc !== NOT_LIVE_PLACEHOLDER_IMG) ? NOT_LIVE_PLACEHOLDER_IMG : imgSrc;
        const deferSrcAttr = (deferImages && imgSrc && imgSrc !== NOT_LIVE_PLACEHOLDER_IMG) ? ` data-defer-src="${String(imgSrc).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"` : "";
        const showPlay = !isRunning || paused;
        const playPauseLabel = !isRunning ? t("startMonitoring") : (paused ? t("resume") : t("pause"));
        const playPauseIcon = showPlay ? "▶" : "⏸";
        row.innerHTML = `
          <div class="col-img-wrap"><img src="${imgDisplaySrc}" class="col-img" alt="" draggable="false"${deferSrcAttr}></div>
          ${nameCell}
          <span class="${statusClass}">${statusLabel}</span>
          <div class="col-actions">
            <button type="button" class="action-btn reload-btn" aria-label="${t("reloadItem")}">${RELOAD_ICON_SVG}</button>
            <button type="button" class="action-btn pause-btn" aria-label="${playPauseLabel}">${playPauseIcon}</button>
            <button type="button" class="action-btn remove-btn" aria-label="${t("remove")}">✕</button>
          </div>`;
        setImagePlaceholderOnError(row.querySelector(".col-img-wrap img"));
      }
      const removeBtn = row.querySelector(".remove-btn");
      const reloadBtn = row.querySelector(".reload-btn");
      if (reloadBtn) {
        reloadBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          row.classList.add("loading");
          row.innerHTML = `
          <div class="col-img-wrap"><div class="col-img col-img--skeleton"></div></div>
          <div class="col-name"><span class="skeleton-line short"></span></div>
          <span class="col-status status-paused">${getStatusCheckingDots()}</span>
          <div class="col-actions"><button type="button" class="action-btn remove-btn" aria-label="${t("remove")}">✕</button></div>`;
          row.querySelector(".remove-btn")?.addEventListener("click", async (ev) => {
            ev.stopPropagation();
            const d = await chrome.storage.local.get(["tcins", "pausedTCINs"]);
            const filtered = removeFirstTcin(d.tcins, tcin);
            let paused = (d.pausedTCINs || []).filter(id => id !== tcin);
            await chrome.storage.local.set({ tcins: filtered, pausedTCINs: paused });
            const details2 = (await chrome.storage.local.get(["productDetails"])).productDetails || {};
            const statuses2 = (await new Promise(r => chrome.runtime.sendMessage({ action: "getStatuses" }, r)))?.statuses || {};
            await renderProductList(filtered, details2, statuses2);
            updateToggleButtonState(filtered);
            if (isStandalone) showToast(t("itemRemoved"), "info");
          });
          chrome.runtime.sendMessage({ action: "refreshItem", storageId: tcin });
        });
      }
      if (removeBtn) {
        removeBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const d = await chrome.storage.local.get(["tcins", "pausedTCINs"]);
          const filtered = removeFirstTcin(d.tcins, tcin);
          let paused = (d.pausedTCINs || []).filter(id => id !== tcin);
          await chrome.storage.local.set({ tcins: filtered, pausedTCINs: paused });
          const details2 = (await chrome.storage.local.get(["productDetails"])).productDetails || {};
          const statuses2 = (await new Promise(r => chrome.runtime.sendMessage({ action: "getStatuses" }, r))).statuses || {};
          await renderProductList(filtered, details2, statuses2);
          updateToggleButtonState(filtered);
          if (isStandalone) showToast(t("itemRemoved"), "info");
        });
      }
      const pauseBtn = row.querySelector(".pause-btn");
      if (pauseBtn) {
        pauseBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const d = await chrome.storage.local.get(["pausedTCINs", "isRunning", "tcins"]);
          const allTcins = d.tcins || tcins;
          if (!d.isRunning) {
            const interval = parseInt(document.getElementById("interval")?.value, 10) || 3;
            const zipCode = (document.getElementById("zipCode")?.value || "").replace(/\D/g, "").slice(0, 5) || "90028";
            const pausedExceptThis = allTcins.filter(id => id !== tcin);
            await chrome.storage.local.set({ isRunning: true, interval, zipCode, lastCheckTime: Date.now(), pausedTCINs: pausedExceptThis });
            chrome.runtime.sendMessage({ action: "start", interval });
            const toggleBtn = document.getElementById("toggleMonitoring");
            if (toggleBtn) {
              toggleBtn.textContent = t("stopMonitoring");
              toggleBtn.classList.add("running");
            }
            if (typeof updateSystemStatus === "function") updateSystemStatus(true);
            if (typeof startCountdown === "function") startCountdown(interval);
            const details2 = (await chrome.storage.local.get(["productDetails"])).productDetails || {};
            const statuses2 = (await new Promise(r => chrome.runtime.sendMessage({ action: "getStatuses" }, r))).statuses || {};
            await renderProductList(allTcins, details2, statuses2);
            showToast(t("resumedScanningItem"), "info");
            return;
          }
          let paused = d.pausedTCINs || [];
          const idx = paused.indexOf(tcin);
          if (idx >= 0) paused = paused.filter(id => id !== tcin);
          else paused = [...paused, tcin];
          await chrome.storage.local.set({ pausedTCINs: paused });
          const details2 = (await chrome.storage.local.get(["productDetails"])).productDetails || {};
          const statuses2 = (await new Promise(r => chrome.runtime.sendMessage({ action: "getStatuses" }, r))).statuses || {};
          await renderProductList(allTcins, details2, statuses2);
          showToast(paused.includes(tcin) ? t("itemPaused") : t("itemResumed"), "info");
        });
      }
      row.addEventListener("click", (e) => {
        if (e.target.closest(".action-btn") || e.target.closest(".search-target-link")) return;
        const productLink = row.querySelector(".col-name a[href^='https://goto.target.com/']");
        if (productLink && (e.target.closest(".col-img-wrap") || e.target.closest(".col-name"))) {
          e.preventDefault();
          e.stopPropagation();
          chrome.tabs.create({ url: productLink.href });
        }
      });
      container.appendChild(row);
    }
    newlyAddedTcin = null;
    chrome.storage.local.get(["isRunning", "lastScanMs", "lastPingMs"], (d) => {
      updatePulseHeader(tcins.length, !!d.isRunning, d.lastScanMs, d.lastPingMs);
    });
    return;
  }

  const scrollAreaPocket = container.closest(".scroll-area") || container.parentElement;
  const scrollTopBefore = scrollAreaPocket ? scrollAreaPocket.scrollTop : null;
  const existingPocketRows = container.querySelectorAll(".product-item");
  const existingPocketTcins = Array.from(existingPocketRows).map((el) => el.getAttribute("data-tcin"));
  let pocketListUnchanged = tcins.length === existingPocketTcins.length && tcins.every((t, i) => t === existingPocketTcins[i]);
  if (pocketListUnchanged && container.querySelector(".product-item.loading")) pocketListUnchanged = false;
  if (pocketListUnchanged && tcins.length > 0) {
    const { isRunning: pocketRunning = false, pausedTCINs: pocketPaused = [] } = await chrome.storage.local.get(["isRunning", "pausedTCINs"]);
    const nameIsPlaceholder = (n) => /^Item\s*\(?\d{8,12}\)?\s*$/i.test((n || "").trim());
    existingPocketRows.forEach((row, i) => {
      const tcin = tcins[i];
      const isLoading = !details[tcin] && !isUpc(tcin);
      const info = details[tcin] || {};
      const isOut = statuses[tcin] === true && !nameIsPlaceholder(info.name);
      const isNotLive = statuses[tcin] === "not_live" || statuses[tcin] === "gone" || (statuses[tcin] === true && nameIsPlaceholder(info.name)) || (statuses[tcin] === undefined && nameIsPlaceholder(info.name));
      const unmonitored = isUpc(tcin) && statuses[tcin] === undefined && !nameIsPlaceholder(info.name);
      const paused = pocketPaused.includes(tcin);
      const notMonitored = paused || !pocketRunning;
      const statusClass = `status-text status-ribbon ${notMonitored ? "status-paused" : unmonitored ? "status-unmonitored" : isNotLive ? "status-not-live" : isOut ? "status-out" : "status-in"}`;
      const statusLabel = notMonitored ? t("paused") : unmonitored ? t("notMonitored") : statuses[tcin] === "gone" ? t("productUnavailable") : isNotLive ? t("notLive") : isOut ? t("outOfStock") : t("inStock");
      row.className = row.className.replace(/\s*product-item--paused\s*/g, " ").replace(/\s*loading\s*/g, " ").trim();
      if (notMonitored) row.classList.add("product-item--paused");
      if (isLoading) {
        row.classList.add("loading");
        const loadingNotLive = statuses[tcin] === "not_live" || statuses[tcin] === "gone" || (statuses[tcin] === undefined && !isUpc(tcin));
        const loadingStatusClass = !pocketRunning ? "status-text status-ribbon status-paused" : (loadingNotLive ? "status-text status-ribbon status-not-live" : (statuses[tcin] === true ? "status-text status-ribbon status-out" : "status-text status-ribbon status-paused"));
        const loadingStatusLabel = !pocketRunning ? t("paused") : (loadingNotLive ? (statuses[tcin] === "gone" ? t("productUnavailable") : t("notLive")) : statuses[tcin] === true ? t("outOfStock") : getStatusCheckingDots());
        row.innerHTML = `
        <div class="skeleton-img"></div>
        <div class="product-info">
          <div class="skeleton-line short"></div>
          <span class="${loadingStatusClass}">${loadingStatusLabel}</span>
        </div>
        <span class="reload-btn-placeholder" aria-hidden="true"></span>
        <button type="button" class="remove-btn" aria-label="Remove item">✕</button>`;
        row.querySelector(".remove-btn").addEventListener("click", async (e) => {
          e.stopPropagation();
          e.preventDefault();
          const d = await chrome.storage.local.get("tcins");
          const filtered = removeFirstTcin(d.tcins, tcin);
          await chrome.storage.local.set({ tcins: filtered });
          row.remove();
          updateToggleButtonState(filtered);
        });
      } else {
        const statusEl = row.querySelector(".status-text.status-ribbon");
        if (statusEl) {
          statusEl.className = statusClass;
          statusEl.textContent = statusLabel;
        }
      }
    });
    newlyAddedTcin = null;
    return;
  }
  container.innerHTML = "";
  if (!tcins.length) {
    const msg = "No items yet.";
    container.innerHTML = `<div class="list-empty">${msg}</div>`;
    return;
  }

  if (Object.keys(statuses).length === 0) {
    const res = await new Promise(r => chrome.runtime.sendMessage({ action: "getStatuses" }, r));
    statuses = res?.statuses || {};
  }

  const { isRunning = false, pausedTCINs = [] } = await chrome.storage.local.get(["isRunning", "pausedTCINs"]);
  const nameIsPlaceholder = (n) => /^Item\s*\(?\d{8,12}\)?\s*$/i.test((n || "").trim());
  tcins.forEach(tcin => {
    const isLoading = !details[tcin] && !isUpc(tcin);
    const info = details[tcin] || { name: isUpc(tcin) ? `UPC ${tcin}` : `Item ${tcin}`, image: "https://via.placeholder.com/100" };
    const isOut = statuses[tcin] === true && !nameIsPlaceholder(info.name);
    const isNotLive = statuses[tcin] === "not_live" || statuses[tcin] === "gone" || (statuses[tcin] === true && nameIsPlaceholder(info.name)) || (statuses[tcin] === undefined && nameIsPlaceholder(info.name));
    const unmonitored = isUpc(tcin) && statuses[tcin] === undefined && !nameIsPlaceholder(info.name);
    const paused = pausedTCINs.includes(tcin);
    const notMonitored = paused || !isRunning;
    const displayName = escapeHtml(decodeHtmlEntities(info.name));
    const div = document.createElement("div");
    div.className = `product-item ${notMonitored ? "product-item--paused" : ""} ${tcin === newlyAddedTcin ? "highlight-flash" : ""} ${isLoading ? "loading" : ""}`;
    div.setAttribute("data-tcin", tcin);
    if (isLoading) {
      const loadingNotLive = statuses[tcin] === "not_live" || statuses[tcin] === "gone" || (statuses[tcin] === undefined && !isUpc(tcin));
      const loadingStatusClass = !isRunning ? "status-text status-ribbon status-paused" : (loadingNotLive ? "status-text status-ribbon status-not-live" : (statuses[tcin] === true ? "status-text status-ribbon status-out" : "status-text status-ribbon status-paused"));
      const loadingStatusLabel = !isRunning ? t("paused") : (loadingNotLive ? (statuses[tcin] === "gone" ? t("productUnavailable") : t("notLive")) : statuses[tcin] === true ? t("outOfStock") : getStatusCheckingDots());
      div.innerHTML = `
        <div class="skeleton-img"></div>
        <div class="product-info">
          <div class="skeleton-line short"></div>
          <span class="${loadingStatusClass}">${loadingStatusLabel}</span>
        </div>
        <span class="reload-btn-placeholder" aria-hidden="true"></span>
        <button type="button" class="remove-btn" aria-label="Remove item">✕</button>`;
      div.querySelector(".remove-btn").addEventListener("click", async (e) => { e.stopPropagation(); e.preventDefault(); const d = await chrome.storage.local.get("tcins"); const filtered = removeFirstTcin(d.tcins, tcin); await chrome.storage.local.set({ tcins: filtered }); div.remove(); updateToggleButtonState(filtered); });
    } else {
      const statusClass = `status-text status-ribbon ${notMonitored ? "status-paused" : unmonitored ? "status-unmonitored" : isNotLive ? "status-not-live" : isOut ? "status-out" : "status-in"}`;
      const statusLabel = notMonitored ? t("paused") : unmonitored ? t("notMonitored") : statuses[tcin] === "gone" ? t("productUnavailable") : isNotLive ? t("notLive") : isOut ? t("outOfStock") : t("inStock");
      const searchLink = unmonitored ? ` <a href="${getAffiliateSearchUrl(tcin)}" class="search-target-link" target="_blank" rel="noopener">${t("searchOnTarget")}</a>` : "";
      const imgSrc = info.image || NOT_LIVE_PLACEHOLDER_IMG;
      const imgDisplaySrc = (deferImages && imgSrc && imgSrc !== NOT_LIVE_PLACEHOLDER_IMG) ? NOT_LIVE_PLACEHOLDER_IMG : imgSrc;
      const deferSrcAttr = (deferImages && imgSrc && imgSrc !== NOT_LIVE_PLACEHOLDER_IMG) ? ` data-defer-src="${String(imgSrc).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"` : "";
      div.innerHTML = `
        <img src="${imgDisplaySrc}" class="product-img" alt="" draggable="false"${deferSrcAttr}>
        <div class="product-info">
          <div class="product-name">${displayName}${searchLink}</div>
          <span class="${statusClass}">${statusLabel}</span>
        </div>
        <button type="button" class="reload-btn" aria-label="${t("reloadItem")}" title="${t("reloadItem")}">${RELOAD_ICON_SVG}</button>
        <button type="button" class="remove-btn" aria-label="Remove item">✕</button>`;
      setImagePlaceholderOnError(div.querySelector("img.product-img"));
      const targetTcin = isUpc(tcin) ? (info.tcin || null) : tcin;
      if (targetTcin) div.addEventListener("click", (e) => { if (!e.target.closest(".remove-btn") && !e.target.closest(".reload-btn") && !e.target.closest(".search-target-link")) chrome.tabs.create({ url: getAffiliateProductUrl(targetTcin) }); });
      div.querySelector(".reload-btn").addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        div.classList.add("loading");
        div.innerHTML = `
        <div class="skeleton-img"></div>
        <div class="product-info">
          <div class="skeleton-line short"></div>
          <span class="status-text status-ribbon status-paused">${getStatusCheckingDots()}</span>
        </div>
        <span class="reload-btn-placeholder" aria-hidden="true"></span>
        <button type="button" class="remove-btn" aria-label="Remove item">✕</button>`;
        div.querySelector(".remove-btn").addEventListener("click", async (ev) => { ev.stopPropagation(); ev.preventDefault(); const d = await chrome.storage.local.get("tcins"); const filtered = removeFirstTcin(d.tcins, tcin); await chrome.storage.local.set({ tcins: filtered }); div.remove(); updateToggleButtonState(filtered); });
        chrome.runtime.sendMessage({ action: "refreshItem", storageId: tcin });
      });
      div.querySelector(".remove-btn").addEventListener("click", async (e) => { e.stopPropagation(); const d = await chrome.storage.local.get("tcins"); const filtered = removeFirstTcin(d.tcins, tcin); await chrome.storage.local.set({ tcins: filtered }); div.remove(); updateToggleButtonState(filtered); });
    }
    container.appendChild(div);
  });
  const scrollToRestore = pocketScrollTopToRestore != null ? pocketScrollTopToRestore : (scrollTopBefore > 0 ? scrollTopBefore : 0);
  if (scrollAreaPocket && scrollToRestore > 0) {
    pocketScrollTopToRestore = null;
    scrollAreaPocket.scrollTop = scrollToRestore;
  } else if (pocketScrollTopToRestore != null) pocketScrollTopToRestore = null;
  newlyAddedTcin = null;
}

function updateSystemStatus(active) {
    const statusEl = document.getElementById("status");
    const cardEl = document.getElementById("monitorContainer");
    if (statusEl) statusEl.innerHTML = active ? `<span class="dot"></span> ${t("running")}` : `<span class="dot dot-ready"></span> ${t("ready")}`;
    if (cardEl) cardEl.classList.toggle("monitor-card--active", active);
    if (document.body.classList.contains("standalone-mode")) {
      const tcins = (document.querySelectorAll(".dashboard-canvas .product-item") || []).length;
      chrome.storage.local.get(["lastScanMs", "lastPingMs"], (d) => {
        updatePulseHeader(tcins, active, d.lastScanMs, d.lastPingMs);
      });
    }
  }
function startCountdown(interval, lastTime = Date.now()) {
  if (countdownInterval) clearInterval(countdownInterval);
  countdownSweptThisCycle = false;
  const display = document.getElementById("countdown");
  const fillEl = document.getElementById("countdownProgressFill");
  const tick = () => {
    chrome.storage.local.get("isRunning", (data) => {
      if (data.isRunning === false) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        if (display) display.textContent = "—";
        if (fillEl) fillEl.style.width = "0%";
        if (typeof updatePulseNextScan === "function") updatePulseNextScan("—");
        return;
      }
      const remaining = (lastTime + interval * 1000) - Date.now();
      const diff = Math.ceil(remaining / 1000);
      if (display) {
        if (diff <= 0) {
          display.innerHTML = t("scanning") + " <span class=\"scan-dots\"><span>.</span><span>.</span><span>.</span></span>";
        } else {
          display.textContent = t("nextScanInS", { n: diff });
        }
      }
      if (fillEl) {
        const pct = interval > 0 ? Math.max(0, Math.min(100, (remaining / (interval * 1000)) * 100)) : 0;
        fillEl.style.width = `${pct}%`;
      }
      if (typeof updatePulseNextScan === "function") {
        updatePulseNextScan(diff <= 0 ? "__dots__" : `${diff}s`);
      }
      if (remaining <= 0 && !countdownSweptThisCycle) {
        countdownSweptThisCycle = true;
        runScanSweep();
      }
      if (remaining > 0) countdownSweptThisCycle = false;
    });
  };
  tick();
  countdownInterval = setInterval(tick, 1000);
}