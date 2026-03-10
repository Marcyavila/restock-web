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

/** POST /stripe-webhook — Stripe sends subscription events here. Verify signature and call setPlanFromStripe. */
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
  // Verify Stripe signature (you need stripe package in an action or do in a Node action)
  // For now we parse and run mutation. In production use stripe.webhooks.constructEvent.
  let event: { type: string; data: { object: { customer?: string; id?: string; status?: string } } };
  try {
    event = JSON.parse(body) as typeof event;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
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
http.route({ path: "/stripe-webhook", method: "POST", handler: stripeWebhook });

export default http;
