import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { paymentIntentId } = body;

    // Validate required fields
    if (!paymentIntentId) {
      console.log("[400] Missing paymentIntentId:", { error: "Missing paymentIntentId" });
      return new Response(JSON.stringify({ error: "Missing paymentIntentId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const backendUrl = import.meta.env.PUBLIC_API_URL || "http://localhost:5002";

    // Call backend API to generate invoice
    const response = await fetch(
      `${backendUrl}/stripe/generate-invoice`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentIntentId,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to generate invoice");
    }

    const data = await response.json();

    const successResponse = {
      success: true,
      data: data.data,
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
    console.error("Invoice generation error:", error);

    const errorResponse = {
      error: error?.message || "Failed to generate invoice",
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
