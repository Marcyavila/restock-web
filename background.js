const API_KEY = "9f36aeafbe60771e321a7cc95a78140772ab3e96";
const API_KEY_PDP = "ff457966e64d5e877fdbad070f276d18ecec4a01";
const PHRASE = "OUT_OF_STOCK";
const DEFAULT_ZIP = "90028";
const DEFAULT_STORE_ID = "3346";
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Affiliate: one link for all products; u= passes destination. Same as popup.js (service worker has no shared module). */
const AFFILIATE_BASE = "https://goto.target.com/jRr2b6";
function getAffiliateProductUrl(tcin) {
  const dest = `https://www.target.com/p/-/A-${tcin}`;
  return AFFILIATE_BASE + "?u=" + encodeURIComponent(dest);
}

const DEBUG_UPC = true;
function debug(...args) {
  if (DEBUG_UPC) console.log("[UPC resolve]", ...args);
}

function isTcinJustUpcPrefix(tcin, upcStr) {
  if (!tcin || !upcStr || upcStr.length !== 12) return false;
  return tcin === upcStr.slice(0, 8);
}

let lastStatuses = {};
let pollIntervalId = null;
let checkStockRunning = false;

/** Badge: "off" = clear; "monitoring" = ON (green); "scanning" = … (purple) */
function setBadgeState(state) {
  try {
    if (state === "scanning") {
      chrome.action.setBadgeText({ text: "…" });
      chrome.action.setBadgeBackgroundColor({ color: "#7c3aed" });
    } else if (state === "monitoring") {
      chrome.action.setBadgeText({ text: "ON" });
      chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  } catch (_) {}
}

function startPolling(intervalSeconds) {
  stopPolling();
  setBadgeState("monitoring");
  const ms = Math.max(1000, intervalSeconds * 1000);
  if (intervalSeconds >= 60) {
    chrome.alarms.create("stockCheck", { periodInMinutes: intervalSeconds / 60 });
  } else {
    chrome.alarms.clear("stockCheck");
    checkStock();
    pollIntervalId = setInterval(checkStock, ms);
  }
}

function stopPolling() {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
  chrome.alarms.clearAll();
}

function setLastError(msg) {
  chrome.storage.local.set({ lastError: msg || null });
}

async function ensureOffscreenAndPlay() {
  try {
    const ctxs = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
    if (!ctxs.length) {
      await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: ["AUDIO_PLAYBACK"],
        justification: "Play notification sound when item comes in stock"
      });
    }
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: "playAlertSound" }).catch(() => {});
    }, 100);
  } catch (_) {}
}

/** True if the name is a placeholder like "Item 95093989" or "Item (95093989)" — usually means not live yet. */
function isPlaceholderItemName(name) {
  if (!name || typeof name !== "string") return false;
  const t = name.trim();
  return /^Item\s*\(?\d{8,12}\)?\s*$/i.test(t);
}

/** Returns true = out of stock, false = in stock, "not_live" = no fulfillment data or unreleased. */
function getStatusFromProduct(product) {
  const fulfillment = product?.fulfillment ?? product?.item?.fulfillment;
  const rawShipping = fulfillment?.shipping_options;
  const storeOptions = fulfillment?.store_options;
  const hasStoreOptions = Array.isArray(storeOptions) && storeOptions.length > 0;

  // Gather available_to_promise_quantity from ALL paths (batch vs PDP and preorder vs ship can use different slots)
  const qtyCandidates = [];
  if (typeof fulfillment?.available_to_promise_quantity === "number") {
    qtyCandidates.push(fulfillment.available_to_promise_quantity);
  }
  if (Array.isArray(rawShipping)) {
    for (const opt of rawShipping) {
      if (opt && typeof opt.available_to_promise_quantity === "number") {
        qtyCandidates.push(opt.available_to_promise_quantity);
      }
    }
  } else if (rawShipping && typeof rawShipping.available_to_promise_quantity === "number") {
    qtyCandidates.push(rawShipping.available_to_promise_quantity);
  }
  const availableQty = qtyCandidates.length > 0 ? Math.max(...qtyCandidates) : null;

  // Primary status from first shipping option for backward compatibility; preorder may use a different slot
  const shipping = Array.isArray(rawShipping) && rawShipping.length > 0 ? rawShipping[0] : rawShipping;
  let status = shipping?.availability_status ?? fulfillment?.availability_status;
  // If first option is OUT_OF_STOCK but we have positive qty elsewhere (e.g. preorder slot), treat as orderable
  if (status === PHRASE && availableQty != null && availableQty > 0) status = "ORDERABLE";
  if ((status == null || status === "") && Array.isArray(rawShipping)) {
    for (const opt of rawShipping) {
      const s = opt?.availability_status;
      if (s && s !== PHRASE) { status = s; break; }
    }
  }

  const outOfStockAllStores = fulfillment?.is_out_of_stock_in_all_store_locations === true;
  const preorderStatus = /^PREORDER/i.test(status);
  // API uses PRE_ORDER_SELLABLE = orderable, PRE_ORDER_UNSELLABLE = sold out. For preorders "out in all stores" means no pickup, not unorderable.
  const preorderSellable = /^PRE_ORDER_SELLABLE/i.test(status);
  if (preorderSellable) return false;
  // Shipping says IN_STOCK → orderable even if no store pickup (is_out_of_stock_in_all_store_locations).
  if (status === "IN_STOCK") return false;

  // Positive quantity anywhere means orderable (incl. preorder) → in stock
  if (typeof availableQty === "number" && availableQty > 0) return false;
  // No status at all → not live (unreleased / not in system yet)
  if (status == null || status === "") return "not_live";
  // OUT_OF_STOCK with no store options → item not in any location yet, treat as not live
  if (status === PHRASE && !hasStoreOptions) return "not_live";
  // Explicitly out of stock
  if (status === PHRASE) return true;
  // Preorder or other state but no quantity (e.g. preorder sold out) → out of stock
  if (typeof availableQty === "number" && availableQty <= 0) return true;
  // API says out of stock in all store locations
  if (outOfStockAllStores) return true;
  // Preorder-related status without available quantity → treat as out of stock (sold-out preorders)
  if (preorderStatus && (availableQty == null || availableQty <= 0)) return true;
  // Any other status (e.g. PREORDER with qty in another slot, or IN_STOCK) with no negative signal → in stock
  return false;
}

