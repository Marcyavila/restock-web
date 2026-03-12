import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // Restrict to your site + chrome-extension in production
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

/** GET /getPlan — requires Authorization: Bearer <Clerk JWT>. Returns { plan, itemLimit, email } or 401. */
const getPlan = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  try {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
    const plan = await ctx.runQuery(api.profiles.getMyPlan, {});
    if (!plan) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
    return new Response(JSON.stringify(plan), {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isAuthError =
      message.includes("JWT") ||
      message.includes("token") ||
      message.includes("issuer") ||
      message.includes("Unauthorized") ||
      message.includes("authentication");
    const status = isAuthError ? 401 : 500;
    return new Response(
      JSON.stringify({ error: isAuthError ? "Unauthorized" : "Internal error" }),
      { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }
});

/** POST /setLocale — body: { "locale": "en" | "es" }. Requires Authorization: Bearer <JWT>. */
const setLocale = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }
  try {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
    let body: { locale?: string };
    try {
      body = await request.json() as { locale?: string };
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
    const locale = body.locale === "es" ? "es" : body.locale === "en" ? "en" : null;
    if (locale === null) {
      return new Response(
        JSON.stringify({ error: "locale must be 'en' or 'es'" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
    await ctx.runMutation(internal.profiles.setLocaleByUserId, {
      userId: identity.tokenIdentifier,
      locale,
    });
    return new Response(JSON.stringify({ ok: true, locale }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }
});

/** GET /createCheckoutSession — returns { url } to Stripe Checkout. Requires Authorization: Bearer <Clerk JWT>. */
const createCheckoutSession = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (request.method !== "GET" && request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!secretKey || !priceId) {
    return new Response(
      JSON.stringify({ error: "Checkout not configured" }),
      { status: 503, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }
  try {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
    const userId = identity.tokenIdentifier;
    const baseUrl = "https://www.getrestock.app";
    const params = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${baseUrl}/upgrade?success=1`,
      cancel_url: `${baseUrl}/upgrade?canceled=1`,
      client_reference_id: userId,
      "subscription_data[metadata][userId]": userId,
    });
    if (identity.email) {
      params.set("customer_email", identity.email);
    }
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!stripeRes.ok) {
      const errText = await stripeRes.text();
      console.error("Stripe create session error:", stripeRes.status, errText);
      let stripeMessage = "Could not create checkout session";
      try {
        const errJson = JSON.parse(errText) as { error?: { message?: string } };
        if (errJson?.error?.message) stripeMessage = errJson.error.message;
      } catch {
        if (errText && errText.length < 200) stripeMessage = errText;
      }
      return new Response(
        JSON.stringify({ error: stripeMessage }),
        { status: 502, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
    const session = (await stripeRes.json()) as { url?: string };
    if (!session?.url) {
      return new Response(
        JSON.stringify({ error: "No checkout URL" }),
        { status: 502, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("createCheckoutSession error:", err);
    return new Response(
      JSON.stringify({ error: msg && msg.length < 200 ? msg : "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }
});

/** Verify Stripe webhook signature (v1) using HMAC SHA256. */
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const parts = signature.split(",").reduce(
    (acc, part) => {
      const [k, v] = part.split("=");
      if (k === "t") acc.t = v;
      if (k === "v1") acc.v1 = v;
      return acc;
    },
    { t: "", v1: "" } as { t: string; v1: string }
  );
  if (!parts.t || !parts.v1) return false;
  const signed = `${parts.t}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signed)
  );
  const expected = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return parts.v1 === expected;
}

/** POST /stripe-webhook — Stripe sends subscription/checkout events here. */
const stripeWebhook = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || !sig) {
    return new Response("Bad config", { status: 500 });
  }
  const verified = await verifyStripeSignature(body, sig, webhookSecret);
  if (!verified) {
    return new Response("Invalid signature", { status: 400 });
  }
  let event: {
    type: string;
    data: {
      object: {
        customer?: string;
        id?: string;
        status?: string;
        client_reference_id?: string;
        subscription?: string;
      };
    };
  };
  try {
    event = JSON.parse(body) as typeof event;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // New customer + subscription from Checkout: link profile by userId
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      client_reference_id?: string;
      customer?: string;
      subscription?: string;
    };
    const userId = session.client_reference_id;
    const customerId =
      typeof session.customer === "string" ? session.customer : undefined;
    if (userId && customerId) {
      await ctx.runMutation(internal.profiles.setPlanFromCheckout, {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : undefined,
      });
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const customerId = event.data?.object?.customer ?? event.data?.object?.id;
  if (!customerId) {
    return new Response("No customer", { status: 400 });
  }
  const plan =
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.updated"
      ? (event.data.object.status === "active" ? "pro" : "free")
      : event.type === "invoice.paid" || event.type === "customer.subscription.created"
        ? "pro"
        : null;
  if (plan) {
    await ctx.runMutation(internal.profiles.setPlanFromStripe, {
      stripeCustomerId: customerId,
      plan,
      stripeSubscriptionId:
        event.data?.object?.id && event.type?.startsWith("customer.subscription")
          ? event.data.object.id
          : undefined,
    });
  }
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

const http = httpRouter();
http.route({ path: "/getPlan", method: "GET", handler: getPlan });
http.route({ path: "/getPlan", method: "OPTIONS", handler: getPlan });
http.route({ path: "/setLocale", method: "POST", handler: setLocale });
http.route({ path: "/setLocale", method: "OPTIONS", handler: setLocale });
http.route({ path: "/createCheckoutSession", method: "GET", handler: createCheckoutSession });
http.route({ path: "/createCheckoutSession", method: "POST", handler: createCheckoutSession });
http.route({ path: "/createCheckoutSession", method: "OPTIONS", handler: createCheckoutSession });
http.route({ path: "/stripe-webhook", method: "POST", handler: stripeWebhook });

export default http;
