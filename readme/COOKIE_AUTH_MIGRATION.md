# Cookie-Based Authentication Migration

## Overview

The authentication system has been migrated from localStorage to cookies for better server-side rendering (SSR) support and security.

## Why Cookies?

1. **Server-Side Access**: Astro can read cookies during SSR to unlock content before page renders
2. **No Flash of Locked Content**: Users see unlocked content immediately
3. **Better Security**: Cookies can be set with Secure and HttpOnly flags in production
4. **Simpler Architecture**: Single source of truth for authentication state

## Implementation

### Auth Storage (`src/lib/auth.ts`)

All authentication data is now stored in cookies:

- `wmf_access_token` - Access token (7 days expiry)
- `wmf_refresh_token` - Refresh token (90 days expiry)  
- `wmf_user` - User data as JSON (90 days expiry)

### Cookie Settings

```typescript
// Development (HTTP)
path=/; SameSite=Lax

// Production (HTTPS) - adds Secure flag
path=/; SameSite=Lax; Secure
```

### Server-Side Usage

Pages can access authentication during SSR:

```typescript
// In .astro files
const accessToken = Astro.cookies.get('wmf_access_token')?.value;

if (accessToken) {
  // Verify token and unlock content
  const response = await fetch(`${backendUrl}/auth/verify-token`, {
    method: 'POST',
    body: JSON.stringify({ token: accessToken }),
  });
  
  if (response.ok) {
    const data = await response.json();
    // Use membership and purchased content data
  }
}
```

### Client-Side Usage

Use the helper functions from `@/lib/auth`:

```typescript
import { storeAuth, getAuth, getAccessToken, clearAuth } from "@/lib/auth";

// Store auth after login/signup
storeAuth({
  accessToken: "...",
  refreshToken: "...",
  user: { id: "...", email: "..." }
});

// Get auth data
const auth = getAuth();
if (auth) {
  console.log(auth.user.email);
}

// Get just the access token
const token = getAccessToken();

// Logout
clearAuth();
```

## Migration Path

### Old (localStorage only)
```typescript
localStorage.setItem("wmf_access_token", token);
const token = localStorage.getItem("wmf_access_token");
localStorage.removeItem("wmf_access_token");
```

### New (cookies)
```typescript
import { storeAuth, getAccessToken, clearAuth } from "@/lib/auth";

storeAuth({ accessToken, refreshToken, user });
const token = getAccessToken();
clearAuth();
```

## Automatic Cleanup

The `storeAuth()` and `clearAuth()` functions automatically clean up any old localStorage data to prevent confusion.

## Files Updated

1. ✅ `src/lib/auth.ts` - Core auth functions (cookies only)
2. ✅ `src/pages/creator/[profileId]/index.astro` - Server-side content unlocking
3. ✅ `src/pages/creator/[profileId]/profilePage.script.ts` - Client-side auth usage
4. ✅ `src/pages/account/account.script.ts` - Account page auth
5. ✅ `src/pages/login.astro` - Login page auth check
6. ✅ `src/pages/login/success.astro` - Already using `storeAuth()`

## Testing

1. **Clear all cookies and localStorage**
2. **Login or subscribe to a creator**
3. **Verify cookies are set** (DevTools → Application → Cookies)
4. **Refresh page** - content should be unlocked immediately (no flash)
5. **Check server logs** - should see token verification during page render

## Security Notes

### Current (Development)
- Cookies are not Secure (works with HTTP)
- Cookies are not HttpOnly (JavaScript can access them)
- SameSite=Lax (prevents CSRF)

### Production (TODO)
- Add `Secure` flag (HTTPS only)
- Consider `HttpOnly` for refresh token
- Add CSRF protection for sensitive operations

## Benefits

✅ **Faster page loads** - No client-side unlock delay  
✅ **Better UX** - No flash of locked content  
✅ **SSR compatible** - Server can check auth  
✅ **Cleaner code** - Single source of truth  
✅ **Auto cleanup** - Removes old localStorage data
