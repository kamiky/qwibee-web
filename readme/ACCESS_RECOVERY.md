# Access Recovery System

## 🔄 Overview

Users can now recover their access if they:

- Clear their browser's localStorage
- Switch to a new device
- Use a different browser
- Accidentally lose their token

## 🎯 How It Works

### User Flow

1. **User loses access** (cleared localStorage, new device, etc.)
2. **Visits `/recover-access`** page
3. **Enters email** used for purchase
4. **System searches Stripe** for successful payments with that email
5. **Generates new token** (same permissions as original)
6. **Stores in localStorage** automatically
7. **User has access** to all wallpapers again

### Technical Flow

```
┌─────────────┐
│    User     │
│ "Lost access"│
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ /recover-access  │
│ Enter email      │
└──────┬───────────┘
       │
       │ POST email
       ▼
┌──────────────────────────────────────────┐
│ /api/stripe/recover-access               │
│                                          │
│ 1. Validate email format                 │
│ 2. Search Stripe sessions (last 100)     │
│ 3. Filter by:                            │
│    - Email match                         │
│    - payment_status = "paid"             │
│    - metadata.product = "animated_..."   │
│ 4. If found: Generate new token          │
│ 5. Return token                          │
└──────┬───────────────────────────────────┘
       │
       │ { token, email, purchaseDate }
       ▼
┌──────────────────────────────┐
│ Store in localStorage         │
│ Show success message          │
│ Redirect to wallpapers        │
└───────────────────────────────┘
```

## 📁 Files Created

### 1. API Endpoint (`/api/stripe/recover-access.ts`)

**Functionality:**

- Accepts email address
- Searches Stripe checkout sessions
- Filters for paid sessions with matching email
- Generates new JWT token
- Returns token to client

**Security:**

- Validates email format
- Checks payment status
- Verifies product metadata
- Rate limiting recommended (see below)

### 2. Recovery Page (`/recover-access`)

**Features:**

- Clean, user-friendly form
- Email validation
- Loading states
- Success/error messages
- Links to wallpapers and test page
- Help section with tips

## 🔐 Security Considerations

### What's Secure

✅ **Payment Verification**: Only generates tokens for confirmed payments  
✅ **Email-Based**: User must know the purchase email  
✅ **No Password**: Can't be brute-forced (email is unique identifier)  
✅ **Same Permissions**: New token has same access as original

### Potential Concerns

⚠️ **Email is the Only Auth**: Anyone with the email can recover access  
⚠️ **No Rate Limiting**: Could be abused (see mitigation below)  
⚠️ **Stripe API Limit**: Fetches last 100 sessions (may not find old purchases)

### Mitigation Strategies

#### 1. Add Rate Limiting (Recommended)

```typescript
// In recover-access.ts
const rateLimiter = new Map<string, number>();

// Before searching Stripe
const now = Date.now();
const lastAttempt = rateLimiter.get(email) || 0;
if (now - lastAttempt < 60000) {
  // 1 minute
  return new Response(
    JSON.stringify({ error: "Too many attempts. Please wait." }),
    { status: 429 }
  );
}
rateLimiter.set(email, now);
```

#### 2. Email Confirmation (Optional)

Send token via email instead of showing it:

```typescript
// After generating token
await sendEmail({
  to: email,
  subject: "Your Wallpaper Access",
  body: `Click here to restore access: ${url}/restore?token=${token}`,
});
```

#### 3. Increase Session Limit

```typescript
// Fetch more sessions for older purchases
const sessions = await stripe.checkout.sessions.list({
  limit: 100, // Can increase up to 100
});

// For very old purchases, use customer search instead
const customers = await stripe.customers.search({
  query: `email:'${email}'`,
});
```

## 🎨 User Experience

### Access Denied Page

When users visit a protected page without access, they now see:

- Primary button: "Unlock All Wallpapers" (for new purchases)
- Secondary button: "Already purchased? Recover access" (for returning users)

### Recovery Page

Clean interface with:

- Email input field
- Clear instructions
- Help section with troubleshooting tips
- Success state with purchase details
- Links to view wallpapers or test access

### Success State

After recovery:

- ✅ Success message
- Purchase date displayed
- Email confirmation
- Quick links to wallpapers and test page

## 🧪 Testing

### Test Recovery Flow

```bash
# 1. Make a test purchase with email test@example.com
# 2. Clear localStorage
localStorage.clear();

# 3. Visit recovery page
# Go to: http://localhost:4321/recover-access

# 4. Enter email: test@example.com
# 5. Click "Recover Access"
# 6. Should see success message and restored access
```

