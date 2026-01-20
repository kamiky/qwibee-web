import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const body = await request.json();
    const { customerEmail, subscriptionId } = body;

    // Validate required fields
    if (!customerEmail || !customerEmail.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Invalid customerEmail" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get the base URL
    const baseUrl = import.meta.env.PUBLIC_APP_URL || url.origin;
    const backendUrl = import.meta.env.PUBLIC_API_URL || "http://localhost:5002";

    // Prepare return URL (where user will be redirected after managing subscription)
    const returnUrl = `${baseUrl}/account`;

    // Call backend API to create portal session
    const response = await fetch(
      `${backendUrl}/stripe/create-portal-session`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerEmail,
          returnUrl,
          ...(subscriptionId && { subscriptionId }),
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create portal session");
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        url: data.data.url,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Stripe portal session error:", error);

    return new Response(
      JSON.stringify({
        error: error?.message || "Failed to create customer portal session",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
