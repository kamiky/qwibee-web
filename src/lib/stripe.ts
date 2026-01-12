import Stripe from "stripe";

if (!import.meta.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

export const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});

export const STRIPE_CONFIG = {
  publicKey: import.meta.env.STRIPE_PUBLIC_KEY,
  productId: import.meta.env.STRIPE_PRODUCT_ID,
  priceId: import.meta.env.STRIPE_PRICE_ID,
};
