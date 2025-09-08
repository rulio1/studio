import { Stripe, loadStripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (publicKey) {
      stripePromise = loadStripe(publicKey);
    } else {
      console.warn("Stripe public key is not set. Stripe functionality will be disabled.");
      stripePromise = Promise.resolve(null);
    }
  }
  return stripePromise;
};
