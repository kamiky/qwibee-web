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

import u1me293cbgiobr49v8ili from "./u1me293cbgiobr49v8ili.json";
import uh29p8bfmxshdesr65zi6 from "./uh29p8bfmxshdesr65zi6.json";

export const profiles: Record<string, Profile> = {
  u1me293cbgiobr49v8ili: u1me293cbgiobr49v8ili as Profile,
  uh29p8bfmxshdesr65zi6: uh29p8bfmxshdesr65zi6 as Profile,
};
