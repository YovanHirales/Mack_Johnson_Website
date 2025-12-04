import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const session = await stripe.checkout.sessions.create({
	line_items: [
		{
			// Provide the exact Price ID (for example, price_1234) of the product you want to sell
			price: 'price_1SQcGZQUcTF9g5AtEy1pzkPK',
			quantity: 1,
		},
	],
	mode: 'payment',
	success_url: `${origin}?success=true`,
	cancel_url: `${origin}?canceled=true`,
	automatic_tax: { enabled: true },
});

export async function POST({ request }) {
	try {
		// Expecting a JSON payload like: { priceId: "price_123", quantity: 1 }
		// You can replace this with your own server-side price mapping if you don't want
		// to accept price IDs directly from the client.
		const { priceId, quantity = 1, mode = 'payment' } = await request.json();

		// Defensive checks (don’t trust client input)
		if (!priceId || typeof quantity !== 'number' || quantity < 1) {
			return json({ error: 'Invalid input' }, 400);
		}

		// Figure out success/cancel URLs
		// Prefer a configured SITE_URL (e.g., https://yourdomain.com) and fall back to request origin
		const origin =
			import.meta.env.SITE_URL || request.headers.get('origin') || '';
		const successUrl = `${origin}/checkout/success`;
		const cancelUrl = `${origin}/checkout/cancel`;

		// Create the session
		const session = await stripe.checkout.sessions.create({
			mode, // 'payment' or 'subscription'
			line_items: [{ price: priceId, quantity }],
			success_url: successUrl,
			cancel_url: cancelUrl,

			// Optional niceties:
			// automatic_tax: { enabled: true },
			// billing_address_collection: 'auto',
			// allow_promotion_codes: true,
			// metadata: { cartId: 'abc123' },
		});

		// Return the URL (simplest) — client can window.location = data.url
		return json({ url: session.url }, 200);

		// Alternative: return { id: session.id } and use Stripe.js redirectToCheckout({ sessionId })
	} catch (err) {
		console.error('Stripe create-checkout-session error:', err);
		return json({ error: 'Unable to create checkout session' }, 500);
	}
}

// Small helper to respond JSON consistently
function json(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}
