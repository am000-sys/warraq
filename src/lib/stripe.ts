// src/lib/stripe.ts — تكامل Stripe (بطاقات دوليّة + Apple/Google Pay)
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

export const isStripeConfigured = Boolean(
  secretKey && secretKey.startsWith("sk_"),
);

export const stripe = isStripeConfigured
  ? new Stripe(secretKey!, { apiVersion: "2025-02-24.acacia" })
  : null;

// سعر الصفحة في الدفع لمرّة واحدة (هللات) — افتراضي ٣١ هللة
export const PAYG_PRICE_HALALA = Number(process.env.PAYG_PRICE_HALALA ?? 31);
