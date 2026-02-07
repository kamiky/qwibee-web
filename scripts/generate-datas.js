#!/usr/bin/env node

import { readdir, stat, writeFile, readFile } from "fs/promises";
import { join, extname, basename } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Uploads folder is now at project root level
const UPLOADS_DIR = join(__dirname, "..", "..", "uploads");
const DATA_DIR = join(__dirname, "..", "src", "data");

/**
 * Check if file exists
 */
async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a file is a paid content file
 */
function isPaidFile(filename) {
  return filename.startsWith("paid_");
}

/**
 * Check if a file is a preview file
 */
function isPreviewFile(filename) {
  return filename.startsWith("preview_");
}

/**
 * Extract the unique ID from a filename (paid_UNIQUEID_hash.ext or preview_UNIQUEID_hash.ext)
 */
function extractUniqueId(filename) {
  const parts = filename.split("_");
  if (parts.length >= 2 && (parts[0] === "paid" || parts[0] === "preview")) {
    return parts[1]; // The unique ID is the second part
  }
  return null;
}

/**
 * Check if a file is a thumbnail file
 */
function isThumbnailFile(filename) {
  return filename.includes("_thumb.");
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filename) {
  const ext = extname(filename).toLowerCase();
  const mimeTypes = {
    // Video formats
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
    // Image formats
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Get video duration using ffprobe
 * Returns formatted duration (MM:SS) or null if not a video or error
 */
async function getVideoDuration(filePath) {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    );
    
    const durationInSeconds = parseFloat(stdout.trim());
    
    if (isNaN(durationInSeconds)) {
      return null;
    }
    
    // Format as MM:SS
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = Math.floor(durationInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  } catch (error) {
    console.log(`    ⚠️  Could not extract duration from ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Determine content type based on filename or default logic
 * This is a placeholder - you may want to customize this logic
 */
function determineContentType(index, totalVideos) {
  // Example logic: first video is free, rest need membership or payment
  if (index === 0) return "free";
  if (index % 2 === 1) return "membership";
  return "paid";
}

/**
 * Generate a random 6-character ID (alphanumeric)
 */
function generateRandomId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate default video metadata
 */
async function generateVideoMetadata(uniqueId, sequentialNumber, paidFilename, previewFilename, paidThumbnail, previewThumbnail, totalExisting, profileId) {
  const contentType = determineContentType(totalExisting + sequentialNumber - 1, 0);
  const mimetype = getMimeType(paidFilename);
  const isImage = mimetype.startsWith('image/');
  const contentTypeName = isImage ? 'Image' : 'Video';
  const contentTypeNameFr = isImage ? 'Image' : 'Vidéo';
  
  // Generate random price between $4.99 and $14.99 for paid content
  const basePrice = contentType === "paid" ? Math.floor(Math.random() * 1000) + 499 : 0;
  
  // Generate random 6-character ID for the title
  const randomId = generateRandomId();
  
  // Get video duration if it's a video file
  let duration = "0:00";
  if (!isImage) {
    const paidFilePath = join(UPLOADS_DIR, profileId, paidFilename);
    const extractedDuration = await getVideoDuration(paidFilePath);
    if (extractedDuration) {
      duration = extractedDuration;
    }
  }
  
  const metadata = {
    id: uniqueId,
    title: {
      en: `${contentTypeName} ${randomId}`,
      fr: `${contentTypeNameFr} ${randomId}`,
    },
    description: {
      en: `Description for ${contentTypeName.toLowerCase()} ${randomId}`,
      fr: `Description de l'${contentTypeNameFr.toLowerCase()} ${randomId}`,
    },
    duration,
    price: basePrice,
    paidFilename,
    previewFilename,
    type: contentType,
    hide: false, // Default to visible
    mimetype,
    uploadedAt: new Date().toISOString(),
  };
  
  // Add thumbnails if they exist (for videos) or use the image files themselves (for images)
  if (isImage) {
    metadata.paidThumbnail = paidFilename;
    metadata.previewThumbnail = previewFilename;
  } else {
    if (paidThumbnail) metadata.paidThumbnail = paidThumbnail;
    if (previewThumbnail) metadata.previewThumbnail = previewThumbnail;
  }
  
  return metadata;
}

/**
 * Generate a URL-friendly slug from a username
 * Converts to lowercase and removes special characters
 */
function generateSlug(username) {
  return username
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Read existing profile JSON if it exists
 */
async function readExistingProfile(profileId) {
  const jsonPath = join(DATA_DIR, `${profileId}.json`);
  try {
    const exists = await fileExists(jsonPath);
    if (exists) {
      const content = await readFile(jsonPath, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.log(`    ℹ️  No existing profile found or error reading: ${error.message}`);
  }
  return null;
}

/**
 * Process a single folder and generate its video list
 * Merges with existing data if available
 */
async function processFolderVideos(folderPath, profileId, existingProfile) {
  console.log(`  📹 Processing content in folder: ${profileId}`);
  
  const files = await readdir(folderPath);
  
  // Group files by their unique ID
  const videoGroups = new Map();
  
  for (const file of files) {
    const filePath = join(folderPath, file);
    const stats = await stat(filePath);
    
    if (stats.isFile()) {
      const uniqueId = extractUniqueId(file);
      
      if (uniqueId) {
        if (!videoGroups.has(uniqueId)) {
          videoGroups.set(uniqueId, {
            paidFilename: null,
            previewFilename: null,
            paidThumbnail: null,
            previewThumbnail: null,
          });
        }
        
        const group = videoGroups.get(uniqueId);
        
        if (isThumbnailFile(file)) {
          // This is a thumbnail file
          if (isPaidFile(file)) {
            group.paidThumbnail = file;
          } else if (isPreviewFile(file)) {
            group.previewThumbnail = file;
          }
        } else {
          // This is a video/image file
          const isVideoFile = getMimeType(file).startsWith('video/');
          
          if (isPaidFile(file)) {
            group.paidFilename = file;
          } else if (isPreviewFile(file)) {
            // Prefer video files over image files for preview
            // If we already have a preview and this is a video, replace it
            // If we don't have a preview, or current preview is image and this is video, use this
            if (!group.previewFilename) {
              group.previewFilename = file;
            } else {
              const currentIsVideo = getMimeType(group.previewFilename).startsWith('video/');
              if (isVideoFile && !currentIsVideo) {
                // Replace image preview with video preview
                group.previewFilename = file;
              }
            }
          }
        }
      }
    }
  }
  
  // Create a map of existing videos by their ID for quick lookup
  const existingVideosMap = new Map();
  if (existingProfile && existingProfile.videos) {
    existingProfile.videos.forEach(video => {
      // Use the ID as the key since that's what we match on
      existingVideosMap.set(video.id, video);
    });
  }
  
  // Separate new videos from existing ones
  const newVideos = [];
  
  // Process all video groups found in the folder to identify new ones
  for (const [uniqueId, group] of videoGroups.entries()) {
    if (!group.paidFilename) {
      console.log(`    ⚠️  No paid file found for ID ${uniqueId}`);
      continue;
    }
    
    const existingVideo = existingVideosMap.get(uniqueId);
    
    if (!existingVideo) {
      // This is a new video/image
      newVideos.push({
        uniqueId,
        paidFilename: group.paidFilename,
        previewFilename: group.previewFilename,
        paidThumbnail: group.paidThumbnail,
        previewThumbnail: group.previewThumbnail,
      });
    }
  }
  
  // Generate metadata for new videos
  const newVideosWithMetadata = [];
  for (let index = 0; index < newVideos.length; index++) {
    const newVideo = newVideos[index];
    const metadata = await generateVideoMetadata(
      newVideo.uniqueId,
      index + 1,
      newVideo.paidFilename,
      newVideo.previewFilename,
      newVideo.paidThumbnail,
      newVideo.previewThumbnail,
      0, // Don't count existing when numbering new videos
      profileId
    );
    newVideosWithMetadata.push(metadata);
  }
  
  // Now process existing videos in their ORIGINAL order
  const existingVideosUpdated = [];
  if (existingProfile && existingProfile.videos) {
    for (const existingVideo of existingProfile.videos) {
      const group = videoGroups.get(existingVideo.id);
      
      if (group && group.paidFilename) {
        // Keep existing video data, just update file paths
        const videoData = {
          ...existingVideo,
          paidFilename: group.paidFilename,
          previewFilename: group.previewFilename || undefined,
        };
        
        // Remove priceAfterPromotion if it exists (deprecated field)
        delete videoData.priceAfterPromotion;
        
        // Ensure price is set correctly
        if (existingVideo.type === "paid") {
          videoData.price = existingVideo.price || 999;
        } else {
          videoData.price = 0;
        }
        
        // Preserve hide property, default to false if not present
        if (videoData.hide === undefined) {
          videoData.hide = false;
        }
        
        // Preserve uploadedAt if it exists, otherwise set it now
        if (!videoData.uploadedAt) {
          videoData.uploadedAt = new Date().toISOString();
        }
        
        // Update duration if it's a video and duration is missing or "0:00"
        const isImage = videoData.mimetype && videoData.mimetype.startsWith('image/');
        if (!isImage && (!videoData.duration || videoData.duration === "0:00")) {
          const paidFilePath = join(folderPath, group.paidFilename);
          const extractedDuration = await getVideoDuration(paidFilePath);
          if (extractedDuration) {
            videoData.duration = extractedDuration;
          }
        }
        
        // Update thumbnails (for videos, use thumbnail files; for images, use the image files themselves)
        if (isImage) {
          videoData.paidThumbnail = group.paidFilename;
          videoData.previewThumbnail = group.previewFilename || undefined;
        } else {
          videoData.paidThumbnail = group.paidThumbnail || undefined;
          videoData.previewThumbnail = group.previewThumbnail || undefined;
        }
        
        existingVideosUpdated.push(videoData);
        // Mark as processed
        existingVideosMap.delete(existingVideo.id);
      } else {
        // File no longer exists in folder - will be removed (don't add to list)
        console.log(`    ⚠️  File for ID ${existingVideo.id} not found in folder (removed)`);
      }
    }
  }
  
  // Combine: new videos first (at the top), then existing videos in their original order
  const allVideos = [...newVideosWithMetadata, ...existingVideosUpdated];
  
  console.log(`    ✓ Found ${allVideos.length} content item(s) (${allVideos.length - newVideos.length} existing, ${newVideos.length} new)`);
  if (existingVideosMap.size > 0) {
    console.log(`    ⚠️  ${existingVideosMap.size} item(s) from JSON not found in folder (removed)`);
  }
  
  return allVideos;
}

/**
 * Generate profile JSON for a folder
 * Merges with existing profile data if available
 */
async function generateProfileJson(folderPath, profileId) {
  console.log(`\n📁 Generating JSON for profile: ${profileId}`);
  
  // Read existing profile if it exists
  const existingProfile = await readExistingProfile(profileId);
  
  // Find avatar (first image file with paid_ prefix)
  const files = await readdir(folderPath);
  let avatar = null;
  
  // Use existing avatar if available
  if (existingProfile && existingProfile.avatar) {
    avatar = existingProfile.avatar;
    console.log(`  🖼️  Using existing avatar: ${existingProfile.avatar}`);
  } else {
    // Find new avatar
    for (const file of files) {
      if (isPaidFile(file)) {
        const ext = extname(file).toLowerCase();
        if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
          avatar = `/uploads/${profileId}/${file}`;
          console.log(`  🖼️  Found avatar: ${file}`);
          break;
        }
      }
    }
  }
  
  // Process videos (merging with existing data)
  const videos = await processFolderVideos(folderPath, profileId, existingProfile);
  
  // Generate a random promotion percentage between 10% and 30% if not already set
  const promotionPercentage = existingProfile?.promotionPercentage !== undefined 
    ? existingProfile.promotionPercentage 
    : Math.floor(Math.random() * 21) + 10;
  
  // Create profile object, preserving existing data where available
  const username = existingProfile?.username || profileId;
  const slug = existingProfile?.slug || generateSlug(username);
  
  const profile = {
    id: profileId,
    slug,
    username,
    displayName: existingProfile?.displayName || {
      en: `Creator ${profileId.substring(0, 8)}`,
      fr: `Créateur ${profileId.substring(0, 8)}`,
    },
    bio: existingProfile?.bio || {
      en: "Exclusive content creator sharing premium videos",
      fr: "Créateur de contenu exclusif partageant des vidéos premium",
    },
    ...(avatar && { avatar }),
    membershipPrice: existingProfile?.membershipPrice !== undefined ? existingProfile.membershipPrice : 999, // Preserve existing price or default to $9.99/month
    promotionPercentage, // Promotion discount percentage for paid content
    ...(existingProfile?.showDescription !== undefined && { showDescription: existingProfile.showDescription }), // Preserve showDescription if it exists
    ...(existingProfile?.socials && { socials: existingProfile.socials }), // Preserve socials if it exists
    videos,
  };
  
  return profile;
}

/**
 * Generate profiles.ts content that imports all JSON files
 */
function generateProfilesTypescript(profileIds) {
  const imports = profileIds
    .map((id) => `import ${id} from "./${id}.json";`)
    .join("\n");
  
  const profilesObject = profileIds
    .map((id) => `  ${id}: ${id} as Profile,`)
    .join("\n");
  
  return `export type ContentType = "free" | "membership" | "paid";

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
  hide: boolean; // Whether the video should be hidden from the profile
  mimetype: string; // MIME type of the content (e.g., 'video/mp4', 'image/jpeg', 'image/png')
  uploadedAt: string; // ISO 8601 timestamp of when the content was uploaded
}

export interface Profile {
  id: string;
  slug: string;
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
  showDescription?: boolean; // Whether to show description on profile page
  socials?: {
    instagram?: string;
    website?: string;
    [key: string]: string | undefined;
  }; // Social media links
  videos: Video[];
}

${imports}

export const profiles: Record<string, Profile> = {
${profilesObject}
};

// Helper function to generate profile URL
export const getProfileUrl = (profileId: string, lang: 'en' | 'fr' = 'en'): string => {
  const profile = profiles[profileId];
  if (!profile) return '/404';
  
  const basePath = lang === 'fr' ? '/fr' : '';
  return \`\${basePath}/u/\${profile.slug}/\${profile.id}\`;
};
`;
}

/**
 * Check if ffprobe is available
 */
async function checkFfprobe() {
  try {
    await execAsync("ffprobe -version");
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log("🎨 Starting data generation script...\n");
  console.log(`📂 Uploads directory: ${UPLOADS_DIR}`);
  console.log(`💾 Data directory: ${DATA_DIR}\n`);
  
  // Check for specific profile ID parameter
  const specificProfileId = process.argv[2];
  if (specificProfileId) {
    console.log(`🎯 Processing specific profile: ${specificProfileId}\n`);
  }
  
  try {
    // Check if ffprobe is available for video duration extraction
    const ffprobeAvailable = await checkFfprobe();
    if (!ffprobeAvailable) {
      console.log("⚠️  Warning: ffprobe not found. Video durations will be set to '0:00'.");
      console.log("   Install ffmpeg to enable video duration extraction: brew install ffmpeg\n");
    } else {
      console.log("✓ ffprobe found - video durations will be extracted\n");
    }
    
    // Check if uploads directory exists
    const uploadsExists = await fileExists(UPLOADS_DIR);
    if (!uploadsExists) {
      console.error(`✗ Uploads directory does not exist: ${UPLOADS_DIR}`);
      process.exit(1);
    }
    
    // Check if data directory exists
    const dataExists = await fileExists(DATA_DIR);
    if (!dataExists) {
      console.error(`✗ Data directory does not exist: ${DATA_DIR}`);
      process.exit(1);
    }
    
    // If a specific profile ID is provided, process only that one
    if (specificProfileId) {
      const specificPath = join(UPLOADS_DIR, specificProfileId);
      const specificExists = await fileExists(specificPath);
      if (!specificExists) {
        console.error(`✗ Profile folder does not exist: ${specificProfileId}`);
        process.exit(1);
      }

      const stats = await stat(specificPath);
      if (!stats.isDirectory()) {
        console.error(`✗ Path is not a directory: ${specificProfileId}`);
        process.exit(1);
      }

      // Generate profile JSON for the specific profile
      const profile = await generateProfileJson(specificPath, specificProfileId);
      
      // Write JSON file
      const jsonPath = join(DATA_DIR, `${specificProfileId}.json`);
      await writeFile(jsonPath, JSON.stringify(profile, null, 2), "utf-8");
      console.log(`  ✅ Written: ${specificProfileId}.json\n`);
      
      console.log("\n✅ Data generation completed successfully for profile:", specificProfileId);
      console.log("\n⚠️  Note: profiles.ts was not regenerated. Run without profile ID to regenerate profiles.ts");
      return;
    }
    
    // Get all folders in uploads directory
    const entries = await readdir(UPLOADS_DIR);
    const profileIds = [];
    
    for (const entry of entries) {
      const entryPath = join(UPLOADS_DIR, entry);
      const stats = await stat(entryPath);
      
      // Only process directories (skip .DS_Store and other files)
      if (stats.isDirectory()) {
        profileIds.push(entry);
        
        // Generate profile JSON
        const profile = await generateProfileJson(entryPath, entry);
        
        // Write JSON file
        const jsonPath = join(DATA_DIR, `${entry}.json`);
        await writeFile(jsonPath, JSON.stringify(profile, null, 2), "utf-8");
        console.log(`  ✅ Written: ${entry}.json\n`);
      }
    }
    
    if (profileIds.length === 0) {
      console.log("⚠️  No profile folders found in uploads directory.");
      process.exit(0);
    }
    
    // Generate profiles.ts
    console.log("📝 Generating profiles.ts...");
    const profilesContent = generateProfilesTypescript(profileIds);
    const profilesPath = join(DATA_DIR, "profiles.ts");
    await writeFile(profilesPath, profilesContent, "utf-8");
    console.log(`  ✅ Written: profiles.ts\n`);
    
    console.log("✨ Summary:");
    console.log("─────────────────────────────────────");
    console.log(`  Generated ${profileIds.length} profile(s):`);
    profileIds.forEach((id) => {
      console.log(`    • ${id}.json`);
    });
    console.log("─────────────────────────────────────");
    console.log("\n✅ Data generation completed successfully!");
  } catch (error) {
    console.error(`\n✗ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
