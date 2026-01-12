# Stripe Setup Checklist

## ✅ Completed Setup

- [x] Installed Stripe SDK (`stripe` package v20.1.2)
- [x] Created `.env.example` template file
- [x] Created `.env` file with placeholders
- [x] Updated `src/env.d.ts` for TypeScript support
- [x] Created `src/lib/stripe.ts` for Stripe client initialization
- [x] Created API endpoint: `src/pages/api/stripe/create-checkout-session.ts`
- [x] Updated unlock CTA button in `src/pages/animated-wallpaper/index.astro`
- [x] Added success/cancel redirect handling
- [x] Updated `package.json` with `build:prod` script
- [x] Created comprehensive documentation: `STRIPE_SETUP.md`

## 🔄 Next Steps (To be done by you)

### 1. Get Stripe Credentials

- [ ] Sign up at https://stripe.com (if not already done)
- [ ] Go to Developers → API keys in Stripe Dashboard
- [ ] Copy your **Test** Secret Key (starts with `sk_test_`)
- [ ] Copy your **Test** Publishable Key (starts with `pk_test_`)

### 2. Create Product in Stripe

- [ ] Go to Products → Add product in Stripe Dashboard
- [ ] Set name: "All Animated Wallpapers"
- [ ] Set price: €9.80 (or your desired amount)
- [ ] Copy the **Price ID** (starts with `price_`)
- [ ] Copy the **Product ID** (starts with `prod_`)

### 3. Update Environment Variables

Edit `/Users/alexis/Documents/dev/projects/watchmefans/web/.env`:

```bash
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY
STRIPE_PUBLIC_KEY=pk_test_YOUR_ACTUAL_KEY
STRIPE_PRODUCT_ID=prod_YOUR_ACTUAL_ID
STRIPE_PRICE_ID=price_YOUR_ACTUAL_ID
PUBLIC_APP_URL=http://localhost:4321
```

### 4. Test Locally

```bash
cd /Users/alexis/Documents/dev/projects/watchmefans/web
npm run dev
```

- Visit http://localhost:4321/animated-wallpaper
- Click "Unlock All Wallpapers"
- Use test card: 4242 4242 4242 4242
- Verify success redirect

### 5. Production Setup (Later)

- [ ] Create `.env.production` file
- [ ] Get **Live** Stripe keys (sk*live*..., pk*live*...)
- [ ] Update `.env.production` with live credentials
- [ ] Set PUBLIC_APP_URL to your production domain
- [ ] Deploy with `npm run build:prod`

## 📁 Files Created/Modified

### New Files:

- `src/lib/stripe.ts` - Stripe client configuration
- `src/pages/api/stripe/create-checkout-session.ts` - Checkout API endpoint
- `.env` - Environment variables (gitignored)
- `.env.example` - Template for environment variables
- `STRIPE_SETUP.md` - Comprehensive setup documentation
- `STRIPE_CHECKLIST.md` - This checklist

### Modified Files:

- `src/env.d.ts` - Added TypeScript types for env variables
- `src/pages/animated-wallpaper/index.astro` - Updated unlock button with Stripe integration
- `package.json` - Added `build:prod` script, added `stripe` dependency

## 🧪 Test Cards

When testing in Stripe test mode, use these cards:

| Card Number         | Result                     |
| ------------------- | -------------------------- |
| 4242 4242 4242 4242 | ✓ Payment succeeds         |
| 4000 0000 0000 0002 | ✗ Payment declined         |
| 4000 0025 0000 3155 | 🔐 Requires authentication |

Use any future expiry date, any 3-digit CVC, any postal code.

## 🔒 Security Reminders

- ✓ `.env` files are already gitignored
- ⚠️ Never commit API keys to git
- ⚠️ Always test with test keys first
- ⚠️ Keep secret keys server-side only

## 📚 Documentation

Full documentation available in: `STRIPE_SETUP.md`

## 🆘 Need Help?

If you encounter issues:

1. Check `STRIPE_SETUP.md` for troubleshooting
2. Verify all environment variables are set correctly
3. Restart dev server after changing `.env`
4. Check browser console for errors
5. Check Stripe Dashboard → Logs for API errors
