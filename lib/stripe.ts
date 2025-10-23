import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe | null {
  // Don't initialize during build time
  if (typeof window !== 'undefined' || process.env.NODE_ENV === 'test') {
    return null;
  }
  
  if (stripeInstance) return stripeInstance;
  
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeSecretKey) {
    console.warn('STRIPE_SECRET_KEY is not set');
    return null;
  }
  
  stripeInstance = new Stripe(stripeSecretKey, {
    apiVersion: '2025-09-30.clover',
  });
  
  return stripeInstance;
}

export const KFC_TO_INR_RATE = 1.2; // 1 KFC = 1.2 Rupees