# WatchMeFans - Video Content Platform

A modern web application for creators to sell video content through memberships or one-time payments.

## Features

- 🎥 **Video Content Platform**: Creators can sell videos individually or through monthly subscriptions
- 💳 **Stripe Integration**: Secure payment processing for subscriptions and one-time purchases
- 🔐 **Access Control**: Magic link authentication for purchased content
- 📧 **Email Notifications**: Powered by Resend for transactional emails
- 🌍 **i18n Support**: Multi-language support (English & French)
- 🎨 **Modern UI**: Built with Tailwind CSS and Astro

## Tech Stack

- **Framework**: Astro 4.x
- **Frontend**: React + Tailwind CSS
- **Payments**: Stripe
- **Email**: Resend
- **Deployment**: Node.js with PM2

## Project Structure

```
/
├── public/
│   ├── videos/
│   │   └── profile1/          # Example profile videos
│   └── favicon.svg
├── src/
│   ├── components/            # Reusable components
│   ├── data/
│   │   └── profiles.ts        # Profile and video data
│   ├── i18n/                  # Translation files
│   ├── layouts/               # Page layouts
│   ├── lib/                   # Auth & Stripe utilities
│   └── pages/
│       ├── api/               # API endpoints
│       ├── [profileId].astro  # Dynamic profile pages
│       └── index.astro        # Landing page
└── readme/                    # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn or npm
- Stripe account
- Resend account

### Environment Variables

Create a `.env` file in the root:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend
RESEND_API_KEY=re_...

# App
PUBLIC_APP_URL=http://localhost:4321
```

### Installation

```bash
# Install dependencies
yarn install

# Run development server
yarn dev

# Build for production
yarn build

# Start production server
yarn start
```

## Adding New Profiles

Profiles are defined in `src/data/profiles.ts`. To add a new profile:

1. Create a folder in `public/videos/[profileId]/`
2. Add video files to that folder
3. Add profile configuration to `profiles.ts`:

```typescript
export const profiles: Record<string, Profile> = {
  profile1: {
    id: "profile1",
    username: "profile1",
    displayName: { en: "Creator Name", fr: "Nom du Créateur" },
    bio: { en: "Bio...", fr: "Bio..." },
    membershipPrice: 999, // $9.99/month
    videos: [
      // Video definitions...
    ],
  },
};
```

## Payment Flow

1. User visits profile page
2. Clicks subscribe or buy video
3. Redirects to Stripe Checkout
4. After successful payment, user gets access
5. User can recover access via magic link email

## Documentation

See the `readme/` folder for detailed documentation:

- Access Control Flow
- Stripe Setup
- Production Deployment
- Translation System

## License

Private - All rights reserved
