/**
 * Authentication utilities for watchmefans
 * Handles access tokens, refresh tokens, and user sessions
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
 * Store authentication tokens and user info
 */
export function storeAuth(tokens: AuthTokens): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(tokens.user));
  }
}

/**
 * Get access token
 */
export function getAccessToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }
  return null;
}

/**
 * Get refresh token
 */
export function getRefreshToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return null;
}

/**
 * Get stored user info
 */
export function getUser(): User | null {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        return null;
      }
    }
  }
  return null;
}

/**
 * Clear all authentication data
 */
export function clearAuth(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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
      // Update access token (keep same refresh token)
      if (typeof window !== "undefined") {
        localStorage.setItem(ACCESS_TOKEN_KEY, data.data.accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
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
