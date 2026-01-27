import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const body = await request.json();
    const { profileId, videoId, contentPrice, priceId, successUrl, cancelUrl, customerEmail, language, videoTitle, creatorDisplayName, debugSecret } = body;

    // Validate required fields
    if (profileId === undefined) {
      console.log("[400] Missing profileId:", { error: "Missing profileId" });
      return new Response(JSON.stringify({ error: "Missing profileId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (videoId === undefined) {
      console.log("[400] Missing videoId:", { error: "Missing videoId" });
      return new Response(JSON.stringify({ error: "Missing videoId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!contentPrice || contentPrice < 1) {
      console.log("[400] Invalid contentPrice:", { error: "Invalid contentPrice", contentPrice });
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
    const backendUrl = import.meta.env.PUBLIC_API_URL || "http://localhost:5002";

    // Determine final destination URLs (these get stored in DB)
    const destinationSuccessUrl = successUrl || `${baseUrl}/creator/${profileId}?content_purchase=success&video_id=${videoId}`;
    const destinationCancelUrl = cancelUrl || `${baseUrl}/creator/${profileId}?content_purchase=canceled`;

    // Create a single redirect token for both success and cancel URLs
    const tokenResponse = await fetch(`${backendUrl}/stripe/create-redirect-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        successUrl: destinationSuccessUrl,
        cancelUrl: destinationCancelUrl
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to create redirect token");
    }

    const tokenData = await tokenResponse.json();
    const token = tokenData.data.token;

    // Use redirect URLs with token and preserve Stripe placeholders
    // For content purchases, we don't need session_id as we already have video_id
    const finalSuccessUrl = `${baseUrl}/redirect?key=${token}&type=success`;
    const finalCancelUrl = `${baseUrl}/redirect?key=${token}&type=cancel`;

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
          priceId,
          successUrl: finalSuccessUrl,
          cancelUrl: finalCancelUrl,
          customerEmail,
          language,
          videoTitle,
          creatorDisplayName,
          debugSecret,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create content checkout session");
    }

    const data = await response.json();

    const successResponse = {
      sessionId: data.data.sessionId,
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
    console.error("Stripe content checkout error:", error);

    const errorResponse = {
      error: error?.message || "Failed to create content checkout session",
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
