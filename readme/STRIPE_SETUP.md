# Stripe Integration Setup

This document explains how to set up and use Stripe for the animated wallpapers payment system.

## Environment Variables

Create a `.env` file in the root of the project (copy from `.env.example`):

```bash
cp .env.example .env
```

Then update the following variables with your actual Stripe credentials:

### Development (.env)

```env
# Stripe Configuration (Development)
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_PUBLIC_KEY=pk_test_YOUR_PUBLIC_KEY_HERE
STRIPE_PRODUCT_ID=prod_YOUR_PRODUCT_ID_HERE
STRIPE_PRICE_ID=price_YOUR_PRICE_ID_HERE

# Application URLs
PUBLIC_APP_URL=http://localhost:4321
```

### Production (.env.production)

Create a `.env.production` file for production deployment:

```env
# Stripe Configuration (Production)
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE
STRIPE_PUBLIC_KEY=pk_live_YOUR_PUBLIC_KEY_HERE
STRIPE_PRODUCT_ID=prod_YOUR_PRODUCT_ID_HERE
STRIPE_PRICE_ID=price_YOUR_PRICE_ID_HERE

# Application URLs
PUBLIC_APP_URL=https://watchmefans.com
```

## Getting Stripe Credentials

1. **Create a Stripe Account**: Go to [https://stripe.com](https://stripe.com) and sign up

2. **Get API Keys**:

   - Navigate to Developers → API keys
   - Copy your **Publishable key** (`pk_test_...` for test mode)
   - Copy your **Secret key** (`sk_test_...` for test mode)

3. **Create a Product**:

   - Go to Products → Add product
   - Name: "All Animated Wallpapers"
   - Price: €9.80 (or your desired price)
   - Save and copy the **Price ID** (`price_...`)

4. **Update .env file** with your actual credentials

## How It Works

### 1. Checkout Flow

When a user clicks "Unlock All Wallpapers":

1. The button calls `/api/stripe/create-checkout-session`
2. The API creates a Stripe Checkout Session
3. User is redirected to Stripe's hosted checkout page
4. After payment, user is redirected back with success/cancel status

### 2. API Endpoint

Located at: `src/pages/api/stripe/create-checkout-session.ts`

**Request:**

```typescript
POST /api/stripe/create-checkout-session
Content-Type: application/json

{
  "priceId": "price_...",
  "successUrl": "https://yourdomain.com/animated-wallpaper?success=true",
  "cancelUrl": "https://yourdomain.com/animated-wallpaper?canceled=true"
}
```

**Response:**

```typescript
{
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

### 3. Success/Cancel Handling

After payment, users are redirected to:

- Success: `/animated-wallpaper?success=true` - Shows green success banner
- Cancel: `/animated-wallpaper?canceled=true` - Shows yellow cancel banner

## Testing

### Test Cards

Use these test card numbers in Stripe's test mode:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

Use any future expiry date, any 3-digit CVC, and any postal code.

### Local Testing

```bash
# Start dev server
npm run dev

# Visit http://localhost:4321/animated-wallpaper
# Click "Unlock All Wallpapers"
# Use test card to complete payment
```

## Production Deployment

### 1. Update Environment Variables

Make sure your production server has the correct environment variables:

```bash
# On your production server
nano .env.production

# Add your live Stripe keys (sk_live_..., pk_live_...)
```

### 2. Build for Production

```bash
npm run build:prod
```

### 3. Switch to Live Mode

In Stripe Dashboard:

- Toggle from "Test mode" to "Live mode"
- Get your live API keys
- Update `.env.production` with live keys

## Security Notes

⚠️ **Important Security Practices:**

1. **Never commit `.env` files** - They're already in `.gitignore`
2. **Keep secret keys server-side** - Only use public keys in client code
3. **Use environment variables** - Never hardcode credentials
4. **Test in test mode first** - Always test with test keys before going live
5. **Monitor Stripe Dashboard** - Watch for failed payments and disputes

## File Structure

```
src/
├── lib/
│   └── stripe.ts                    # Stripe client initialization
├── pages/
│   ├── api/
│   │   └── stripe/
│   │       └── create-checkout-session.ts  # Checkout API endpoint
│   └── animated-wallpaper/
│       └── index.astro              # Payment button implementation
└── env.d.ts                         # TypeScript environment types

.env                                 # Local development (gitignored)
.env.example                         # Template for environment variables
.env.production                      # Production config (gitignored)
```

## Troubleshooting

### "Missing STRIPE_SECRET_KEY" Error

- Check that `.env` file exists
- Verify environment variables are correctly set
- Restart the dev server after changing `.env`

### Payment Button Doesn't Work

- Check browser console for errors
- Verify STRIPE_PRICE_ID is correct
- Ensure API endpoint is accessible at `/api/stripe/create-checkout-session`

### Redirect Issues

- Verify PUBLIC_APP_URL matches your domain
- Check success/cancel URLs are correct
- Ensure Stripe webhook endpoints are configured (for production)

## Next Steps

After receiving your Stripe credentials, you should:

1. Update `.env` with test credentials
2. Test the payment flow locally
3. Create `.env.production` with live credentials
4. Deploy to production
5. Test live payment flow
6. Set up Stripe webhooks (optional, for advanced features)

## Support

For Stripe-specific issues, consult:

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Dashboard](https://dashboard.stripe.com)
