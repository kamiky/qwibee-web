# Profile Pages — Developer Reference

Covers how to debug/simulate access states locally and what happens end-to-end when a user pays for a membership or one-shot paid content.

---

## Table of Contents

1. [Content types](#content-types)
2. [Debug & simulation (URL query params)](#debug--simulation-url-query-params)
3. [Membership payment flow](#membership-payment-flow)
4. [Paid content (one-shot) payment flow](#paid-content-one-shot-payment-flow)
5. [Promotion & token discount system](#promotion--token-discount-system)
6. [Subscription management (already subscribed)](#subscription-management-already-subscribed)

---

## Content types

Each video/image in a profile JSON has a `type` field:

| Type | Description | Requires |
|---|---|---|
| `free` | Always accessible to everyone | Nothing |
| `membership` | Requires an active subscription | Active membership for this profile |
| `paid` | One-shot purchase per item | Individual purchase via Stripe |

The `hide` field controls whether non-subscribers even **see** the item in the grid:

- `hide: false` → item visible in the grid (but blurred/locked if no access)
- `hide: true` → item completely hidden from the grid until the user has a membership

**Example (from `ul7nwt0a.json` — Lou's profile):**
```json
{ "id": "xxvzjicf", "type": "membership", "hide": true, "price": 564, ... }
{ "id": "uy9shwqr", "type": "paid",       "hide": true, "price": 4500, ... }
{ "id": "0g6mfyih", "type": "free",       "hide": false, "price": 0, ... }
```

---

## Debug & simulation (URL query params)

> **All debug params only work in development mode** (`import.meta.env.DEV`).  
> The `?secret` param is the only exception — it also works on production.

### Available params

| Param | Value | Effect |
|---|---|---|
| `?debug` | (any value) | Activates debug mode — enables access simulation |
| `?debug=true` | `true` | Same as above **+** shows media titles in the grid + reveals a red-bordered "Hidden" section at the bottom with all `hide: true` items |
| `?simulate=membership` | `membership` | Simulates an active membership — unlocks `free` and `membership` content, shows hidden items in the main grid |
| `?simulate=all` | `all` | Simulates membership + all paid content purchased — unlocks everything |
| `?secret=XXX` | Stripe secret | Passed to Stripe session creation for testing on production without going through the real payment flow |

### Access simulation matrix

| URL | Free | Membership | Paid | Hidden items visible? |
|---|---|---|---|---|
| `/u/slug` (no params) | ✅ | ❌ | ❌ | ❌ |
| `?debug` | ✅ | ❌ | ❌ | ❌ |
| `?debug=true` | ✅ | ❌ | ❌ | ✅ (in separate section) |
| `?debug&simulate=membership` | ✅ | ✅ | ❌ | ✅ (in main grid) |
| `?debug=true&simulate=membership` | ✅ | ✅ | ❌ | ✅ (in main grid) |
| `?debug&simulate=all` | ✅ | ✅ | ✅ | ✅ (in main grid) |

### What simulation injects (client-side)

The `profilePage.script.ts` `checkMembershipAccess()` function short-circuits real API calls when in debug mode and returns mock data:

| simulate value | `hasAccess` | `purchasedContent` | `purchaseTokens` |
|---|---|---|---|
| `membership` | `true` | `[]` (no paid content) | 1 token, 10 days remaining |
| `all` | `true` | All video IDs | 3 tokens, 15 days remaining |
| (none / missing) | `false` | `[]` | `[]` |

### Debug "+1 Token" button

When the user has an active membership (real or simulated) and `import.meta.env.DEV` is true, a purple **"+1 Token (debug)"** button appears in the top-right corner.

Clicking it calls `POST http://localhost:8002/debug/add-token` with the current `profileId` and reloads the page.

---

## Membership payment flow

```
User clicks "Subscribe" / "Unlock more contents" button
          │
          ▼
Not logged in? → redirect to /login?redirect=<current-path>&openStripe=true
          │
          ▼
Opens a new tab immediately (popup blocker bypass)
          │
          ▼
POST /api/stripe/create-membership-session
  body: { profileId, membershipPrice (cents), customerEmail, language, displayName }
          │
          ▼
New tab → redirects to Stripe Checkout page (paid subscription)
          │
          ▼ User completes payment on Stripe
          │
Stripe redirects back to: /u/<slug>?session_id=XXX&membership=success
          │
          ▼
Page detects ?membership=success → shows loading overlay "Activating your membership..."
          │
          ▼
POST /api/auth/verify-session
  body: { sessionId, profileId }
  → Backend polls until Stripe webhook is confirmed, then returns auth tokens
          │
          ▼
storeAuth({ accessToken, refreshToken, user }) — stored in cookies
URL cleaned (query params removed)
Page reloads
          │
          ▼
On reload: Astro reads qwb_access_token cookie
POST <backend>/auth/verify-token
  → response includes memberships array
  → finds matching profileId with status "active" or "trialing"
  → USER_PLAN = "membership"
          │
          ▼
All membership content unlocked server-side:
- Hidden items appear in the main grid
- Paid content buy buttons + pricing become visible
- Membership CTA button turns green → "Subscribed ✓"
- Renewal date shown below the button
```

**If payment is cancelled:** Stripe redirects to `?membership=canceled` → yellow "Payment Cancelled" banner shown.

---

## Paid content (one-shot) payment flow

> Paid content buy buttons are only **revealed** after the user has an active membership. Non-subscribers never see them.

```
User (subscriber) clicks "Buy Video" / "Buy Image" button
          │
          ▼
Not logged in? → redirect to /login?redirect=<current-path>
          │
          ▼
checkMembershipAccess() called to get token count + active promotion state
          │
          ├─ 2+ tokens AND no active time-limited promotion?
          │      → POST /api/stripe/unlock-content-with-tokens
          │        body: { profileId, videoId, customerEmail, tokensToUse: 2 }
          │        → Backend unlocks the content and deducts 2 tokens
          │        → Page reloads, content now accessible
          │
          ├─ 1 token (or active promotion):
          │      → Opens new tab (popup blocker bypass)
          │      → POST /api/stripe/create-content-checkout-session
          │          body: {
          │            profileId, videoId,
          │            contentPrice: <original or promo-discounted price in cents>,
          │            tokensToUse: 0 or 1,
          │            customerEmail, language, videoTitle, creatorDisplayName
          │          }
          │      → New tab redirects to Stripe Checkout
          │
          └─ 0 tokens, no promotion:
                 → Same Stripe flow with original price, tokensToUse: 0
          │
          ▼ User completes payment on Stripe
          │
Stripe redirects to: /u/<slug>?session_id=XXX&content_purchase=success&video_id=XXX
          │
          ▼
Page shows loading overlay "Unlocking your content..."
          │
          ▼
POST /api/auth/verify-session
  body: { sessionId, profileId }
  → Backend confirms purchase, returns updated auth tokens
          │
          ▼
storeAuth() — tokens saved, URL cleaned, page reloads
          │
          ▼
On reload: PURCHASED_VIDEO_IDS now includes the videoId
→ Content unlocked server-side (paid file served instead of preview)
```

**If payment is cancelled:** Stripe redirects to `?content_purchase=canceled` → yellow "Purchase Cancelled" banner shown.

---

## Promotion & token discount system

### Profile-level `promotionPercentage`

Set in the profile JSON (e.g., Lou: `25`, Meemow: `27`). Applies to **all paid content** on this profile when an active time-limited promotion is running.

```json
{
  "membershipPrice": 400,
  "promotionPercentage": 25
}
```

### Time-limited subscription promotion

Triggered when a user **newly subscribes** — the backend sets `membership.promotionExpiresAt` on the membership record. This gives the new subscriber a limited-time window to buy paid content at the discounted rate.

- Shown as a fixed bottom bar (orange → red gradient) with a **MM:SS countdown**
- Title: "🎉 New Subscriber Offer!" — Description: "Get 25% off all one-shot purchases"
- When the countdown hits zero: bar disappears, page reloads with updated prices, token bar appears (if applicable)

**Price formula:** `Math.round(originalPrice * (1 - promotionPercentage / 100))`

Example: `$45.00` with 25% off → `Math.round(4500 * 0.75)` = `$33.75`

### Token discount system

Purchase tokens accumulate over time for each profile (backend controlled). They grant discounts on paid content and are an alternative to the time-limited promotion.

| Token count | Discount | Stripe? | How |
|---|---|---|---|
| 0 | 0% (or active promo) | ✅ | Normal/promo price |
| 1 | −50% on original price | ✅ | Backend applies via `tokensToUse: 1` |
| 2+ | FREE (100%) | ❌ | Backend unlocks directly, no Stripe |

**Important:** Subscription promotion and token discounts are **mutually exclusive** — the time-limited promotion always takes priority. Tokens only apply when there is no active promotion.

### Priority order for paid content pricing (display + checkout)

```
1. Time-limited subscription promotion (highest priority)
   → orange strikethrough + -X% badge (orange)

2. Token discount (only when no active promotion)
   → 2+ tokens: "FREE" in green + -100% badge (green)
   → 1 token:   50% price in blue + -50% badge (orange)

3. No discount
   → original price shown, no badge
```

### Token bar

When the user has tokens and **no active time-limited promotion**, a fixed bottom bar (orange → amber gradient) is shown:

- Displays: `N tokens left` + `X% discount on next purchase`
- Displays: days remaining until the next token is credited
- Does **not** appear while the promotion countdown is running (appears after it expires)

---

## Subscription management (already subscribed)

When the user returns to the profile page with an existing active membership:

| State | Button color | Button text | Info below |
|---|---|---|---|
| Active + auto-renew | 🟢 Green | "Subscribed ✓" | "Will renew on [date]" |
| Cancelled (still active) | 🟢 Green | "Renew" | "Membership ends on [date]" |
| Not subscribed | 🔵 Blue | "Subscribe — $X/mo" | (hidden) |

Clicking the button while subscribed (any state) opens the **Stripe Customer Portal** via `POST /api/stripe/create-portal-session` where the user can cancel, update payment method, or re-enable renewal.

---

## Quick reference — all Stripe redirect params

| Scenario | URL params on return |
|---|---|
| Membership paid | `?session_id=XXX&membership=success` |
| Membership cancelled | `?membership=canceled` |
| Content purchased | `?session_id=XXX&content_purchase=success&video_id=XXX` |
| Content purchase cancelled | `?content_purchase=canceled` |
