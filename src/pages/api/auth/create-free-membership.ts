import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { profileId, token } = body;

    // Validate required fields
    if (!profileId) {
      console.log("[400] Missing profileId:", { error: "Missing profileId" });
      return new Response(JSON.stringify({ error: "Missing profileId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!token) {
      console.log("[400] Missing token:", { error: "Missing token" });
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const backendUrl =
      import.meta.env.PUBLIC_API_URL || "http://localhost:8002";

    const response = await fetch(`${backendUrl}/auth/create-free-membership`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profileId,
        token,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create free membership");
    }

    const data = await response.json();

    const successResponse = {
      success: data.success,
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
    console.error("Create free membership error:", error);

    const errorResponse = {
      error: error?.message || "Failed to create free membership",
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
