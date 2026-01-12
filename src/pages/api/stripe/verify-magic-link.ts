import type { APIRoute } from "astro";
import { stripe } from "@/lib/stripe";
import { verifyToken, createToken } from "@/lib/auth";

export const prerender = false;

/**
 * Verify magic link token and generate access token
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify the magic link token
    const payload = await verifyToken(token, import.meta.env.STRIPE_SECRET_KEY);

    if (!payload) {
      return new Response(
        JSON.stringify({
          error: "Invalid or expired magic link",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify this is a magic link token
    if (payload.type !== "magic_link") {
      return new Response(
        JSON.stringify({
          error: "Invalid token type",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify the session still exists and is valid
    const session = await stripe.checkout.sessions.retrieve(payload.sessionId);

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({
          error: "Payment not completed",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (session.metadata?.product !== "animated_wallpapers_all_access") {
      return new Response(
        JSON.stringify({
          error: "Invalid product",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate long-lived access token
    const accessTokenPayload = {
      email: payload.email,
      product: "animated_wallpapers_all_access",
      sessionId: session.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 100, // 100 years
      recovered: true,
      recoveredAt: Math.floor(Date.now() / 1000),
    };

    const accessToken = await createToken(
      accessTokenPayload,
      import.meta.env.STRIPE_SECRET_KEY
    );

    return new Response(
      JSON.stringify({
        success: true,
        token: accessToken,
        email: payload.email,
        purchaseDate: new Date(session.created * 1000).toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Magic link verification error:", error);
    return new Response(
      JSON.stringify({
        error: error?.message || "Failed to verify magic link",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
