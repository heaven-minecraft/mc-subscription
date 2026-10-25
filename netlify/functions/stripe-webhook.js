const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return { statusCode: 400, body: 'Webhook Error: ' + err.message };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    await fetch(process.env.HOME_SERVER_URL + '/api/webhook/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-home-secret': process.env.HOME_SERVER_SECRET },
      body: JSON.stringify({ email: session.customer_details.email, userId: session.client_reference_id, status: 'active' })
    });
  }
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};