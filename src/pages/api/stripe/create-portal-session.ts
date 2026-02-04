import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const body = await request.json();
    const { customerEmail, subscriptionId } = body;

    // Validate required fields
    if (!customerEmail || !customerEmail.includes("@")) {
      console.log("[400] Invalid customerEmail:", { error: "Invalid customerEmail", customerEmail });
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
    const backendUrl = import.meta.env.PUBLIC_API_URL || "http://localhost:8002";

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

    const successResponse = {
      url: data.data.url,
    };
    console.log("[200] Success:", successResponse);
    return new Response(
      JSON.stringify(successResponse),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Stripe portal session error:", error);

    const errorResponse = {
      error: error?.message || "Failed to create customer portal session",
    };
    console.log("[500] Error:", errorResponse);
    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
