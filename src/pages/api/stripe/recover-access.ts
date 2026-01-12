import type { APIRoute } from "astro";
import { stripe } from "@/lib/stripe";
import { createToken } from "@/lib/auth";
import { Resend } from "resend";

export const prerender = false;

/**
 * Recover access by email
 * Searches Stripe for successful payments and sends a magic link via email
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Search for checkout sessions with this email
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
    });

    // Find sessions for this email with successful payments
    const userSessions = sessions.data.filter((session) => {
      const sessionEmail =
        session.customer_details?.email || session.customer_email;
      return (
        sessionEmail?.toLowerCase() === email.toLowerCase() &&
        session.payment_status === "paid" &&
        session.metadata?.product === "video_content"
      );
    });

    if (userSessions.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "No purchase found for this email. Please check your email or contact support.",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Use the most recent session
    const latestSession = userSessions[0];

    // Generate magic link token (short-lived, 1 hour)
    const magicLinkPayload = {
      email: email.toLowerCase(),
      sessionId: latestSession.id,
      type: "magic_link",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiry
    };

    const magicToken = await createToken(
      magicLinkPayload,
      import.meta.env.STRIPE_SECRET_KEY
    );

    // Get site URL from request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const magicLink = `${baseUrl}/verify-access?token=${magicToken}`;

    // Initialize Resend
    const resendApiKey = import.meta.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({
          error: "Email service not configured",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const resend = new Resend(resendApiKey);

    // Send magic link email
    const { data, error } = await resend.emails.send({
      from: "noreply@watchmefans.com",
      to: email,
      subject: "Recover Your watchmefans Access",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
              }
              .container {
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
              }
              .content {
                padding: 40px 30px;
              }
              .content p {
                margin: 0 0 20px 0;
                font-size: 16px;
                line-height: 1.6;
              }
              .button-container {
                text-align: center;
                margin: 30px 0;
              }
              .button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                padding: 16px 40px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
              }
              .button:hover {
                box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
              }
              .security-note {
                background: #f9fafb;
                border-left: 4px solid #667eea;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .security-note p {
                margin: 0;
                font-size: 14px;
                color: #6b7280;
              }
              .footer {
                text-align: center;
                padding: 20px 30px;
                background: #f9fafb;
                color: #9ca3af;
                font-size: 12px;
                border-top: 1px solid #e5e7eb;
              }
              .footer a {
                color: #667eea;
                text-decoration: none;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Recover Your Access</h1>
              </div>
              <div class="content">
                <p>Hi there!</p>
                <p>We received a request to recover access to your WatchMeFans content. Click the button below to securely access your videos:</p>
                
                <div class="button-container">
                  <a href="${magicLink}" class="button">
                    Access My Content
                  </a>
                </div>

                <div class="security-note">
                  <p><strong>🔒 Security Notice:</strong> This link will expire in 1 hour and can only be used once. If you didn't request this, you can safely ignore this email.</p>
                </div>

                <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                  Or copy and paste this link into your browser:<br>
                  <a href="${magicLink}" style="color: #667eea; word-break: break-all;">${magicLink}</a>
                </p>
              </div>
              <div class="footer">
                <p>
                  Need help? <a href="${baseUrl}/contact">Contact Support</a><br>
                  This email was sent by watchmefans
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to send recovery email",
          details: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("Magic link email sent to:", email);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Recovery email sent successfully",
        emailId: data?.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Token recovery error:", error);
    return new Response(
      JSON.stringify({
        error: error?.message || "Failed to recover access",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