async function fetchBatchFulfillment(activeTcins, zipCode) {
  const url = "https://redsky.target.com/redsky_aggregations/v1/web/product_summary_with_fulfillment_v1";
  const params = new URLSearchParams({
    key: API_KEY,
    tcins: activeTcins.join(","),
    store_id: DEFAULT_STORE_ID,
    zip: zipCode || DEFAULT_ZIP
  });
  const res = await fetch(`${url}?${params.toString()}`, { headers: { "User-Agent": USER_AGENT } });
  const data = await res.json();
  if (!res.ok) {
    const errMsg = data?.errors?.[0]?.reason || data?.message || `HTTP ${res.status}`;
    throw new Error(errMsg);
  }
  const products = data?.data?.product_summaries ?? data?.product_summaries ?? [];
  return Array.isArray(products) ? products : [];
}

/** Returns { product, statusCode }. product is the merged product object or null; statusCode is res.status (410 = Gone). */
async function fetchSingleFulfillment(tcin, zipCode) {
  const url = "https://redsky.target.com/redsky_aggregations/v1/web/pdp_fulfillment_v1";
  const params = new URLSearchParams({
    key: API_KEY_PDP,
    tcin: String(tcin),
    store_id: DEFAULT_STORE_ID,
    store_positions_store_id: DEFAULT_STORE_ID,
    has_store_positions_store_id: "true",
    zip: zipCode || DEFAULT_ZIP,
    has_pricing_store_id: "true",
    pricing_store_id: DEFAULT_STORE_ID,
    is_bot: "false"
  });
  const res = await fetch(`${url}?${params.toString()}`, { headers: { "User-Agent": USER_AGENT } });
  let data;
  try {
    const text = await res.text();
    data = (text && text.trim()) ? JSON.parse(text) : null;
  } catch (_) {
    data = null;
  }
  if (!res.ok) {
    return { product: null, statusCode: res.status };
  }
  if (!data) return { product: null, statusCode: res.status };
  const product = data?.data?.product ?? data?.product;
  const merged = product ? { tcin: String(tcin), ...product } : null;
  return { product: merged, statusCode: res.status };
}

function isUpc(id) {
  return typeof id === "string" && /^\d{12}$/.test(id);
}

function normalizeUpc(val) {
  if (val == null) return null;
  const s = String(val).replace(/\D/g, "");
  if (s.length === 12) return s;
  if (s.length === 13 && s.startsWith("0")) return s.slice(1);
  return s.length >= 12 ? s.slice(-12) : null;
}

