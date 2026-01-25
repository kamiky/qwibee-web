import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    const backendUrl =
      import.meta.env.PUBLIC_API_URL || "http://localhost:5002";

    const response = await fetch(`${backendUrl}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to logout");
    }

    const data = await response.json();

    console.log("[200] Success:", data);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Logout error:", error);

    const errorResponse = {
      error: error?.message || "Failed to logout",
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
