/**
 * Authentication utilities for watchmefans
 * Handles access tokens, refresh tokens, and user sessions using cookies
 */

const ACCESS_TOKEN_KEY = "wmf_access_token";
const REFRESH_TOKEN_KEY = "wmf_refresh_token";
const USER_KEY = "wmf_user";

export interface User {
  id: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/**
 * Helper to get cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift();
    return cookieValue ? decodeURIComponent(cookieValue) : null;
  }
  return null;
}

/**
 * Helper to set cookie
 */
function setCookie(name: string, value: string, days: number = 7): void {
  if (typeof document === "undefined") return;
  
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  
  // Use Secure in production, allow non-secure in development
  const isProduction = window.location.protocol === 'https:';
  const secureFlag = isProduction ? '; Secure' : '';
  
  // URL encode the value to handle special characters
  const encodedValue = encodeURIComponent(value);
  document.cookie = `${name}=${encodedValue}; path=/; expires=${expires.toUTCString()}; SameSite=Lax${secureFlag}`;
}

/**
 * Helper to delete cookie
 */
function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax`;
}

/**
 * Store authentication tokens and user info in cookies
 */
export function storeAuth(tokens: AuthTokens): void {
  if (typeof window !== "undefined") {
    // Store all auth data in cookies
    setCookie(ACCESS_TOKEN_KEY, tokens.accessToken, 7);
    setCookie(REFRESH_TOKEN_KEY, tokens.refreshToken, 90); // Refresh tokens last longer
    setCookie(USER_KEY, JSON.stringify(tokens.user), 90);
    
    // Clean up old localStorage data if it exists
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

/**
 * Get access token from cookie
 */
export function getAccessToken(): string | null {
  return getCookie(ACCESS_TOKEN_KEY);
}

/**
 * Get refresh token from cookie
 */
export function getRefreshToken(): string | null {
  return getCookie(REFRESH_TOKEN_KEY);
}

/**
 * Get stored user info from cookie
 */
export function getUser(): User | null {
  const userStr = getCookie(USER_KEY);
  if (userStr) {
    try {
      // getCookie already decodes, so just parse
      return JSON.parse(userStr);
    } catch (error) {
      console.error("Error parsing user data from cookie:", error);
      return null;
    }
  }
  return null;
}

/**
 * Get all authentication data
 */
export function getAuth(): AuthTokens | null {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  const user = getUser();

  if (!accessToken || !refreshToken || !user) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    user,
  };
}

/**
 * Clear all authentication data from cookies
 */
export function clearAuth(): void {
  if (typeof window !== "undefined") {
    deleteCookie(ACCESS_TOKEN_KEY);
    deleteCookie(REFRESH_TOKEN_KEY);
    deleteCookie(USER_KEY);
    
    // Clean up old localStorage data if it exists
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("wmf_profile_id");
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

/**
 * Verify access token with backend
 */
export async function verifyToken(): Promise<{
  valid: boolean;
  user?: User;
  memberships?: any[];
  reason?: string;
}> {
  const token = getAccessToken();
  if (!token) {
    return { valid: false, reason: "No token found" };
  }

  try {
    const backendUrl = import.meta.env.PUBLIC_API_URL || "http://localhost:5002";
    const response = await fetch(`${backendUrl}/auth/verify-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();
    
    if (data.success && data.data.valid) {
      return {
        valid: true,
        user: data.data.user,
        memberships: data.data.memberships,
      };
    } else {
      return {
        valid: false,
        reason: data.data?.reason || "Token is invalid",
      };
    }
  } catch (error) {
    console.error("Token verification error:", error);
    return {
      valid: false,
      reason: "Failed to verify token",
    };
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  try {
    const backendUrl = import.meta.env.PUBLIC_API_URL || "http://localhost:5002";
    const response = await fetch(`${backendUrl}/auth/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearAuth();
      return false;
    }

    const data = await response.json();
    
    if (data.success) {
      // Update access token and user in cookies (keep same refresh token)
      if (typeof window !== "undefined") {
        setCookie(ACCESS_TOKEN_KEY, data.data.accessToken, 7);
        setCookie(USER_KEY, JSON.stringify(data.data.user), 90);
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error("Token refresh error:", error);
    return false;
  }
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  
  try {
    const backendUrl = import.meta.env.PUBLIC_API_URL || "http://localhost:5002";
    await fetch(`${backendUrl}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    clearAuth();
  }
}

/**
 * Get user memberships
 */
export async function getMemberships(): Promise<any[]> {
  const token = getAccessToken();
  if (!token) {
    return [];
  }

  try {
    const backendUrl = import.meta.env.PUBLIC_API_URL || "http://localhost:5002";
    const response = await fetch(`${backendUrl}/auth/memberships`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // Try to refresh token and retry
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return getMemberships(); // Retry with new token
      }
      return [];
    }

    const data = await response.json();
    return data.success ? data.data.memberships : [];
  } catch (error) {
    console.error("Get memberships error:", error);
    return [];
  }
}

/**
 * Check if user has access to a specific profile
 */
export async function hasProfileAccess(profileId: string): Promise<boolean> {
  const memberships = await getMemberships();
  return memberships.some(
    (m) => m.profileId === profileId && ["active", "trialing"].includes(m.status)
  );
}
