import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Profiles store plan and Stripe data per user.
 * userId is the Clerk subject (sub) from the JWT.
 */
export default defineSchema({
  profiles: defineTable({
    userId: v.string(),
    email: v.optional(v.string()),
    plan: v.union(v.literal("free"), v.literal("pro")),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_stripe_customer", ["stripeCustomerId"]),
});
