import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { paymentIntentId } = body;

    // Validate required fields
    if (!paymentIntentId) {
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

    return new Response(
      JSON.stringify({
        success: true,
        data: data.data,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Invoice generation error:", error);

    return new Response(
      JSON.stringify({
        error: error?.message || "Failed to generate invoice",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
