#!/usr/bin/env node

import { readdir, stat, writeFile, readFile } from "fs/promises";
import { join, extname, basename } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOADS_DIR = join(__dirname, "..", "public", "uploads");
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
 * Generate default video metadata
 */
function generateVideoMetadata(uniqueId, sequentialNumber, paidFilename, previewFilename, totalExisting) {
  const contentType = determineContentType(totalExisting + sequentialNumber - 1, 0);
  const mimetype = getMimeType(paidFilename);
  const isImage = mimetype.startsWith('image/');
  const contentTypeName = isImage ? 'Image' : 'Video';
  const contentTypeNameFr = isImage ? 'Image' : 'Vidéo';
  
  return {
    id: uniqueId,
    title: {
      en: `${contentTypeName} ${totalExisting + sequentialNumber}`,
      fr: `${contentTypeNameFr} ${totalExisting + sequentialNumber}`,
    },
    description: {
      en: `Description for ${contentTypeName.toLowerCase()} ${totalExisting + sequentialNumber}`,
      fr: `Description de l'${contentTypeNameFr.toLowerCase()} ${totalExisting + sequentialNumber}`,
    },
    duration: "0:00", // Placeholder - could be extracted with ffprobe
    price: contentType === "paid" ? 999 : 0, // $9.99 for paid content
    paidFilename,
    previewFilename,
    type: contentType,
    mimetype,
  };
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
          });
        }
        
        const group = videoGroups.get(uniqueId);
        
        if (isPaidFile(file)) {
          group.paidFilename = file;
        } else if (isPreviewFile(file)) {
          group.previewFilename = file;
        }
      }
    }
  }
  
  // Create a map of existing videos by their filenames for quick lookup
  const existingVideosMap = new Map();
  if (existingProfile && existingProfile.videos) {
    existingProfile.videos.forEach(video => {
      // Use paidFilename as the key since it's unique
      existingVideosMap.set(video.paidFilename, video);
    });
  }
  
  // Collect all videos: existing ones + new ones
  const videos = [];
  const newVideos = [];
  
  // First, add all existing videos that still have matching files
  for (const [uniqueId, group] of videoGroups.entries()) {
    if (group.paidFilename && group.previewFilename) {
      const existingVideo = existingVideosMap.get(group.paidFilename);
      
      if (existingVideo) {
        // Keep existing video data, just ensure filenames match
        videos.push({
          ...existingVideo,
          paidFilename: group.paidFilename,
          previewFilename: group.previewFilename,
        });
        // Mark as processed
        existingVideosMap.delete(group.paidFilename);
      } else {
        // This is a new video/image pair
        newVideos.push({
          paidFilename: group.paidFilename,
          previewFilename: group.previewFilename,
        });
      }
    } else {
      console.log(
        `    ⚠️  Incomplete pair for ${uniqueId}: paid=${group.paidFilename}, preview=${group.previewFilename}`
      );
    }
  }
  
  // Add new videos with generated metadata
  const existingCount = videos.length;
  newVideos.forEach((newVideo, index) => {
    const uniqueId = extractUniqueId(newVideo.paidFilename);
    videos.push(
      generateVideoMetadata(
        uniqueId,
        index + 1,
        newVideo.paidFilename,
        newVideo.previewFilename,
        existingCount
      )
    );
  });
  
  console.log(`    ✓ Found ${videos.length} complete content pair(s) (${videos.length - newVideos.length} existing, ${newVideos.length} new)`);
  
  return videos;
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
  
  // Create profile object, preserving existing data where available
  const profile = {
    id: profileId,
    username: existingProfile?.username || profileId,
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
  thumbnail?: string;
  duration?: string;
  price: number; // Price in cents (e.g., 999 = $9.99) - only applies to 'paid' type
  paidFilename: string; // Paid content filename in /public/uploads/[profileId]/
  previewFilename: string; // Preview/blurred filename in /public/uploads/[profileId]/
  type: ContentType; // 'free' = always accessible, 'membership' = requires subscription, 'paid' = requires individual purchase
  mimetype: string; // MIME type of the content (e.g., 'video/mp4', 'image/jpeg', 'image/png')
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

${imports}

export const profiles: Record<string, Profile> = {
${profilesObject}
};
`;
}

/**
 * Main function
 */
async function main() {
  console.log("🎨 Starting data generation script...\n");
  console.log(`📂 Uploads directory: ${UPLOADS_DIR}`);
  console.log(`💾 Data directory: ${DATA_DIR}\n`);
  
  try {
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
