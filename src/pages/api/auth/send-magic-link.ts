import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, redirectUrl, openStripe, language } = body;

    if (!email) {
      console.log("[400] Missing email:", { error: "Missing email" });
      return new Response(
        JSON.stringify({ error: "Missing email" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const backendUrl =
      import.meta.env.PUBLIC_API_URL || "http://localhost:5002";

    const response = await fetch(`${backendUrl}/auth/send-magic-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        email,
        redirectUrl,
        openStripe,
        language 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to send magic link");
    }

    const data = await response.json();

    console.log("[200] Success:", data);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Send magic link error:", error);

    const errorResponse = {
      error: error?.message || "Failed to send magic link",
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
