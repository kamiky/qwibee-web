export type ContentType = "free" | "membership" | "paid";

export interface Video {
  id: string;
  title: {
    en: string;
    fr: string;
  };
  description: {
    en: string;
    fr: string;
  };
  duration?: string;
  price: number; // Price in cents (e.g., 999 = $9.99) - only applies to 'paid' type
  paidFilename: string; // Paid content filename in /public/uploads/[profileId]/
  previewFilename: string; // Preview/blurred filename in /public/uploads/[profileId]/
  paidThumbnail?: string; // Thumbnail for paid content (video frame or image itself)
  previewThumbnail?: string; // Thumbnail for preview content (video frame or blurred image)
  type: ContentType; // 'free' = always accessible, 'membership' = requires subscription, 'paid' = requires individual purchase
  hide: boolean; // If true, this content will be hidden from non-subscribers
  mimetype: string; // MIME type of the content (e.g., 'video/mp4', 'image/jpeg', 'image/png')
  uploadedAt: string; // ISO 8601 timestamp of when the content was uploaded
}

export interface Profile {
  id: string;
  slug: string;
  username: string;
  devonly?: boolean; // If true, only show in development mode
  displayName: {
    en: string;
    fr: string;
  };
  bio: {
    en: string;
    fr: string;
  };
  avatar?: string;
  membershipPrice?: number; // Monthly membership price in cents
  promotionPercentage?: number; // Promotion discount percentage (e.g., 20 for 20% off paid content)
  showDescription?: boolean; // If true, show the bio description under the creator name
  socials?: {
    instagram?: string; // Instagram username or URL
    tiktok?: string; // TikTok username or URL
    telegram?: string; // Telegram username or URL
    whatsapp?: string; // WhatsApp number or URL
    line?: string; // LINE ID or URL
    wechat?: string; // WeChat ID
    website?: string; // Any website URL
  };
  videos: Video[];
}

import u1me293c from "./u1me293c.json";
import uh29p8bf from "./uh29p8bf.json";
import uxykli0k from "./uxykli0k.json";
import u2as61e7 from "./u2as61e7.json";
import uoik2tfv from "./uoik2tfv.json";

// All profiles including dev-only
const allProfiles: Record<string, Profile> = {
  u1me293c: u1me293c as Profile,
  uh29p8bf: uh29p8bf as Profile,
  uxykli0k: uxykli0k as Profile,
  u2as61e7: u2as61e7 as Profile,
  uoik2tfv: uoik2tfv as Profile,
};

// Helper to check if we're in development mode
const isDevelopment = import.meta.env.MODE === "development";

// Filter out dev-only profiles in production/staging
export const profiles: Record<string, Profile> = Object.fromEntries(
  Object.entries(allProfiles).filter(([_, profile]) => {
    // If profile has devonly: true, only include it in development mode
    if (profile.devonly === true) {
      return isDevelopment;
    }
    return true;
  })
);

// Helper function to generate profile URL
export const getProfileUrl = (profileId: string, lang: 'en' | 'fr' = 'en'): string => {
  const profile = profiles[profileId];
  if (!profile) return '/404';
  
  const basePath = lang === 'fr' ? '/fr' : '';
  return `${basePath}/u/${profile.slug}/${profile.id}`;
};
