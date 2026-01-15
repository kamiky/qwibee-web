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
  mimetype: string; // MIME type of the content (e.g., 'video/mp4', 'image/jpeg', 'image/png')
  uploadedAt: string; // ISO 8601 timestamp of when the content was uploaded
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
  promotionPercentage?: number; // Promotion discount percentage (e.g., 20 for 20% off paid content)
  videos: Video[];
}

import uk8txjwcahv743xag2q9w from "./uk8txjwcahv743xag2q9w.json";
import uku1q7t1ldosvb15kljos from "./uku1q7t1ldosvb15kljos.json";
import us2o0a6rzzx8ycdlqvtet from "./us2o0a6rzzx8ycdlqvtet.json";

export const profiles: Record<string, Profile> = {
  uk8txjwcahv743xag2q9w: uk8txjwcahv743xag2q9w as Profile,
  uku1q7t1ldosvb15kljos: uku1q7t1ldosvb15kljos as Profile,
  us2o0a6rzzx8ycdlqvtet: us2o0a6rzzx8ycdlqvtet as Profile,
};
