/// <reference path="../.astro/types.d.ts" />
/// <reference types="node" />

interface ImportMetaEnv {
  // Stripe Configuration
  readonly STRIPE_SECRET_KEY: string;
  readonly STRIPE_PUBLIC_KEY: string;
  readonly STRIPE_PRODUCT_ID: string;
  readonly STRIPE_PRICE_ID: string;

  // Application URLs
  readonly PUBLIC_APP_URL: string;

  // Email Configuration
  readonly RESEND_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Extend Window interface for profile page data
interface Window {
  __profilePageData?: {
    profileId: string;
    videos: Array<{ id: string; price: number }>;
  };
}
