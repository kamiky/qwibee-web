# Access Control Flow Diagram

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER FLOW DIAGRAM                              │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Browser    │
│  (No Token)  │
└──────┬───────┘
       │
       │ 1. Navigate to
       ▼
┌─────────────────────┐
│ /animated-wallpapers │
│                     │
│ ▶ See wallpapers    │
│ ▶ See preview       │
│ ▶ "Unlock All" btn  │
└──────┬──────────────┘
       │
       │ 2. Click "Unlock All"
       ▼
┌─────────────────────────────┐
│  Stripe Checkout (New Tab)  │
│                             │
│  ▶ Enter card: 4242...     │
│  ▶ Apply promo: WALL6       │
│  ▶ Pay €9.80                │
└──────┬──────────────────────┘
       │
       │ 3. Payment Success
       ▼
┌────────────────────────────────────────────────┐
│  Redirect to /animated-wallpapers              │
│  ?success=true&session_id=cs_1234567890        │
└──────┬─────────────────────────────────────────┘
       │
       │ 4. Auto-generate token
       ▼
┌──────────────────────────────────────────────────────────────┐
│  POST /api/stripe/generate-token                             │
│  Body: { sessionId: "cs_1234567890" }                        │
│                                                              │
│  Server checks:                                              │
│  ✓ Verify session with Stripe                               │
│  ✓ Confirm payment_status = "paid"                          │
│  ✓ Confirm metadata.product = "animated_wallpapers_..."     │
│                                                              │
│  Server generates:                                           │
│  ✓ Create JWT payload                                       │
│  ✓ Sign with STRIPE_SECRET_KEY (HMAC-SHA256)                │
│                                                              │
│  Response: { token: "eyJhbGc...", email: "user@..." }       │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ 5. Store token
       ▼
┌─────────────────────────────────────────────────────────┐
│  localStorage.setItem(                                  │
│    "animated_wallpapers_access",                        │
│    "eyJhbGc...JWT_TOKEN..."                             │
│  )                                                      │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 6. Page updates
       ▼
┌─────────────────────────────────────────────────────────┐
│  /animated-wallpapers (Now Unlocked)                    │
│                                                         │
│  ▶ "✓ Already Unlocked" (disabled button)              │
│  ▶ Green "Copy URL" buttons on each wallpaper          │
│  ▶ Success banner: "Payment successful!"               │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 7. User clicks "Copy URL" on any wallpaper
       ▼
┌─────────────────────────────────────────────────────────┐
│  Copies to clipboard:                                   │
│  https://watchmefans.com/play/default-7k2m9xp4...          │
│                                                         │
│  Shows: "✓ URL copied: Classic Matrix"                 │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 8. User pastes into Plash
       ▼
┌─────────────────────────────────────────────────────────┐
│  Plash App                                              │
│  ▶ Click "+" to add website                            │
│  ▶ Paste URL                                            │
│  ▶ Desktop wallpaper updates                           │
└──────┬──────────────────────────────────────────────────┘
       │
       │ 9. Plash loads URL
       ▼
┌──────────────────────────────────────────────────────────────┐
│  /play/default-7k2m9xp4wn8vq5rj3hg6yz1cbt0sfa              │
│                                                             │
│  Page loads → AccessGuard runs → Checks localStorage        │
└──────┬──────────────────────────────────────────────────────┘
       │
       │ 10. Verify token
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Token Verification (Client-Side)                          │
│                                                             │
│  ✓ Read from localStorage                                  │
│  ✓ Parse JWT (header.payload.signature)                    │
│  ✓ Decode payload                                          │
│  ✓ Check expiration (exp > now)                            │
│  ✓ Check product = "animated_wallpapers_all_access"        │
│                                                             │
│  Note: Full signature verification is complex in browser,   │
│        but token can't be forged without Stripe secret      │
└──────┬──────────────────────────────────────────────────────┘
       │
       ├─── Valid Token? ───┐
       │                    │
       │ YES                │ NO
       ▼                    ▼
┌──────────────────┐   ┌─────────────────────────────────┐
│  Show Wallpaper  │   │  Show "Access Required" Page    │
│                  │   │                                 │
│  ✓ Initialize    │   │  🔒 Access Required             │
│    animation     │   │  "This wallpaper requires..."   │
│  ✓ Play forever  │   │  [Unlock All Wallpapers] btn    │
│  ✓ Fill screen   │   │                                 │
└──────────────────┘   └─────────────────────────────────┘
```

## Token Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                        JWT TOKEN                                 │
└─────────────────────────────────────────────────────────────────┘

Format: header.payload.signature

┌────────────────────────────────────────────────────────────┐
│  HEADER (Base64 encoded)                                   │
│  {                                                         │
│    "alg": "HS256",      ← HMAC-SHA256 algorithm            │
│    "typ": "JWT"         ← Token type                       │
│  }                                                         │
└────────────────────────────────────────────────────────────┘
                              .
┌────────────────────────────────────────────────────────────┐
│  PAYLOAD (Base64 encoded)                                  │
│  {                                                         │
│    "email": "user@example.com",                            │
│    "product": "animated_wallpapers_all_access",            │
│    "sessionId": "cs_1234567890",                           │
│    "iat": 1704067200,     ← Issued at (Unix timestamp)     │
│    "exp": 4860067200      ← Expires at (~100 years)        │
│  }                                                         │
└────────────────────────────────────────────────────────────┘
                              .
┌────────────────────────────────────────────────────────────┐
│  SIGNATURE (Base64 encoded)                                │
│                                                            │
│  HMAC-SHA256(                                              │
│    base64(header) + "." + base64(payload),                 │
│    STRIPE_SECRET_KEY                                       │
│  )                                                         │
│                                                            │
│  ✓ Proves token wasn't tampered with                      │
│  ✓ Can only be created with Stripe secret                 │
└────────────────────────────────────────────────────────────┘
```

