import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { sessionId, profileId } = body;

    if (!sessionId || !profileId) {
      console.log("[400] Missing sessionId or profileId:", { sessionId, profileId });
      return new Response(
        JSON.stringify({ error: "Missing sessionId or profileId" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const backendUrl =
      import.meta.env.PUBLIC_API_URL || "http://localhost:5002";

    const response = await fetch(`${backendUrl}/auth/verify-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        profileId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to verify session");
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Verify session error:", error);

    const errorResponse = {
      error: error?.message || "Failed to verify session",
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
