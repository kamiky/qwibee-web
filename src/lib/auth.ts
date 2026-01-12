/**
 * JWT-based authentication for animated wallpapers
 * Uses Stripe secret as the signing key
 */

const ALGORITHM = { name: "HMAC", hash: "SHA-256" };

/**
 * Convert base64 to URL-safe base64
 */
function toUrlSafeBase64(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Convert URL-safe base64 to regular base64
 */
function fromUrlSafeBase64(urlSafeBase64: string): string {
  let base64 = urlSafeBase64.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if needed
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  return base64;
}

/**
 * Create a JWT token with URL-safe encoding
 */
export async function createToken(
  payload: Record<string, any>,
  secret: string
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };

  const encodedHeader = toUrlSafeBase64(btoa(JSON.stringify(header)));
  const encodedPayload = toUrlSafeBase64(btoa(JSON.stringify(payload)));

  const message = `${encodedHeader}.${encodedPayload}`;

  // Import the secret key
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    ALGORITHM,
    false,
    ["sign"]
  );

  // Sign the message
  const signature = await crypto.subtle.sign(
    ALGORITHM.name,
    key,
    encoder.encode(message)
  );

  // Convert signature to URL-safe base64
  const encodedSignature = toUrlSafeBase64(
    btoa(String.fromCharCode(...new Uint8Array(signature)))
  );

  return `${message}.${encodedSignature}`;
}

/**
 * Verify a JWT token (handles both URL-safe and regular base64)
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<Record<string, any> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const message = `${encodedHeader}.${encodedPayload}`;

    // Import the secret key
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      ALGORITHM,
      false,
      ["verify"]
    );

    // Decode signature (convert from URL-safe base64 first)
    const signature = Uint8Array.from(
      atob(fromUrlSafeBase64(encodedSignature)),
      (c) => c.charCodeAt(0)
    );

    // Verify signature
    const isValid = await crypto.subtle.verify(
      ALGORITHM.name,
      key,
      signature,
      encoder.encode(message)
    );

    if (!isValid) return null;

    // Decode payload (convert from URL-safe base64 first)
    const payload = JSON.parse(atob(fromUrlSafeBase64(encodedPayload)));

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}

/**
 * Client-side: Store access token
 */
export function storeAccessToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("animated_wallpapers_access", token);
  }
}

/**
 * Client-side: Get access token
 */
export function getAccessToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("animated_wallpapers_access");
  }
  return null;
}

/**
 * Client-side: Clear access token
 */
export function clearAccessToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("animated_wallpapers_access");
  }
}

/**
 * Client-side: Check if user has access
 */
export async function hasAccess(secret: string): Promise<boolean> {
  const token = getAccessToken();
  if (!token) return false;

  const payload = await verifyToken(token, secret);
  return payload !== null;
}

