
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('A variável de ambiente STRIPE_SECRET_KEY não está definida em produção.');
  } else {
    console.warn('A variável de ambiente STRIPE_SECRET_KEY não está definida. A integração com o Stripe não funcionará.');
  }
}

export const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2024-06-20',
  typescript: true,
});
