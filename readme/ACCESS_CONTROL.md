# Animated Wallpapers Access Control

This document explains how the access control system works for the animated wallpapers without using a traditional backend database.

## 🔐 Security Architecture

The system uses **JWT tokens** signed with your Stripe secret key to grant access to protected `/play` URLs. This approach is secure because:

1. **Cryptographic Signing**: Tokens are signed using HMAC-SHA256 with your Stripe secret key
2. **Cannot Be Forged**: Users cannot create fake tokens without knowing your Stripe secret
3. **Expiration**: Tokens include expiration dates (set to 100 years for lifetime access)
4. **Client-Side Verification**: Fast access checks without server roundtrips
5. **No Database Required**: All authentication data is encoded in the token itself

## 🏗️ How It Works

### 1. **User Purchases Wallpapers**

```
User clicks "Unlock All" → Stripe Checkout → Payment Success
```

### 2. **Token Generation**

After successful payment, the success page (`/animated-wallpapers?success=true&session_id=xxx`) calls:

```typescript
POST /api/stripe/generate-token
Body: { sessionId: "cs_xxx" }

Response: {
  token: "eyJhbGc...", // JWT token
  email: "user@example.com"
}
```

The token contains:
```json
{
  "email": "user@example.com",
  "product": "animated_wallpapers_all_access",
  "sessionId": "cs_xxx",
  "iat": 1704067200,
  "exp": 4860067200  // ~100 years
}
```

### 3. **Token Storage**

The token is stored in the browser's `localStorage`:

```typescript
localStorage.setItem("animated_wallpapers_access", token);
```

### 4. **Protected Pages**

Each `/play/xxx/yyy` page includes the `AccessGuard` component that:

1. Reads the token from `localStorage`
2. Decodes and validates the JWT (checks signature, expiration, product)
3. Shows content if valid, or redirects to unlock page if invalid

### 5. **User Accesses Wallpaper**

```
User visits /play/default-xxx → AccessGuard checks token → Grants/Denies access
```

## 📁 Files Created/Modified

### New Files

1. **`src/lib/auth.ts`**
   - JWT creation and verification functions
   - Token storage utilities (localStorage)

2. **`src/pages/api/stripe/generate-token.ts`**
   - API endpoint to generate access tokens
   - Verifies Stripe session before issuing token

3. **`src/pages/api/stripe/webhook.ts`**
   - Stripe webhook handler (optional, for logging)
   - Receives payment success events from Stripe

4. **`src/components/AccessGuard.astro`**
   - Client-side component that protects pages
   - Shows access denied message or content

### Modified Files

1. **`src/pages/api/stripe/create-checkout-session.ts`**
   - Added `{CHECKOUT_SESSION_ID}` to success URL
   - This allows us to verify the payment on the success page

2. **`src/pages/animated-wallpapers/index.astro`**
   - Added token generation on success page
   - Added "Copy URL" buttons for unlocked wallpapers
   - Shows unlock status

3. **All `/play/xxx/yyy/index.astro` files**
   - Added `AccessGuard` component
   - Wrapped content in protected div
   - Delayed animation initialization until access verified

## 🚀 Setup Instructions

### 1. Environment Variables

Make sure these are set in your `.env` file:

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLIC_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx  # Get from Stripe dashboard
STRIPE_PRICE_ID=price_xxx  # Your product price ID
```

### 2. Configure Stripe Webhook (Optional)

If you want to log payments server-side:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select event: `checkout.session.completed`
4. Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`

### 3. Deploy

```bash
npm run build
npm run preview  # Test locally
# Then deploy to production
```

## 🔄 User Flow

### First Time Purchase

1. User visits `/animated-wallpapers`
2. Clicks "Unlock All Wallpapers"
3. Completes Stripe payment
4. Redirected to `/animated-wallpapers?success=true&session_id=cs_xxx`
5. Token is automatically generated and stored
6. "Copy URL" buttons appear on all wallpapers
7. User copies URL and pastes into Plash

### Subsequent Visits

1. User visits `/animated-wallpapers`
2. Page checks localStorage for token
3. If valid, shows "✓ Already Unlocked" and copy buttons
4. User can access any `/play/xxx/yyy` URL directly

### Accessing Protected Page

1. User navigates to `/play/default-xxx` (in Plash)
2. `AccessGuard` checks for valid token
3. If valid: Shows wallpaper animation
4. If invalid: Shows "Access Required" message with unlock link

## 🛡️ Security Considerations

### What's Secure

- ✅ Tokens are cryptographically signed (can't be forged)
- ✅ Tokens expire (though set to 100 years)
- ✅ No sensitive data in token (just email and metadata)
- ✅ Stripe session verified before token generation

### What's NOT Secure

- ⚠️ Users can share their token with others
- ⚠️ Token is visible in localStorage (use browser DevTools)
- ⚠️ No server-side validation on `/play` pages (all client-side)

### Why This Is Acceptable

For wallpaper URLs meant to be used in Plash:

1. **Low Risk**: Wallpapers are low-value digital goods
2. **Convenience**: Users need easy access from Plash (can't login)
3. **Friction Reduction**: No auth needed once purchased
4. **Cost-Effective**: No database or session management needed

### Improving Security (Optional)

If you want stronger security:

1. **Server-Side Validation**: Make `/play` pages SSR and verify token server-side
2. **Rate Limiting**: Add rate limiting to prevent abuse
3. **Token Rotation**: Implement token refresh mechanism
4. **Device Binding**: Bind tokens to specific devices
5. **Usage Analytics**: Track which IPs use which tokens

## 🧪 Testing

### Test Token Generation

```bash
# 1. Start development server
npm run dev

# 2. In browser console:
const response = await fetch('/api/stripe/generate-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId: 'YOUR_TEST_SESSION_ID' })
});
const data = await response.json();
console.log(data.token);
```

### Test Access Control

```bash
# 1. Clear localStorage
localStorage.clear();

# 2. Visit protected page
# Should see "Access Required" message

# 3. Set token manually
localStorage.setItem('animated_wallpapers_access', 'YOUR_TOKEN');

# 4. Refresh page
# Should see wallpaper
```

## 🐛 Troubleshooting

### "No access token found"

- User hasn't purchased or token was cleared
- Check localStorage in DevTools

### "Invalid token format"

- Token was corrupted or manually edited
- Clear localStorage and repurchase

### "Token expired"

- Token is older than 100 years (unlikely)
- Generate new token

### "Failed to generate access token"

- Stripe session not found or not paid
- Check Stripe dashboard for session status
- Ensure session_id is in URL after redirect

### Copy buttons don't appear

- User doesn't have valid token
- Check browser console for errors

## 📊 Monitoring

To monitor your system:

1. **Check Stripe Dashboard**: See successful payments
2. **Browser Console**: Look for token generation logs
3. **Server Logs**: Check API endpoint calls
4. **Webhook Logs**: Verify webhook events received

## 🔮 Future Enhancements

Consider adding:

1. **Email Delivery**: Send token via email after purchase
2. **Account System**: Allow users to retrieve lost tokens
3. **Token Management**: Let users revoke/regenerate tokens
4. **Usage Analytics**: Track most popular wallpapers
5. **Social Sharing**: Allow users to share (different) preview URLs

## 📝 Notes

- Tokens are stored in **localStorage** (persists across sessions)
- Tokens are **domain-specific** (can't be used on other sites)
- **No backend database** required (stateless authentication)
- Works with **SSR and SSG** (client-side verification)

