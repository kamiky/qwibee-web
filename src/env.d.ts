/// <reference path="../.astro/types.d.ts" />
/// <reference types="node" />

interface ImportMetaEnv {
  // Application URLs
  readonly PUBLIC_APP_URL: string;
  readonly PUBLIC_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Extend Window interface for profile page data
interface Window {
  __profilePageData?: {
    profileId: string;
    displayName: {
      en: string;
      fr: string;
    };
    promotionPercentage: number;
    videos: Array<{
      id: string;
      title: {
        en: string;
        fr: string;
      };
      price: number;
    }>;
  };
}
