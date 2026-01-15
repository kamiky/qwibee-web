import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const body = await request.json();
    const { profileId, videoId, contentPrice, customerEmail, language, videoTitle, creatorDisplayName } = body;

    // Validate required fields
    if (!profileId) {
      return new Response(JSON.stringify({ error: "Missing profileId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!videoId) {
      return new Response(JSON.stringify({ error: "Missing videoId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!contentPrice || contentPrice < 1) {
      return new Response(
        JSON.stringify({ error: "Invalid contentPrice" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate customer email if provided
    if (customerEmail && !customerEmail.includes("@")) {
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

    // Prepare success and cancel URLs
    const successUrl = `${baseUrl}/${profileId}?content_purchase=success&video_id=${videoId}`;
    const cancelUrl = `${baseUrl}/${profileId}?content_purchase=canceled`;

    // Call backend API to create content checkout session
    const response = await fetch(
      `${backendUrl}/stripe/create-content-checkout-session`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId,
          videoId,
          contentPrice,
          successUrl,
          cancelUrl,
          customerEmail,
          language,
          videoTitle,
          creatorDisplayName,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create content checkout session");
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        sessionId: data.data.sessionId,
        url: data.data.url,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Stripe content checkout error:", error);

    return new Response(
      JSON.stringify({
        error: error?.message || "Failed to create content checkout session",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
