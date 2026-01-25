import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((context, next) => {
  const creatorMode = context.cookies.get("qwb-creator-mode")?.value === "true";
  console.log("MIDDLEWARE : ", { creatorMode });

  // Handle login route
  if (context.url.pathname === "/login" || context.url.pathname === "/login/") {
    console.log(`REDIRECTING TO /login/${creatorMode ? "creator" : "app"}`);
    return context.rewrite(`/login/${creatorMode ? "creator" : "app"}`);
  }

  // Handle account route
  if (
    context.url.pathname === "/account" ||
    context.url.pathname === "/account/"
  ) {
    return context.rewrite(`/account/${creatorMode ? "creator" : "app"}`);
  }

  return next();
});
