# Stripe Debug Mode

This feature allows you to test Stripe payments on production with a reduced price (1€) for debugging purposes.

## Setup

### Backend Configuration

1. Add the following environment variable to your backend `.env` file:

```bash
STRIPE_DEBUG_SECRET=your_secret_code_here
```

**Important**: Choose a strong, random secret that's hard to guess. For example:
```bash
STRIPE_DEBUG_SECRET=8f3a9c2b1e5d7f4a6b9c0e2d5f8a1b4c
```

## Usage

### Testing Membership Subscriptions

To test a membership subscription with debug pricing (1€):

1. Navigate to a creator page with the secret parameter:
   ```
   https://yourdomain.com/creator/profile123?secret=your_secret_code_here
   ```

2. Click the "Subscribe" button
3. The Stripe checkout will show 1€ instead of the normal membership price
4. Complete the test payment

### Testing One-Shot Content Purchases

To test a one-shot content purchase with debug pricing (1€):

1. Navigate to a creator page with the secret parameter:
   ```
   https://yourdomain.com/creator/profile123?secret=your_secret_code_here
   ```

2. Click the "Buy" button on any paid content
3. The Stripe checkout will show 1€ instead of the normal content price
4. Complete the test payment

## Security Notes

- The secret is validated on the **backend only** - users cannot manipulate the price by changing frontend code
- The secret is never stored in the frontend code
- The secret is passed from URL → Frontend → Backend for validation
- All Stripe metadata will include `debugMode: "true"` flag for tracking
- Backend logs will show when debug mode is activated

## How It Works

1. User visits creator page with `?secret=XXX` parameter
2. Frontend captures the secret from URL
3. When user clicks subscribe/buy, frontend sends the secret to backend
4. Backend validates the secret against `STRIPE_DEBUG_SECRET` env variable
5. If valid, backend overrides the price to 100 cents (1€)
6. Stripe checkout session is created with the debug price
7. Transaction is marked with `debugMode: "true"` in metadata

## Important

- Only share this secret with trusted team members
- Rotate the secret regularly
- Monitor Stripe dashboard for transactions with `[DEBUG]` tag
- These are **real transactions** - the 1€ will be charged to the test card
