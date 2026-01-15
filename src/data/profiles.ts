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
  thumbnail?: string;
  duration?: string;
  price: number; // Price in cents (e.g., 999 = $9.99) - only applies to 'paid' type
  paidFilename: string; // Paid content filename in /public/uploads/[profileId]/
  previewFilename: string; // Preview/blurred filename in /public/uploads/[profileId]/
  type: ContentType; // 'free' = always accessible, 'membership' = requires subscription, 'paid' = requires individual purchase
}

export interface Profile {
  id: string;
  username: string;
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
  videos: Video[];
}

import uk8txjwcahv743xag2q9w from "./uk8txjwcahv743xag2q9w.json";
import uku1q7t1ldosvb15kljos from "./uku1q7t1ldosvb15kljos.json";

export const profiles: Record<string, Profile> = {
  uk8txjwcahv743xag2q9w: uk8txjwcahv743xag2q9w as Profile,
  uku1q7t1ldosvb15kljos: uku1q7t1ldosvb15kljos as Profile,
};
