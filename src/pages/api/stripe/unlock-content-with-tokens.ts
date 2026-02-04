import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { profileId, videoId, customerEmail, tokensToUse } = body;

    // Validate required fields
    if (!profileId) {
      console.log("[400] Missing profileId:", { error: "Missing profileId" });
      return new Response(JSON.stringify({ error: "Missing profileId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!videoId) {
      console.log("[400] Missing videoId:", { error: "Missing videoId" });
      return new Response(JSON.stringify({ error: "Missing videoId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!customerEmail) {
      console.log("[400] Missing customerEmail:", { error: "Missing customerEmail" });
      return new Response(JSON.stringify({ error: "Missing customerEmail" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (tokensToUse !== 2) {
      console.log("[400] Invalid tokensToUse:", { error: "Must use exactly 2 tokens", tokensToUse });
      return new Response(JSON.stringify({ error: "Must use exactly 2 tokens for free unlock" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const backendUrl = import.meta.env.PUBLIC_API_URL || "http://localhost:8002";

    // Call backend API to unlock content with tokens
    const response = await fetch(
      `${backendUrl}/stripe/unlock-content-with-tokens`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId,
          videoId,
          customerEmail,
          tokensToUse,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to unlock content with tokens");
    }

    const data = await response.json();

    console.log("[200] Success:", data);
    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Unlock content with tokens error:", error);

    const errorResponse = {
      error: error?.message || "Failed to unlock content with tokens",
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
