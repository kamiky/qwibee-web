import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((context, next) => {
  const creatorMode = context.cookies.get("qwb-creator-mode")?.value === "true";

  const mode = creatorMode ? "creator" : "app";
  const pathname = context.url.pathname;

  // List of routes that need mode-based routing
  const routes = [
    "/login",
    "/account",
    "/contact",
    "/privacy-policy",
    "/terms-of-sale",
    "/404",
  ];

  // Check if the current pathname matches any route (with or without trailing slash)
  for (const route of routes) {
    if (pathname === route || pathname === `${route}/`) {
      return context.rewrite(`${route}/${mode}`);
    }
  }

  return next();
});
