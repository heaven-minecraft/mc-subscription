const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  const token = event.headers.authorization?.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { statusCode: 401, body: JSON.stringify({ error: '未登录' }) };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: { user_id: user.id, email: user.email },
      success_url: process.env.SITE_URL + '/?success=true',
      cancel_url: process.env.SITE_URL + '/?canceled=true',
    });
    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};