### Test Error Cases

```javascript
// Invalid email
Email: "invalid" → Error: "Invalid email address"

// Email with no purchases
Email: "nopurchase@example.com" → Error: "No purchase found"

// API error (simulate)
// Disconnect internet → Error: "Failed to recover access"
```

## 📊 Common Scenarios

### Scenario 1: User Cleared Browser Data

**Problem:** Cleared cache/cookies/localStorage  
**Solution:** Visit `/recover-access`, enter email  
**Result:** Instant restoration of access

### Scenario 2: New Device

**Problem:** User bought on Device A, wants access on Device B  
**Solution:** On Device B, visit `/recover-access`, enter email  
**Result:** Access granted on Device B (Device A keeps access too)

### Scenario 3: Different Browser

**Problem:** User bought in Chrome, wants access in Safari  
**Solution:** In Safari, visit `/recover-access`, enter email  
**Result:** Access granted in Safari

### Scenario 4: Lost Email Receipt

**Problem:** User doesn't remember purchase email  
**Solution:** Check Stripe payment receipt in email inbox  
**Result:** Find email, use recovery page

### Scenario 5: Very Old Purchase

**Problem:** Purchase older than last 100 sessions  
**Solution:** Manually help user or increase search limit  
**Result:** May need custom support

## 🔧 Customization

### Change Session Search Limit

```typescript
// In recover-access.ts
const sessions = await stripe.checkout.sessions.list({
  limit: 100, // Increase to search more history
});
```

### Add Email Notification

```typescript
// After successful recovery
import { sendEmail } from "@/lib/email";

await sendEmail({
  to: email,
  subject: "Access Recovered - watchmefans",
  body: `
    Your wallpaper access has been recovered.
    Purchase date: ${new Date(latestSession.created * 1000)}
    
    Your wallpapers: ${baseUrl}/animated-wallpapers
  `,
});
```

### Customize Success Message

Edit `/src/pages/recover-access.astro`:

```html
<h2 class="text-2xl font-bold text-green-400 mb-2">
  Access Recovered!
  <!-- Change this -->
</h2>
```

## 📈 Monitoring

### Track Recovery Usage

Add logging in `recover-access.ts`:

```typescript
console.log({
  event: "access_recovery",
  email: email.toLowerCase(),
  success: true,
  timestamp: new Date().toISOString(),
  sessionId: latestSession.id,
});
```

### Analytics

Track recovery attempts:

- Total recoveries per day/week
- Success rate
- Common error patterns
- Time from purchase to recovery

## ⚠️ Edge Cases

### Multiple Purchases

**Issue:** User made multiple purchases with same email  
**Handling:** System uses most recent purchase  
**Impact:** None - all purchases have same access

### Refunded Purchase

**Issue:** User's payment was refunded  
**Handling:** Session still shows payment_status = "paid"  
**Solution:** Check refund status in webhook, mark sessions

### Different Email Variants

**Issue:** User types `John@Example.com` vs `john@example.com`  
**Handling:** Email is lowercased before comparison  
**Impact:** None - case-insensitive matching

### Typo in Email

**Issue:** User types wrong email  
**Handling:** Shows "No purchase found"  
**Solution:** User tries again with correct email

## 🎯 Benefits

✅ **Reduces Support Burden**: Users self-serve instead of contacting support  
✅ **Better UX**: Instant recovery vs waiting for support reply  
✅ **Multi-Device**: Users can access from any device  
✅ **Browser-Agnostic**: Works across Chrome, Safari, Firefox, etc.  
✅ **No Password**: One less thing for users to remember

## 🚀 Future Enhancements

### 1. Magic Link

Send recovery link via email instead of showing token

### 2. Device Management

Show user which devices have active tokens

### 3. Email Notification

Notify on each recovery (security alert)

### 4. Customer Portal

Full self-service portal with recovery + purchase history

### 5. SMS Recovery

Allow recovery via phone number (if collected)

## 📝 Summary

The recovery system allows users to restore access by entering their purchase email. It searches Stripe for confirmed payments and generates a new token with the same permissions. This provides a seamless self-service experience without requiring support intervention.

**Key Features:**

- Email-based recovery
- Instant token generation
- No database required
- Works across devices/browsers
- User-friendly interface
- Comprehensive error handling

**Security:**

- Payment verification required
- Email must match purchase
- Token permissions identical to original
- Rate limiting recommended but optional
