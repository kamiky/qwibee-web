# Quick Start Guide - Access Control

## 🎯 What Was Implemented

You now have a **JWT-based access control system** for your animated wallpapers that works **without a database**!

## ✅ What's Protected

All URLs matching this pattern are now protected:

- `/play/default-7k2m9xp4wn8vq5rj3hg6yz1cbt0sfa`
- `/play/rain-4n7w9q2xj5vk8pt1rm6hc3yg0zbsfd`
- `/play/braille-9x5m2k7wp4nj8vq1rt6hg3yc0zbsfd`
- `/play/cyber-2w5k9m7xp4nj8vq1rt6hg3yc0zbsfd`
- `/play/bengali-5k8m2n7xp4wj9vq1rt6hg3yc0zbsfd`
- `/play/geometric-8m5k2n7xp4wj9vq1rt6hg3yc0zbsf`
- `/play/nushu-3k9m5n7xp4wj8vq2rt6hg1yc0zbsfd`
- `/play/runic-6k2m9n7xp5wj8vq1rt4hg3yc0zbsfd`
- `/play/tetragrams-9k2m5n7xp4wj8vq1rt6hg3yc0zbsf`
- `/play/turkic-7k5m2n9xp4wj8vq1rt6hg3yc0zbsfd`

## 🚀 How Users Get Access

### Step 1: Purchase

User visits `/animated-wallpapers` and clicks "Unlock All Wallpapers"

### Step 2: Payment

User completes Stripe checkout

### Step 3: Automatic Token Generation

Upon successful payment:

- User is redirected to `/animated-wallpapers?success=true&session_id=cs_xxx`
- Page automatically generates and stores access token
- Token is saved in browser's localStorage

### Step 4: Access Granted

- "Copy URL" buttons appear on all wallpapers
- User can now access any `/play/xxx/yyy` URL
- Token is automatically checked on each protected page

## 🧪 Testing Locally

### 1. Start Development Server

```bash
cd /Users/alexis/Documents/dev/projects/watchmefans/web
npm run dev
```

### 2. Test Payment Flow

Visit: `http://localhost:4321/animated-wallpapers`

**Option A: Complete Real Payment**

- Click "Unlock All Wallpapers"
- Use Stripe test card: `4242 4242 4242 4242`
- Any future date, any CVC

**Option B: Manual Token (for testing)**

```javascript
// Open browser console on /animated-wallpapers page
// Manually create a test token (this bypasses payment)
const testPayload = {
  email: "test@example.com",
  product: "animated_wallpapers_all_access",
  sessionId: "test_session",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 100,
};

// Store it (note: without proper signature, access guard will reject it)
localStorage.setItem("animated_wallpapers_access", "test_token");
```

### 3. Test Protected Pages

Visit: `http://localhost:4321/play/default-7k2m9xp4wn8vq5rj3hg6yz1cbt0sfa`

**Without token:** Should show "Access Required" page
**With valid token:** Should show the wallpaper animation

## 🔄 Access Recovery

### What if users lose their localStorage?

Users can recover their access at `/recover-access` by:

1. Entering their purchase email
2. System searches Stripe for their payment
3. Generates new token automatically
4. Access restored instantly

**No support needed!** Users can self-serve recovery.

See `ACCESS_RECOVERY.md` for complete details.

## 📋 Environment Variables

Make sure these are set in your `.env` file:

```bash
# Required
STRIPE_SECRET_KEY=sk_test_xxx           # Your Stripe secret key
STRIPE_PUBLIC_KEY=pk_test_xxx           # Your Stripe public key
STRIPE_PRICE_ID=price_xxx               # Price ID for wallpapers

# Optional (for webhook logging)
STRIPE_WEBHOOK_SECRET=whsec_xxx         # Webhook signing secret
```

## 🎨 User Experience

### Before Payment

- User sees all wallpapers on `/animated-wallpapers`
- "Unlock All Wallpapers" button is prominent
- Visiting `/play/xxx/yyy` shows "Access Required" message

### After Payment

- Success banner appears
- "Unlock All Wallpapers" button changes to "✓ Already Unlocked"
- Green "Copy URL" buttons appear on all wallpapers
- User can click to copy any wallpaper URL
- All `/play/xxx/yyy` pages are accessible

### Using in Plash

1. User clicks "Copy URL" button
2. Opens Plash app
3. Clicks "+" to add new website
4. Pastes the copied URL
5. Wallpaper appears as desktop background

## 🔧 Customization

### Change Token Expiration

Edit `src/pages/api/stripe/generate-token.ts`:

```typescript
// Current: 100 years
exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 100;

// Change to 1 year:
exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
```

### Customize Access Denied Page

Edit `src/components/AccessGuard.astro` (line ~25-50):

```javascript
// Change colors, text, button styles
document.body.innerHTML = `...`;
```

### Add More Protected Pages

1. Create new page in `/src/pages/play/`
2. Import `AccessGuard` component
3. Wrap content in `<div id="protected-content">`

Example:

```astro
---
import AccessGuard from "@/components/AccessGuard.astro";
---

<AccessGuard />
<div id="protected-content">
  <!-- Your content here -->
</div>
```

## 🐛 Common Issues

### "No access token found"

**Solution:** User needs to purchase or token was cleared from localStorage

### "Invalid token format"

**Solution:** Token was corrupted. Clear localStorage and repurchase

### "Payment not completed"

**Solution:** Stripe session wasn't paid. Check Stripe dashboard

### Copy buttons don't appear

**Solution:** Token is invalid or missing. Check browser console

### Protected page shows content briefly then hides

**Solution:** This is normal - the access check runs client-side after initial render

## 📦 Files Created

```
src/
├── lib/
│   └── auth.ts                          # JWT functions
├── components/
│   └── AccessGuard.astro                # Protection component
├── pages/
│   ├── api/
│   │   └── stripe/
│   │       ├── generate-token.ts        # Token generation API
│   │       └── webhook.ts               # Stripe webhook handler
│   └── play/
│       └── [all pages updated]          # Added AccessGuard
readme/
└── ACCESS_CONTROL.md                    # Full documentation
```

## 🚢 Deployment Checklist

- [ ] Set production environment variables
- [ ] Test payment flow with real card
- [ ] Configure Stripe webhook in dashboard
- [ ] Test protected URLs in production
- [ ] Test Plash integration
- [ ] Monitor Stripe dashboard for payments

## 💡 Tips

1. **Testing**: Use browser console to debug token issues (`localStorage.getItem('animated_wallpapers_access')`)
2. **Support**: Direct users to `/recover-access` if they lose their token
3. **Monitoring**: Watch Stripe dashboard for successful payments
4. **Security**: Keep `STRIPE_SECRET_KEY` secret (never commit to git)
5. **URLs**: The long random strings in URLs make them hard to guess

## 📚 Further Reading

See `readme/ACCESS_CONTROL.md` for:

- Complete security architecture
- Token format details
- Advanced customization
- Troubleshooting guide
- Future enhancements

## ✅ Next Steps

1. Test the full payment flow locally
2. Deploy to production
3. Configure Stripe webhook (optional)
4. Test with real payment
5. Share wallpaper URLs with customers!