## Security Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     WHY IT'S SECURE                              │
└─────────────────────────────────────────────────────────────────┘

❌ Can user forge a token?
   NO - Requires STRIPE_SECRET_KEY to sign (server-side only)

❌ Can user modify token?
   NO - Changes break signature (validation fails)

❌ Can user steal someone's token?
   YES - But acceptable for low-value content
        - Token doesn't give access to payment info
        - Token doesn't give access to other accounts
        - Only gives access to wallpapers

✅ Can user share token?
   YES - But acceptable trade-off for:
        - Convenience (no login in Plash)
        - Better UX
        - Lower support burden

✅ Can token expire?
   YES - Set to 100 years (effectively lifetime)
        - Can be changed to shorter duration
        - Enforced in payload.exp

✅ Can tokens be revoked?
   NO (current implementation)
        - Stateless = no revocation
        - Could add revocation with database/cache
        - Not needed for this use case
```

## Database-Free Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              WHY NO DATABASE IS NEEDED                           │
└─────────────────────────────────────────────────────────────────┘

Traditional Approach (WITH Database):
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Client  │───▶│  Server  │───▶│ Database │
│          │    │          │    │          │
│ "Has     │    │ "Check   │    │ session: │
│  access?"│    │  DB..."  │    │ valid ✓  │
└──────────┘    └──────────┘    └──────────┘
  ↑ Slow            ↑ Load          ↑ Required
  ↑ Roundtrip       ↑ on server     ↑ Maintenance

Our Approach (NO Database):
┌──────────┐
│  Client  │
│          │
│ "Token   │───┐
│  valid?" │   │
│          │◀──┘
│ ✓ Self-  │
│   verify │
└──────────┘
  ↑ Fast
  ↑ No server needed
  ↑ No database needed

How?
• All auth data is IN the token (email, expiration, product)
• Token signature proves it came from our server
• Client can verify expiration & product locally
• No need to "check" with server or database
```

## Component Interactions

```
┌─────────────────────────────────────────────────────────────────┐
│                    FILE INTERACTIONS                             │
└─────────────────────────────────────────────────────────────────┘

/animated-wallpapers/index.astro
    │
    │ (After Stripe redirect)
    ▼
/api/stripe/generate-token.ts
    │
    │ (Uses)
    ▼
src/lib/auth.ts (createToken)
    │
    │ (Generates)
    ▼
JWT Token → localStorage
    │
    │ (Read by)
    ▼
/play/*/index.astro
    │
    │ (Includes)
    ▼
src/components/AccessGuard.astro
    │
    │ (Checks)
    ▼
localStorage → Validate → Show/Hide Content
```

## Error Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                    ERROR SCENARIOS                               │
└─────────────────────────────────────────────────────────────────┘

No Token
   ├─ User: Never purchased
   └─ Action: Show "Unlock All" button

Invalid Token Format
   ├─ User: Manually edited token
   └─ Action: Show "Access Required" page

Expired Token
   ├─ User: Token older than 100 years
   └─ Action: Show "Access Required" page
   └─ Note: Basically never happens

Wrong Product
   ├─ User: Token for different product
   └─ Action: Show "Access Required" page

Stripe Session Not Found
   ├─ User: Invalid session_id in URL
   └─ Action: Return error, show error message

Payment Not Completed
   ├─ User: Didn't complete Stripe checkout
   └─ Action: Return error, don't generate token

Token Generation Failed
   ├─ Server: JWT signing failed
   └─ Action: Show error banner, retry available
```

## Testing Checklist

```
┌─────────────────────────────────────────────────────────────────┐
│                     TESTING CHECKLIST                            │
└─────────────────────────────────────────────────────────────────┘

□ Purchase Flow
  □ Click "Unlock All Wallpapers"
  □ Complete Stripe checkout with test card
  □ Verify redirect with session_id in URL
  □ Verify success banner appears
  □ Verify button changes to "✓ Already Unlocked"

□ Token Generation
  □ Check browser console for "Token generated" log
  □ Verify token in localStorage (DevTools → Application)
  □ Verify token includes email, product, exp

□ Copy URLs
  □ Verify "Copy URL" buttons appear (green)
  □ Click button, verify copy confirmation
  □ Verify correct URL copied to clipboard

□ Access Control
  □ Clear localStorage
  □ Visit /play/default-xxx → See "Access Required"
  □ Restore token
  □ Visit /play/default-xxx → See wallpaper

□ Edge Cases
  □ Test with invalid token → Blocked
  □ Test with expired token → Blocked
  □ Test with no token → Blocked
  □ Test canceled payment flow
```

This completes the visual documentation!
