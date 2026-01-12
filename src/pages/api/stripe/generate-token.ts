import type { APIRoute } from "astro";
import { stripe } from "@/lib/stripe";
import { createToken } from "@/lib/auth";

export const prerender = false;

/**
 * Generate access token for a verified Stripe session
 * This endpoint is called from the success page after payment
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Missing sessionId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify the session with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Check if payment was successful
    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ error: "Payment not completed" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check if this is for animated wallpapers
    if (session.metadata?.product !== "animated_wallpapers_all_access") {
      return new Response(
        JSON.stringify({ error: "Invalid product" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate access token (valid for 100 years - essentially lifetime)
    const customerEmail =
      session.customer_details?.email || session.customer_email || "unknown";

    const payload = {
      email: customerEmail,
      product: "animated_wallpapers_all_access",
      sessionId: session.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 100, // 100 years
    };

    const token = await createToken(payload, import.meta.env.STRIPE_SECRET_KEY);

    return new Response(
      JSON.stringify({
        token,
        email: customerEmail,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Token generation error:", error);
    return new Response(
      JSON.stringify({
        error: error?.message || "Failed to generate access token",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

