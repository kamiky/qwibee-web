import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse the request body
    const body = await request.json();
    const { name, email, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      console.log("[400] Missing required fields:", { name, email, message });
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("[400] Invalid email format:", { email });
      return new Response(
        JSON.stringify({
          error: "Invalid email format",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Forward to backend API
    const backendUrl = import.meta.env.PUBLIC_API_URL || "http://localhost:5002";
    const response = await fetch(`${backendUrl}/contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, message }),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorResponse = {
        error: result.message || "Failed to send message",
        details: result.errors,
      };
      console.log(`[${response.status}] Backend error:`, errorResponse);
      return new Response(
        JSON.stringify(errorResponse),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const successResponse = {
      success: true,
      message: "Email sent successfully",
    };
    console.log("[200] Success:", successResponse);
    return new Response(
      JSON.stringify(successResponse),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    const errorResponse = {
      error: "An unexpected error occurred",
      details: error instanceof Error ? error.message : "Unknown error",
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
