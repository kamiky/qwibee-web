import type { APIRoute } from "astro";
import { stripe } from "@/lib/stripe";
import { createToken } from "@/lib/auth";

export const prerender = false;

/**
 * Stripe webhook handler
 * This endpoint receives events from Stripe (e.g., successful payments)
 * and generates access tokens for customers
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return new Response(JSON.stringify({ error: "No signature" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("Missing STRIPE_WEBHOOK_SECRET");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle the event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      // Check if this is for animated wallpapers
      if (session.metadata?.product === "animated_wallpapers_all_access") {
        console.log("Payment successful for animated wallpapers:", session.id);

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

        const token = await createToken(
          payload,
          import.meta.env.STRIPE_SECRET_KEY
        );

        // In a real app, you would send this token via email to the customer
        // For now, we'll return it in the response (but Stripe won't show this to the user)
        console.log("Generated access token for:", customerEmail);
        console.log("Token:", token);

        // You could use a service like SendGrid, Resend, or Nodemailer to email the token
        // For now, we'll store it in session metadata for retrieval on success page
        
        // Note: We can't modify the session here, but we can log it for manual delivery
        // The best approach is to redirect to a success page that generates the token client-side
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Webhook handler failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

