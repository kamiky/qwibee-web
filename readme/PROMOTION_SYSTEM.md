# Time-Limited Promotion System for New Subscribers

## Overview

This feature provides a 10-minute time-limited promotion to new subscribers, offering them a percentage discount on all one-shot (paid) content purchases. The promotion percentage is configured per creator and the countdown timer is displayed on the creator page.

## How It Works

### 1. Subscription Creation
When a user subscribes to a creator (either paid or free membership):
- The backend sets a `promotionExpiresAt` field on the membership record
- This is set to 10 minutes from the subscription creation time
- This applies to both paid subscriptions (via Stripe) and free memberships

### 2. Promotion Display
On the creator page, for subscribed users:
- The system checks if the user has an active promotion by comparing `promotionExpiresAt` with the current time
- If the promotion is still active, a prominent countdown banner is displayed at the top of the page
- The countdown updates every second, showing minutes and seconds remaining
- Individual paid media items show the percentage discount badge (e.g., "-25%")
- Prices are displayed with strikethrough original price and highlighted discounted price

### 3. Promotion Application
When a user purchases paid content:
- The frontend checks if the user has an active promotion
- If yes, it calculates the discounted price using the creator's `promotionPercentage`
- The discounted price is sent to Stripe for checkout
- After 10 minutes, the promotion expires and the countdown banner disappears

### 4. Promotion Expiration
When the promotion expires:
- The countdown timer reaches 00:00
- The page automatically reloads to update the UI
- Promotional badges and discounted prices are removed
- Regular prices are displayed for paid content

## Database Changes

### New Field: `memberships.promotion_expires_at`
- Type: `TIMESTAMP(3)` (nullable)
- Purpose: Stores when the 10-minute promotion expires for new subscribers
- Location: `memberships` table

### Migration
```sql
ALTER TABLE "memberships" ADD COLUMN "promotion_expires_at" TIMESTAMP(3);
```

Migration file: `20260202105214_add_promotion_expires_at`

## Backend Changes

### 1. Schema Update (`prisma/schema.prisma`)
Added `promotionExpiresAt` field to the `Membership` model.

### 2. Memberships Entity (`src/db/entities/memberships.entity.ts`)
- Added `promotionExpiresAt` to `IMembershipCreateBody` interface
- Added `promotionExpiresAt` to `IMembershipUpdateBody` interface

### 3. Stripe Controller (`src/api/controllers/stripe.controller.ts`)
**`handleSubscriptionCreated` function:**
- Sets `promotionExpiresAt` to 10 minutes from now when creating a new membership
- Applies to both paid subscriptions and app memberships

### 4. Auth Controller (`src/api/controllers/auth.controller.ts`)
**`createFreeMembership` function:**
- Sets `promotionExpiresAt` to 10 minutes from now for free memberships

**`verifyToken` function:**
- Returns `promotionExpiresAt` in the membership data
- Frontend uses this to check if promotion is still active

## Frontend Changes

### 1. Creator JSON (`src/data/u1me293c.json`)
Added `promotionPercentage: 25` to enable 25% discount on all paid content.

### 2. Profile Page Script (`src/pages/u/[slug]/[id]/profilePage.script.ts`)

**New Functions:**
- `checkActivePromotion(membership)`: Checks if the user has an active promotion and returns remaining seconds
- `displayPromotionCountdown(remainingSeconds)`: Creates and displays the countdown banner
- Updated `showPaidContentPricing(hasActivePromotion)`: Shows/hides discounted prices based on promotion status
- Updated `showContentTypeBadges(hasActivePromotion)`: Shows/hides promotion badges on paid content

**Updated Logic:**
- On page load, checks if user has active membership and promotion
- If promotion is active, displays countdown and promotional prices
- When purchasing paid content, applies discount if promotion is active
- Sends discounted price to Stripe checkout

### 3. Translations (`src/i18n/en.json` and `src/i18n/fr.json`)
Added new translation keys:
- `profile.promotionTitle`: "🎉 New Subscriber Offer!"
- `profile.promotionDescription`: "Get {percentage}% off all one-shot purchases"
- `profile.promotionTimeRemaining`: "Time remaining"

## Configuration

To enable promotions for a creator, set the `promotionPercentage` field in their JSON file:

```json
{
  "id": "u1me293c",
  "username": "Jen",
  "promotionPercentage": 25,  // 25% discount
  ...
}
```

Set to `0` to disable promotions for a creator.

## User Flow

1. **User subscribes** to a creator
   - Backend creates membership with `promotionExpiresAt` = now + 10 minutes

2. **User views creator page**
   - Frontend checks if promotion is active
   - If yes, displays countdown banner and promotional prices

3. **User purchases paid content within 10 minutes**
   - Frontend calculates discounted price
   - Sends to Stripe checkout with discount applied
   - User pays the reduced amount

4. **After 10 minutes**
   - Countdown reaches 00:00
   - Page reloads automatically
   - Regular prices displayed (no discount)

## Technical Details

### Countdown Timer
- Updates every second
- Shows format: "MM:SS" (e.g., "09:45")
- Automatically reloads page when expired
- Persists across page navigation (based on server data)

### Price Display
- Original price shown with strikethrough (when promotion active)
- Discounted price shown in blue, bold
- Promotion badge shows percentage (e.g., "-25%")

### Promotion Validation
- Checked on every page load from server data
- No local storage manipulation possible
- Expires exactly 10 minutes after subscription creation

## Files Modified

### Backend
- `api/prisma/schema.prisma`
- `api/prisma/migrations/20260202105214_add_promotion_expires_at/migration.sql`
- `api/src/db/entities/memberships.entity.ts`
- `api/src/api/controllers/stripe.controller.ts`
- `api/src/api/controllers/auth.controller.ts`

### Frontend
- `web/src/data/u1me293c.json`
- `web/src/pages/u/[slug]/[id]/profilePage.script.ts`
- `web/src/i18n/en.json`
- `web/src/i18n/fr.json`

## Testing

To test the promotion system:

1. Subscribe to a creator with `promotionPercentage > 0`
2. Verify the countdown banner appears
3. Check that paid content shows promotional prices
4. Try purchasing paid content and verify discounted price in Stripe
5. Wait for promotion to expire and verify page updates

For quick testing, you can modify the expiration time in the backend from 10 minutes to 1-2 minutes.

## Notes

- The promotion is per-membership, not per-user
- If a user cancels and resubscribes, they get a new 10-minute promotion
- The promotion applies to ALL paid content from the creator
- The promotion does NOT apply to membership subscriptions, only one-shot purchases
- Free memberships also trigger the promotion countdown