function extractFromNextData(html) {
  let name = null;
  let imageUrl = null;
  try {
    const scriptMatch = html.match(/<script\s+id=["']__NEXT_DATA__["']\s+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!scriptMatch) return { name: null, imageUrl: null };
    const data = JSON.parse(scriptMatch[1]);
    const walk = (obj, depth) => {
      if (depth > 15 || !obj) return;
      if (typeof obj === "string") {
        if (!name && obj.length > 2 && obj.length < 300 && !/^https?:\/\//i.test(obj) && !/^\d+$/.test(obj)) name = obj.trim();
        if (!imageUrl && /\.(jpg|jpeg|png|webp)/i.test(obj)) imageUrl = obj.startsWith("//") ? "https:" + obj : obj;
        return;
      }
      if (Array.isArray(obj)) {
        obj.forEach((item) => walk(item, depth + 1));
        return;
      }
      const keys = Object.keys(obj);
      for (const k of ["title", "name", "product_name", "item_name", "description"]) {
        if (obj[k] && typeof obj[k] === "string" && !name) name = obj[k].trim();
      }
      for (const k of ["image", "imageUrl", "image_url", "primary_image", "main_image", "url"]) {
        const v = obj[k];
        if (v && typeof v === "string" && /\.(jpg|jpeg|png|webp)|scene7|target\.com\/.*image/i.test(v) && !imageUrl)
          imageUrl = v.startsWith("//") ? "https:" + v : v;
      }
      if (obj.product_description?.title && typeof obj.product_description.title === "string" && !name)
        name = obj.product_description.title.trim();
      if (obj.item?.product_description?.title && typeof obj.item.product_description.title === "string" && !name)
        name = obj.item.product_description.title.trim();
      for (const key of keys) walk(obj[key], depth + 1);
    };
    walk(data, 0);
  } catch (_) {}
  return { name, imageUrl };
}

async function fetchPdpDetailsByTcin(tcin) {
  const scene7Fallback = `https://target.scene7.com/is/image/Target/${tcin}?wid=150&hei=150&fmt=pjpeg`;
  try {
    const res = await fetch(`https://www.target.com/p/-/A-${tcin}`, {
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      },
      referrerPolicy: "no-referrer"
    });
    const html = res.ok ? await res.text() : "";
    let name = null;
    let imageUrl = null;
    if (res.ok && html) {
      const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
      if (ogTitle) name = ogTitle[1].trim().replace(/^([^:]+)\s*:\s*Target.*$/i, "$1").trim();
      const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
      if (ogImage) {
        imageUrl = ogImage[1].trim();
        if (imageUrl.startsWith("//")) imageUrl = "https:" + imageUrl;
      }
      if (!name || !imageUrl) {
        const next = extractFromNextData(html);
        if (next.name) name = name || next.name;
        if (next.imageUrl) imageUrl = imageUrl || next.imageUrl;
      }
    }
    let upc = null;
    if (html) {
      const m = html.match(/primary_barcode[\\"\s:]+["']?(\d{12})["']?/i);
      if (m) upc = normalizeUpc(m[1]);
    }
    return {
      name: name || `Item ${tcin}`,
      imageUrl: imageUrl || scene7Fallback,
      upc
    };
  } catch (_) {
    return { name: `Item ${tcin}`, imageUrl: scene7Fallback, upc: null };
  }
}

function extractTcinFromJson(obj) {
  if (!obj || typeof obj !== "object") return null;
  const tcin = obj.tcin ?? obj.tcin_id ?? obj.product?.tcin ?? obj.item?.tcin;
  if (tcin != null) return String(tcin);
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = extractTcinFromJson(item);
      if (found) return found;
    }
  } else {
    for (const key of ["product", "item", "data", "results", "products", "searchResults"]) {
      const found = extractTcinFromJson(obj[key]);
      if (found) return found;
    }
  }
  return null;
}

function findTcinNearUpcInJson(obj, upcStr) {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === "string") {
    const trimmed = obj.trim();
    if (trimmed === upcStr || trimmed.replace(/\D/g, "") === upcStr) return "FOUND_UPC";
    return null;
  }
  if (typeof obj !== "object") return null;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const v = findTcinNearUpcInJson(obj[i], upcStr);
      if (v === "FOUND_UPC") {
        const tcin = obj[i]?.tcin ?? obj[i]?.tcin_id ?? (typeof obj[i] === "object" && obj[i] && (obj[i].tcin ?? obj[i].tcin_id));
        if (tcin != null) return String(tcin);
        for (const sib of obj) {
          if (sib && typeof sib === "object" && (sib.tcin != null || sib.tcin_id != null))
            return String(sib.tcin ?? sib.tcin_id);
        }
        return null;
      }
      if (typeof v === "string" && v !== "FOUND_UPC") return v;
    }
    return null;
  }
  const keys = Object.keys(obj);
  const tcinVal = obj.tcin ?? obj.tcin_id ?? obj.product_id;
  if (tcinVal != null && /^\d{8}$/.test(String(tcinVal))) {
    const hasUpc = keys.some((k) => {
      const v = obj[k];
      if (typeof v === "string" && (v === upcStr || v.replace(/\D/g, "") === upcStr)) return true;
      return false;
    });
    if (hasUpc) return String(tcinVal);
  }
  for (const k of keys) {
    const v = findTcinNearUpcInJson(obj[k], upcStr);
    if (v === "FOUND_UPC") {
      const tcin = obj.tcin ?? obj.tcin_id ?? obj.product_id;
      if (tcin != null && /^\d{8}$/.test(String(tcin))) return String(tcin);
      return null;
    }
    if (typeof v === "string" && v !== "FOUND_UPC") return v;
  }
  return null;
}

