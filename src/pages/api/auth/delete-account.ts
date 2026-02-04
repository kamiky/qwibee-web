import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { userId, confirmDelete } = body;

    if (!userId || !confirmDelete) {
      console.log("[400] Missing userId or confirmDelete:", { userId, confirmDelete });
      return new Response(
        JSON.stringify({
          error: "User ID and confirmation are required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const backendUrl =
      import.meta.env.PUBLIC_API_URL || "http://localhost:8002";

    const response = await fetch(`${backendUrl}/auth/delete-account`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, confirmDelete }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to delete account");
    }

    const data = await response.json();

    console.log("[200] Success:", data);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Delete account error:", error);

    const errorResponse = {
      error: error?.message || "Failed to delete account",
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
