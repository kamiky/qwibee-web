import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, profileId } = body;

    if (!email || !profileId) {
      return new Response(
        JSON.stringify({ error: "Missing email or profileId" }),
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
        profileId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to send magic link");
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Send magic link error:", error);

    return new Response(
      JSON.stringify({
        error: error?.message || "Failed to send magic link",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