async function resolveUpcToTcin(upc, zipCode) {
  const upcStr = String(upc).trim();
  if (!/^\d{12}$/.test(upcStr)) {
    debug("invalid UPC (not 12 digits):", upcStr);
    return null;
  }
  const cached = await chrome.storage.local.get(["upcToTcin"]);
  const cache = cached.upcToTcin && typeof cached.upcToTcin === "object" ? cached.upcToTcin : {};
  const fromCache = cache[upcStr];
  if (fromCache && !isTcinJustUpcPrefix(fromCache, upcStr) && /^\d{8}$/.test(String(fromCache))) {
    debug("resolving UPC:", upcStr, "- from cache -> tcin:", fromCache);
    chrome.storage.local.set({
      lastUpcResolution: { upc: upcStr, tcin: fromCache, ok: true, method: "cache" }
    }).catch(() => {});
    return String(fromCache);
  }
  debug("resolving UPC:", upcStr, "- running all strategies in parallel");

  const report = (method, tcin, note) => {
    const outcome = tcin != null ? `tcin=${tcin}` : (note || "fail");
    debug("  ", method, "->", outcome);
  };

  const valid = (tcin) => tcin != null && !isTcinJustUpcPrefix(tcin, upcStr);

  const strategyRedskyGtin = async () => {
    try {
      const url = "https://redsky.target.com/redsky_aggregations/v1/web/product_summary_with_fulfillment_v1";
      const params = new URLSearchParams({ key: API_KEY, store_id: DEFAULT_STORE_ID, zip: zipCode || DEFAULT_ZIP });
      params.set("gtin", upcStr);
      const res = await fetch(`${url}?${params.toString()}`, { headers: { "User-Agent": USER_AGENT } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { method: "redsky_gtin", tcin: null };
      const list = data?.data?.product_summaries ?? data?.product_summaries ?? [];
      const first = Array.isArray(list) ? list[0] : null;
      const tcin = first?.tcin ?? first?.item?.tcin ?? first?.product?.tcin;
      return { method: "redsky_gtin", tcin: tcin != null ? String(tcin) : null };
    } catch (_) {
      return { method: "redsky_gtin", tcin: null };
    }
  };

  const strategyRedskyUpc = async () => {
    try {
      const url = "https://redsky.target.com/redsky_aggregations/v1/web/product_summary_with_fulfillment_v1";
      const params = new URLSearchParams({ key: API_KEY, store_id: DEFAULT_STORE_ID, zip: zipCode || DEFAULT_ZIP });
      params.set("upc", upcStr);
      const res = await fetch(`${url}?${params.toString()}`, { headers: { "User-Agent": USER_AGENT } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { method: "redsky_upc", tcin: null };
      const list = data?.data?.product_summaries ?? data?.product_summaries ?? [];
      const first = Array.isArray(list) ? list[0] : null;
      const tcin = first?.tcin ?? first?.item?.tcin ?? first?.product?.tcin;
      return { method: "redsky_upc", tcin: tcin != null ? String(tcin) : null };
    } catch (_) {
      return { method: "redsky_upc", tcin: null };
    }
  };

  const strategyPdpGtin = async () => {
    try {
      const url = "https://redsky.target.com/redsky_aggregations/v1/web/pdp_fulfillment_v1";
      const params = new URLSearchParams({
        key: API_KEY_PDP,
        store_id: DEFAULT_STORE_ID,
        store_positions_store_id: DEFAULT_STORE_ID,
        has_store_positions_store_id: "true",
        zip: zipCode || DEFAULT_ZIP,
        has_pricing_store_id: "true",
        pricing_store_id: DEFAULT_STORE_ID,
        is_bot: "false"
      });
      params.set("gtin", upcStr);
      const res = await fetch(`${url}?${params.toString()}`, { headers: { "User-Agent": USER_AGENT } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { method: "pdp_gtin", tcin: null };
      const product = data?.data?.product ?? data?.product;
      const tcin = product?.tcin ?? product?.item?.tcin;
      return { method: "pdp_gtin", tcin: tcin != null ? String(tcin) : null };
    } catch (_) {
      return { method: "pdp_gtin", tcin: null };
    }
  };

  const strategyPdpUpc = async () => {
    try {
      const url = "https://redsky.target.com/redsky_aggregations/v1/web/pdp_fulfillment_v1";
      const params = new URLSearchParams({
        key: API_KEY_PDP,
        store_id: DEFAULT_STORE_ID,
        store_positions_store_id: DEFAULT_STORE_ID,
        has_store_positions_store_id: "true",
        zip: zipCode || DEFAULT_ZIP,
        has_pricing_store_id: "true",
        pricing_store_id: DEFAULT_STORE_ID,
        is_bot: "false"
      });
      params.set("upc", upcStr);
      const res = await fetch(`${url}?${params.toString()}`, { headers: { "User-Agent": USER_AGENT } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { method: "pdp_upc", tcin: null };
      const product = data?.data?.product ?? data?.product;
      const tcin = product?.tcin ?? product?.item?.tcin;
      return { method: "pdp_upc", tcin: tcin != null ? String(tcin) : null };
    } catch (_) {
      return { method: "pdp_upc", tcin: null };
    }
  };

  const strategyPdpUrl = async () => {
    try {
      const res = await fetch(`https://www.target.com/p/-/A-${upcStr}`, {
        redirect: "follow",
        headers: { "User-Agent": USER_AGENT },
        referrerPolicy: "no-referrer"
      });
      const finalUrl = res.url || "";
      const m = finalUrl.match(/\/A-(\d{8})(?:\?|#|$)/);
      if (m && !isTcinJustUpcPrefix(m[1], upcStr)) return { method: "pdp_url_redirect", tcin: m[1] };
      if (!res.ok) return { method: "pdp_url", tcin: null };
      const html = await res.text();
      let inPage = html.match(/tcin[\\"\s:]+["']?(\d{8})["']?/i);
      if (!inPage) inPage = html.match(/["']tcin["']\s*:\s*["']?(\d{8})["']?/i) || html.match(/\/-\/A-(\d{8})(?:\?|"|'|#|\s|>|$)/);
      const tcin = inPage ? inPage[1] : null;
      if (tcin && isTcinJustUpcPrefix(tcin, upcStr)) return { method: "pdp_url_html", tcin: null };
      return { method: "pdp_url_html", tcin };
    } catch (_) {
      return { method: "pdp_url", tcin: null };
    }
  };

  const strategySearchPage = async () => {
    try {
      const res = await fetch(`https://www.target.com/s?searchTerm=${encodeURIComponent(upcStr)}`, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        referrerPolicy: "no-referrer"
      });
      const html = await res.text();
      const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/) || html.match(/id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      let tcin = null;
      let method = "search_page";
      if (nextDataMatch) {
        try {
          const json = JSON.parse(nextDataMatch[1]);
          tcin = findTcinNearUpcInJson(json, upcStr) || extractTcinFromJson(json);
          if (tcin === "FOUND_UPC") tcin = null;
          if (tcin) method = "search_next_data";
        } catch (_) {}
      }
      if (!tcin) {
        // Permissive regex for __TGT_DATA__ double-escaped format
        const tcinInPage = html.match(/tcin[\\"\s:]+["']?(\d{8})["']?/i) || html.match(/["']tcin["']\s*:\s*["'](\d{8})["']/i) || html.match(/\/-\/A-(\d{8})(?:\?|"|'|#|\s|>|$)/);
        if (tcinInPage) {
          tcin = tcinInPage[1];
          method = "search_html_regex";
        } else {
          const nearUpc = html.match(new RegExp(upcStr + ".{0,200}?(\\d{8})")) || html.match(new RegExp("(\\d{8}).{0,200}?" + upcStr));
          if (nearUpc) {
            tcin = nearUpc[1];
            method = "search_near_upc";
          }
        }
      }
      if (!tcin) {
        const re = /\/-\/A-(\d{8})(?:\?|"|'|#|\s|>|$)/g;
        let match;
        const tcins = [];
        while ((match = re.exec(html)) !== null) tcins.push(match[1]);
        for (const t of tcins) {
          if (!isTcinJustUpcPrefix(t, upcStr)) {
            tcin = t;
            method = "search_links";
            break;
          }
        }
      }
      return { method, tcin };
    } catch (_) {
      return { method: "search_page", tcin: null };
    }
  };

  const strategies = [
    strategyRedskyGtin(),
    strategyRedskyUpc(),
    strategyPdpGtin(),
    strategyPdpUpc(),
    strategyPdpUrl(),
    strategySearchPage()
  ];

  const results = await Promise.allSettled(strategies);
  const outcomes = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const name = ["redsky_gtin", "redsky_upc", "pdp_gtin", "pdp_upc", "pdp_url", "search_page"][i];
    if (r.status === "fulfilled" && r.value) {
      const { method, tcin } = r.value;
      report(method, tcin);
      outcomes.push({ method, tcin });
    } else {
      report(name, null, r.status === "rejected" ? "throw" : "fail");
    }
  }

  let result = null;
  let winner = null;
  for (const { method, tcin } of outcomes) {
    if (valid(tcin)) {
      result = tcin;
      winner = method;
      break;
    }
  }

  if (winner) {
    debug("WINNER:", winner, "-> tcin:", result);
  } else {
    debug("ALL STRATEGIES FAILED (or returned invalid UPC-prefix)");
  }
  if (result && isTcinJustUpcPrefix(result, upcStr)) {
    debug("rejecting false TCIN (UPC prefix):", result);
    result = null;
  }
  chrome.storage.local.set({
    lastUpcResolution: {
      upc: upcStr,
      tcin: result || null,
      ok: !!result,
      method: winner || null
    }
  }).catch(() => {});
  return result;
}

/** Force full refresh of one item: PDP (name, image) + fulfillment (status). Used by reload button. */
async function refreshSingleItem(storageId) {
  if (!storageId || typeof storageId !== "string") return;
  const storage = await chrome.storage.local.get(["zipCode", "productDetails", "stockStatuses"]);
  const zipCode = storage.zipCode || DEFAULT_ZIP;
  const productDetails = storage.productDetails && typeof storage.productDetails === "object" ? { ...storage.productDetails } : {};
  const stockStatuses = storage.stockStatuses && typeof storage.stockStatuses === "object" ? { ...storage.stockStatuses } : {};
  if (lastStatuses && typeof lastStatuses === "object") {
    Object.assign(stockStatuses, lastStatuses);
  }

  let tcin = /^\d{8,11}$/.test(storageId) ? storageId : null;
  if (!tcin && isUpc(storageId)) {
    tcin = productDetails[storageId]?.tcin || await resolveUpcToTcin(storageId, zipCode);
    if (!tcin) {
      lastStatuses[storageId] = undefined;
      await chrome.storage.local.set({ productDetails, stockStatuses: { ...stockStatuses, [storageId]: undefined } });
      chrome.runtime.sendMessage({ action: "scanComplete" });
      return;
    }
  }
  if (!tcin) return;

  const pdp = await fetchPdpDetailsByTcin(tcin);
  let name = pdp?.name || `Item ${tcin}`;
  let imageUrl = pdp?.imageUrl || `https://target.scene7.com/is/image/Target/${tcin}?wid=150&hei=150&fmt=pjpeg`;
  let image = null;
  try {
    const imgRes = await fetch(imageUrl, { referrerPolicy: "no-referrer" });
    if (imgRes.ok) {
      const buf = await imgRes.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      const chunk = 8192;
      for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      const mime = (imgRes.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
      image = `data:${mime};base64,${btoa(binary)}`;
    }
  } catch (_) {}
  const upc = pdp?.upc && !isTcinJustUpcPrefix(tcin, pdp.upc) ? pdp.upc : null;
  const existingImage = productDetails[storageId]?.image;
  const keepExistingImage = !image && existingImage && String(existingImage).startsWith("data:");
  const finalImage = keepExistingImage ? existingImage : image;
  productDetails[storageId] = { name, image: finalImage, tcin: isUpc(storageId) ? tcin : undefined };

  let effectiveStatus = "not_live";
  try {
    const { product } = await fetchSingleFulfillment(tcin, zipCode);
    if (product) effectiveStatus = isPlaceholderItemName(name) ? "not_live" : getStatusFromProduct(product);
  } catch (_) {}
  lastStatuses[storageId] = stockStatuses[storageId] = effectiveStatus;

  await chrome.storage.local.set({ productDetails, stockStatuses });
  chrome.runtime.sendMessage({ action: "scanComplete" });
}

async function checkStock(overrideTcins) {
  if (checkStockRunning) return;
  checkStockRunning = true;
  const scanStartTime = Date.now();
  let lastPingMs = null;
  const storage = await chrome.storage.local.get(["tcins", "zipCode", "pausedTCINs", "productDetails", "upcToTcin", "stockStatuses"]);
  if (storage.stockStatuses && typeof storage.stockStatuses === "object") {
    lastStatuses = { ...storage.stockStatuses };
  }
  const previousScanKeys = storage.stockStatuses && typeof storage.stockStatuses === "object" ? new Set(Object.keys(storage.stockStatuses)) : new Set();
  const tcins = overrideTcins && overrideTcins.length > 0 ? overrideTcins : storage.tcins;
  const zipCode = storage.zipCode;
  const pausedTCINs = storage.pausedTCINs || [];
  const productDetails = storage.productDetails || {};
  let upcToTcinCache = storage.upcToTcin && typeof storage.upcToTcin === "object" ? { ...storage.upcToTcin } : {};
  if (!tcins || tcins.length === 0) {
    checkStockRunning = false;
    setBadgeState("off");
    stopPolling();
    const lastScanMs = Math.round(Date.now() - scanStartTime);
    chrome.storage.local.set({ lastScanMs, isRunning: false }).catch(() => {});
    chrome.runtime.sendMessage({ action: "scanComplete" });
    return;
  }
  setBadgeState("scanning");

  const targetTcins = (tcins || []).filter(id => /^\d{8,11}$/.test(id));
  const upcs = (tcins || []).filter(id => isUpc(id));
  const activeTcins = targetTcins.filter(t => !pausedTCINs.includes(t));
  const activeUpcs = upcs.filter(u => !pausedTCINs.includes(u));

  const tcinToUpc = {};
  const tcinsToFetch = [...activeTcins];
  if (activeUpcs.length) debug("checkStock: resolving", activeUpcs.length, "UPC(s), cache has", Object.keys(upcToTcinCache).length);
  for (const upc of activeUpcs) {
    let resolved = upcToTcinCache[upc] || null;
    if (!resolved) {
      resolved = await resolveUpcToTcin(upc, zipCode);
      if (resolved) {
        if (isTcinJustUpcPrefix(resolved, upc)) {
          debug("checkStock: ignoring cached false TCIN (UPC prefix) for", upc);
          resolved = null;
        } else {
          upcToTcinCache[upc] = resolved;
          debug("checkStock: UPC", upc, "-> TCIN", resolved);
        }
      } else {
        debug("checkStock: UPC", upc, "could not resolve");
      }
    } else if (isTcinJustUpcPrefix(resolved, upc)) {
      delete upcToTcinCache[upc];
      resolved = null;
      debug("checkStock: cleared false TCIN from cache for", upc);
    }
    if (resolved) {
      tcinToUpc[resolved] = upc;
      if (!tcinsToFetch.includes(resolved)) tcinsToFetch.push(resolved);
    }
  }
  let products = [];
  let updatedDetails = { ...productDetails };

  const cacheToSave = { ...upcToTcinCache };
  if (Object.keys(cacheToSave).length > 0) {
    chrome.storage.local.set({ upcToTcin: cacheToSave }).catch(() => {});
  }

  if (tcinsToFetch.length === 0) {
    for (const upc of activeUpcs) {
      lastStatuses[upc] = undefined;
    }
    const lastScanMs = Math.round(Date.now() - scanStartTime);
    stopPolling();
    try {
      await chrome.storage.local.set({
        productDetails: { ...productDetails },
        lastCheckTime: Date.now(),
        stockStatuses: { ...lastStatuses },
        lastScanMs,
        isRunning: false
      });
    } catch (_) {}
    checkStockRunning = false;
    setBadgeState("off");
    chrome.runtime.sendMessage({ action: "scanComplete" });
    return;
  }

  // Map requested TCIN -> product. Prefer matching by returned product.tcin when it's in the requested chunk so we don't mis-assign when the API returns fewer products than requested (e.g. chunk of 5 returns 4; 95138474 would otherwise get no product). When returned tcin is not in chunk (variant, e.g. 94808792 for parent 94885619), use index.
  const requestedTcinToProduct = {};
  const mapChunkResults = (chunk, chunkProducts) => {
    for (let j = 0; j < chunkProducts.length; j++) {
      const p = chunkProducts[j];
      if (!p) continue;
      const returnedTcin = p.tcin != null ? String(p.tcin) : null;
      if (returnedTcin && chunk.includes(returnedTcin)) {
        requestedTcinToProduct[returnedTcin] = p;
      } else if (j < chunk.length) {
        requestedTcinToProduct[chunk[j]] = p;
      }
    }
  };
  try {
    const BATCH_CHUNK_SIZE = 5;
    if (tcinsToFetch.length <= BATCH_CHUNK_SIZE) {
      const t0 = Date.now();
      products = await fetchBatchFulfillment(tcinsToFetch, zipCode);
      lastPingMs = Math.round(Date.now() - t0);
      mapChunkResults(tcinsToFetch, products);
    } else {
      products = [];
      for (let i = 0; i < tcinsToFetch.length; i += BATCH_CHUNK_SIZE) {
        const chunk = tcinsToFetch.slice(i, i + BATCH_CHUNK_SIZE);
        const t0 = Date.now();
        const chunkProducts = await fetchBatchFulfillment(chunk, zipCode);
        const rtt = Math.round(Date.now() - t0);
        if (lastPingMs == null || rtt < lastPingMs) lastPingMs = rtt;
        mapChunkResults(chunk, chunkProducts);
        products.push(...chunkProducts);
      }
    }
    setLastError(null);
  } catch (batchErr) {
    console.warn("Batch API failed, trying single-product API:", batchErr.message);
    setLastError(batchErr.message);
    for (const tcin of tcinsToFetch) {
      try {
        const t0 = Date.now();
        const { product } = await fetchSingleFulfillment(tcin, zipCode);
        const rtt = Math.round(Date.now() - t0);
        if (lastPingMs == null || rtt < lastPingMs) lastPingMs = rtt;
        if (product) {
          products.push(product);
          requestedTcinToProduct[tcin] = product;
        }
      } catch (_) {}
    }
  }

  if (products.length === 0 && tcinsToFetch.length > 0) {
    for (const tcin of tcinsToFetch) {
      const pdp = await fetchPdpDetailsByTcin(tcin);
      if (pdp) {
        const upc = pdp.upc && !isTcinJustUpcPrefix(tcin, pdp.upc) ? pdp.upc : null;
        if (upc) upcToTcinCache[upc] = tcin;
        const storageId = tcinToUpc[tcin] || tcin;
        let imgUrl = pdp.imageUrl || `https://target.scene7.com/is/image/Target/${tcin}?wid=150&hei=150&fmt=pjpeg`;
        try {
          const imgRes = await fetch(imgUrl, { referrerPolicy: "no-referrer" });
          if (imgRes.ok) {
            const buf = await imgRes.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let binary = "";
            const chunk = 8192;
            for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
            const mime = (imgRes.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
            updatedDetails[storageId] = { name: pdp.name, image: `data:${mime};base64,${btoa(binary)}`, tcin: upc ? tcin : undefined };
          } else {
            updatedDetails[storageId] = { name: pdp.name, image: null, tcin: upc ? tcin : undefined };
          }
        } catch (_) {
          updatedDetails[storageId] = { name: pdp.name, image: null, tcin: upc ? tcin : undefined };
        }
        lastStatuses[storageId] = "not_live";
      }
    }
  }

  for (const [requestedTcin, product] of Object.entries(requestedTcinToProduct)) {
    const tcin = product.tcin != null ? String(product.tcin) : null;
    if (!tcin) continue;
    const isOutOfStock = getStatusFromProduct(product);
    const upc = tcinToUpc[requestedTcin];
    const storageId = upc || requestedTcin;

    let name = product?.item?.product_description?.title || product?.item?.product?.description?.title || (upc ? `UPC ${upc}` : `Item ${requestedTcin}`);
    const isPlaceholder = isPlaceholderItemName(name);
    const effectiveStatus = isPlaceholder ? "not_live" : isOutOfStock;
    const needsDetails = !updatedDetails[storageId] || (updatedDetails[storageId].image && updatedDetails[storageId].image.includes("placeholder"));
    if (needsDetails) {
      const pdp = await fetchPdpDetailsByTcin(tcin);
      if (pdp) {
        if (pdp.name) name = pdp.name;
        if (pdp.upc && !isTcinJustUpcPrefix(tcin, pdp.upc)) {
          upcToTcinCache[pdp.upc] = tcin;
        }
      }
      let imgUrl = pdp?.imageUrl || null;
      if (!imgUrl) imgUrl = `https://target.scene7.com/is/image/Target/${tcin}?wid=150&hei=150&fmt=pjpeg`;
      try {
        const imgRes = await fetch(imgUrl, { referrerPolicy: "no-referrer" });
        if (imgRes.ok) {
          const buf = await imgRes.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = "";
          const chunk = 8192;
          for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
          }
          const mime = (imgRes.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
          updatedDetails[storageId] = { name, image: `data:${mime};base64,${btoa(binary)}`, tcin: upc ? tcin : undefined };
        } else {
          updatedDetails[storageId] = { name, image: null, tcin: upc ? tcin : undefined };
        }
      } catch (_) {
        updatedDetails[storageId] = { name, image: null, tcin: upc ? tcin : undefined };
      }
    } else if (upc && updatedDetails[storageId]) {
      updatedDetails[storageId].tcin = tcin;
    }

    // If name is still "Item (SKU)" placeholder, treat as not live — listing not really live yet (effectiveStatus already set above)
    const wasOutOfStock = lastStatuses[storageId] === true || lastStatuses[storageId] === "not_live";
    const firstScanForItem = !previousScanKeys.has(storageId);
    if (effectiveStatus === false && (wasOutOfStock || firstScanForItem)) {
      try {
        chrome.notifications.create({ title: "🎯 Stock Alert!", message: updatedDetails[storageId].name, iconUrl: "icon128.png", type: "basic" });
        ensureOffscreenAndPlay();
        chrome.tabs.create({ url: getAffiliateProductUrl(tcin) });
      } catch (_) {}
    }
    lastStatuses[storageId] = effectiveStatus;
  }

  // Requested TCINs that didn't appear in batch: fetch single-product fulfillment to get real status, then PDP for details if needed
  for (const tcin of activeTcins) {
    const storageIdForTcin = tcinToUpc[tcin] || tcin;
    if (lastStatuses[storageIdForTcin] === undefined) {
      const wasRequested = tcinsToFetch.includes(tcin);
      const gotProduct = requestedTcinToProduct[tcin] != null;
      if (wasRequested && !gotProduct) {
        let resolvedStatus = "not_live";
        try {
          const { product, statusCode } = await fetchSingleFulfillment(tcin, zipCode);
          if (product) {
            const name = product?.item?.product_description?.title || product?.item?.product?.description?.title || `Item ${tcin}`;
            resolvedStatus = isPlaceholderItemName(name) ? "not_live" : getStatusFromProduct(product);
          } else if (statusCode === 410) {
            resolvedStatus = "gone";
          }
        } catch (_) {}
        lastStatuses[storageIdForTcin] = resolvedStatus;
        const storageId = storageIdForTcin;
        const needsDetails = !updatedDetails[storageId] || (updatedDetails[storageId].image && updatedDetails[storageId].image.includes("placeholder"));
        if (needsDetails) {
          const pdp = await fetchPdpDetailsByTcin(tcin);
          if (pdp) {
            const upc = pdp.upc && !isTcinJustUpcPrefix(tcin, pdp.upc) ? pdp.upc : null;
            if (upc) upcToTcinCache[upc] = tcin;
            let imgUrl = pdp.imageUrl || `https://target.scene7.com/is/image/Target/${tcin}?wid=150&hei=150&fmt=pjpeg`;
            try {
              const imgRes = await fetch(imgUrl, { referrerPolicy: "no-referrer" });
              if (imgRes.ok) {
                const buf = await imgRes.arrayBuffer();
                const bytes = new Uint8Array(buf);
                let binary = "";
                const chunk = 8192;
                for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
                const mime = (imgRes.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
                updatedDetails[storageId] = { name: pdp.name, image: `data:${mime};base64,${btoa(binary)}`, tcin: upc ? tcin : undefined };
              } else {
                updatedDetails[storageId] = { name: pdp.name, image: null, tcin: upc ? tcin : undefined };
              }
            } catch (_) {
              updatedDetails[storageId] = { name: pdp.name, image: null, tcin: upc ? tcin : undefined };
            }
          }
        }
      } else {
        lastStatuses[storageIdForTcin] = true;
      }
    }
  }
  for (const upc of activeUpcs) {
    const wasResolved = Object.values(tcinToUpc).includes(upc);
    if (!wasResolved) lastStatuses[upc] = undefined;
  }

  const lastScanMs = Math.round(Date.now() - scanStartTime);
  try {
    await chrome.storage.local.set({
      productDetails: updatedDetails,
      lastCheckTime: Date.now(),
      stockStatuses: { ...lastStatuses },
      lastScanMs,
      lastPingMs
    });
  } catch (_) {}
  checkStockRunning = false;
  setBadgeState("monitoring");
  // NOTE: We never write tcins here — only the popup adds/removes/clears the list.
  chrome.runtime.sendMessage({ action: "scanComplete" });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "start") {
    lastStatuses = {};
    chrome.storage.local.remove("stockStatuses").catch(() => {});
    const interval = Math.max(1, request.interval || 3);
    startPolling(interval);
  } else if (request.action === "stop") {
    setBadgeState("off");
    stopPolling();
  } else if (request.action === "checkNow") {
    checkStock(request.tcins && Array.isArray(request.tcins) ? request.tcins : null);
  } else if (request.action === "getStatuses") {
    sendResponse({ statuses: lastStatuses });
  } else if (request.action === "resolveUpc") {
    const { upc, zipCode } = request;
    resolveUpcToTcin(upc, zipCode).then((tcin) => {
      if (tcin) {
        chrome.storage.local.get(["upcToTcin"], (d) => {
          const cache = { ...(d.upcToTcin || {}), [upc]: tcin };
          chrome.storage.local.set({ upcToTcin: cache });
        });
      }
      sendResponse({ tcin: tcin || null });
    });
    return true;
  } else if (request.action === "clearStatuses") {
    lastStatuses = {};
    chrome.storage.local.remove("stockStatuses");
    chrome.storage.local.set({ pausedTCINs: [] });
    sendResponse({ ok: true });
  } else if (request.action === "refreshItem") {
    const { storageId } = request;
    refreshSingleItem(storageId).catch(() => {
      chrome.runtime.sendMessage({ action: "scanComplete" });
    });
    sendResponse({ ok: true });
    return true;
  } else if (request.type === "AUTH_CALLBACK" && request.token) {
    chrome.storage.local.set({ authToken: request.token }, () => sendResponse({ ok: true }));
    return true;
  }
  return true;
});

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === "stockCheck") checkStock();
});

// Restore last known stock statuses so popup shows correct state after reload
chrome.storage.local.get(["stockStatuses"], (data) => {
  if (data.stockStatuses && typeof data.stockStatuses === "object") {
    lastStatuses = { ...data.stockStatuses };
  }
});

// When service worker wakes (e.g. after being idle), re-start polling if monitoring was active
chrome.storage.local.get(["isRunning", "interval"], (data) => {
  if (data.isRunning && data.interval) {
    startPolling(Math.max(1, data.interval));
  }
});