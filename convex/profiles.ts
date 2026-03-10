import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const FREE_ITEM_LIMIT = 5;

/** Get current user's plan and limits (for extension or web). */
export const getMyPlan = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const tokenIdentifier = identity.tokenIdentifier;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", tokenIdentifier))
      .unique();
    if (!profile) {
      return {
        plan: "free" as const,
        itemLimit: FREE_ITEM_LIMIT,
        email: identity.email ?? undefined,
      };
    }
    return {
      plan: profile.plan,
      itemLimit: profile.plan === "pro" ? 999 : FREE_ITEM_LIMIT,
      email: profile.email ?? identity.email ?? undefined,
    };
  },
});

/** Ensure a profile exists for the current user (call after first login). */
export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const tokenIdentifier = identity.tokenIdentifier;
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", tokenIdentifier))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        email: identity.email ?? existing.email,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("profiles", {
      userId: tokenIdentifier,
      email: identity.email ?? undefined,
      plan: "free",
      updatedAt: now,
    });
  },
});

/** Set Stripe customer ID on profile (call when creating Stripe Checkout Session). */
export const setStripeCustomerId = mutation({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.tokenIdentifier))
      .unique();
    if (!profile) throw new Error("Profile not found");
    await ctx.db.patch(profile._id, {
      stripeCustomerId: args.stripeCustomerId,
      updatedAt: Date.now(),
    });
  },
});

/** Called by Stripe webhook to set a user to Pro. */
export const setPlanFromStripe = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro")),
    stripeSubscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_stripe_customer", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .unique();
    if (!profile) return;
    await ctx.db.patch(profile._id, {
      plan: args.plan,
      stripeSubscriptionId: args.stripeSubscriptionId ?? profile.stripeSubscriptionId,
      updatedAt: Date.now(),
    });
  },
});
