import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const creatorMode = context.cookies.get("qwb-creator-mode")?.value === "true";

  const mode = creatorMode ? "creator" : "app";
  const pathname = context.url.pathname;

  // List of routes that need mode-based routing
  const routes = [
    "/login",
    "/login/success",
    "/account",
    "/contact",
    "/privacy-policy",
    "/terms-of-sale",
    "/404",
  ];

  // Extract language prefix if present (e.g., /fr/, /en/)
  const langMatch = pathname.match(/^\/(fr|en)(\/|$)/);
  const langPrefix = langMatch ? `/${langMatch[1]}` : "";
  const pathWithoutLang = langPrefix ? pathname.substring(langPrefix.length) : pathname;

  // Check if the current pathname matches any route (with or without trailing slash)
  for (const route of routes) {
    if (pathWithoutLang === route || pathWithoutLang === `${route}/`) {
      return context.rewrite(`${langPrefix}${route}/${mode}`);
    }
  }

  // Check app access for /apps routes
  if (pathname.startsWith("/apps")) {
    let hasAppAccess = false;
    const accessToken = context.cookies.get("qwb_access_token")?.value;

    if (accessToken) {
      try {
        const backendUrl =
          import.meta.env.PUBLIC_API_URL || "http://localhost:8002";
        const response = await fetch(`${backendUrl}/auth/verify-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: accessToken }),
        });

        if (response.ok) {
          const data = await response.json();

          if (data.data.valid) {
            // Check for app membership (profileId === null, type === "apps")
            const appMembership = data.data.memberships?.find(
              (m: any) =>
                m.type === "apps" &&
                (m.status === "active" || m.status === "trialing")
            );

            // Check for app lifetime purchase (type === "apps")
            const appLifetimePurchase = data.data.purchasedContent?.find(
              (pc: any) => pc.type === "apps"
            );

            hasAppAccess = !!(appMembership || appLifetimePurchase);
          }
        }
      } catch (error) {
        console.error("Error verifying app access:", error);
      }
    }

    // Redirect to home if no access
    if (!hasAppAccess) {
      return context.redirect("/");
    }
  }

  return next();
});
