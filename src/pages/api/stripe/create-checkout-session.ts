import type { APIRoute } from "astro";
import { stripe } from "@/lib/stripe";

export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const body = await request.json();
    const { priceId, successUrl, cancelUrl } = body;

    // Validate required fields
    if (!priceId) {
      return new Response(JSON.stringify({ error: "Missing priceId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get the base URL from environment or request
    const baseUrl = import.meta.env.PUBLIC_APP_URL || url.origin;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${baseUrl}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/?canceled=true`,
      // Optional: Add metadata for tracking
      allow_promotion_codes: true,
      metadata: {
        product: "video_content",
      },
    });

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Stripe checkout error:", error);

    return new Response(
      JSON.stringify({
        error: error?.message || "Failed to create checkout session",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
