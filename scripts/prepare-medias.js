#!/usr/bin/env node

import { readdir, stat, rename, access } from "fs/promises";
import { join, extname, basename } from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOADS_DIR = join(__dirname, "..", "public", "uploads");
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

/**
 * Generate a random alphanumeric string of specified length
 */
function generateRandomString(length) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Check if a folder name matches the format u[20-length-hash]
 */
function isValidUserIdFormat(folderName) {
  // Match: u followed by exactly 20 alphanumeric characters
  const pattern = /^u[a-z0-9]{20}$/;
  return pattern.test(folderName);
}

/**
 * Generate a new user ID in the format u[20-length-hash]
 */
function generateUserId() {
  return "u" + generateRandomString(20);
}

/**
 * Rename folders that don't respect the format u[20-length-hash]
 * Returns a mapping of old names to new names
 */
async function renameFoldersToUserIdFormat(uploadsDir) {
  console.log("🔄 Checking folder names for user ID format...\n");

  const renameMap = {};

  try {
    const entries = await readdir(uploadsDir);

    for (const entry of entries) {
      const entryPath = join(uploadsDir, entry);
      const stats = await stat(entryPath);

      // Only process directories
      if (stats.isDirectory()) {
        if (!isValidUserIdFormat(entry)) {
          // Generate a new user ID
          let newUserId = generateUserId();

          // Ensure the new ID doesn't already exist
          let newPath = join(uploadsDir, newUserId);
          while (await fileExists(newPath)) {
            newUserId = generateUserId();
            newPath = join(uploadsDir, newUserId);
          }

          // Rename the folder
          console.log(`  📝 Renaming: "${entry}" → "${newUserId}"`);
          await rename(entryPath, newPath);
          renameMap[entry] = newUserId;
        } else {
          console.log(`  ✓ Already valid format: ${entry}`);
        }
      }
    }

    if (Object.keys(renameMap).length > 0) {
      console.log("\n📋 Folder Rename Summary:");
      console.log("────────────────────────────────────────");
      for (const [oldName, newName] of Object.entries(renameMap)) {
        console.log(`  "${oldName}" → "${newName}"`);
      }
      console.log("────────────────────────────────────────");
      console.log(
        "\n⚠️  IMPORTANT: Update these folder names in src/data/profiles.ts"
      );
      console.log("   These IDs will be used for Stripe payment references.\n");
    } else {
      console.log("\n✅ All folders already follow the correct format.\n");
    }

    return renameMap;
  } catch (error) {
    console.error(`✗ Error renaming folders: ${error.message}`);
    throw error;
  }
}

/**
 * Check if file exists
 */
async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a file is a video
 */
function isVideo(filename) {
  const ext = extname(filename).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext);
}

/**
 * Check if a file is an image
 */
function isImage(filename) {
  const ext = extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Check if a file is already processed (starts with paid_ or preview_)
 */
function isAlreadyProcessed(filename) {
  return filename.startsWith("paid_") || filename.startsWith("preview_");
}

/**
 * Get video/image dimensions
 */
function getMediaDimensions(inputPath) {
  try {
    const output = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${inputPath}"`,
      { encoding: "utf-8" }
    );
    const [width, height] = output.trim().split("x").map(Number);
    return { width, height };
  } catch (error) {
    console.error(`  ⚠ Could not get dimensions, using default blur`);
    return null;
  }
}

/**
 * Calculate blur radius based on image dimensions (1% of width)
 */
function calculateBlurRadius(width) {
  // Use 1% of width as blur radius for consistent blur effect
  // Minimum of 5, maximum of 25 to keep blur reasonable
  const blurRadius = Math.round(width * 0.01);
  return Math.max(5, Math.min(25, blurRadius));
}

/**
 * Generate thumbnail for video file (frame at 1 second)
 */
function generateVideoThumbnail(inputPath, outputPath) {
  console.log(`  → Generating video thumbnail: ${basename(outputPath)}`);
  try {
    // Extract a frame at 1 second and save as JPEG
    execSync(
      `ffmpeg -i "${inputPath}" -ss 00:00:01 -vframes 1 -q:v 2 -y "${outputPath}"`,
      { stdio: "inherit" }
    );
    return true;
  } catch (error) {
    console.error(`  ✗ Error generating video thumbnail: ${error.message}`);
    return false;
  }
}

/**
 * Generate preview for video file (first 5 seconds, blurred)
 */
function generateVideoPreview(inputPath, outputPath) {
  console.log(`  → Generating video preview: ${basename(outputPath)}`);
  try {
    // Get video dimensions to calculate proportional blur
    const dimensions = getMediaDimensions(inputPath);
    const blurRadius = dimensions ? calculateBlurRadius(dimensions.width) : 20; // fallback to 20 if dimensions can't be determined

    console.log(
      `  → Applying blur radius: ${blurRadius}px (video width: ${dimensions?.width || "unknown"}px)`
    );

    // Extract first 5 seconds and apply blur filter
    // Scale up by 25%, blur, then center-crop back to prevent edge blur
    const videoFilter = dimensions
      ? `scale=iw*1.25:ih*1.25,boxblur=${blurRadius}:5,crop=${dimensions.width}:${dimensions.height}:(in_w-out_w)/2:(in_h-out_h)/2`
      : `boxblur=${blurRadius}:5`;

    execSync(
      `ffmpeg -i "${inputPath}" -t 5 -vf "${videoFilter}" -c:v libx264 -preset fast -c:a copy -y "${outputPath}"`,
      { stdio: "inherit" }
    );
    return true;
  } catch (error) {
    console.error(`  ✗ Error generating video preview: ${error.message}`);
    return false;
  }
}

/**
 * Generate preview for image file (blurred)
 */
function generateImagePreview(inputPath, outputPath) {
  console.log(`  → Generating image preview: ${basename(outputPath)}`);
  try {
    // Get image dimensions to calculate proportional blur
    const dimensions = getMediaDimensions(inputPath);
    const blurRadius = dimensions ? calculateBlurRadius(dimensions.width) : 20; // fallback to 20 if dimensions can't be determined

    console.log(
      `  → Applying blur radius: ${blurRadius}px (image width: ${dimensions?.width || "unknown"}px)`
    );

    // Apply blur filter to image
    // Scale up by 25%, blur, then center-crop back to prevent edge blur
    const imageFilter = dimensions
      ? `scale=iw*1.25:ih*1.25,boxblur=${blurRadius}:5,crop=${dimensions.width}:${dimensions.height}:(in_w-out_w)/2:(in_h-out_h)/2`
      : `boxblur=${blurRadius}:5`;

    execSync(
      `ffmpeg -i "${inputPath}" -vf "${imageFilter}" -y "${outputPath}"`,
      {
        stdio: "inherit",
      }
    );
    return true;
  } catch (error) {
    console.error(`  ✗ Error generating image preview: ${error.message}`);
    return false;
  }
}

/**
 * Extract unique ID and hash from already processed filename
 */
function extractProcessedFilenameInfo(filename) {
  // Format: paid_UNIQUEID_HASH.ext or preview_UNIQUEID_HASH.ext
  const parts = filename.split("_");
  if (parts.length >= 3 && (parts[0] === "paid" || parts[0] === "preview")) {
    const type = parts[0]; // 'paid' or 'preview'
    const uniqueId = parts[1];
    const hashWithExt = parts[2];
    const ext = extname(hashWithExt);
    const hash = hashWithExt.replace(ext, "");
    return { type, uniqueId, hash, ext };
  }
  return null;
}

/**
 * Process a single file
 */
async function processFile(folderPath, filename) {
  const filePath = join(folderPath, filename);
  const ext = extname(filename);

  // Skip if not a media file
  if (!isVideo(filename) && !isImage(filename)) {
    console.log(`  ⊘ Skipping (not a media file): ${filename}`);
    return;
  }

  // Check if already processed
  if (isAlreadyProcessed(filename)) {
    // For already processed files, check if preview and thumbnails exist and generate if needed
    const fileInfo = extractProcessedFilenameInfo(filename);

    if (!fileInfo) {
      console.log(`  ⊘ Skipping (invalid format): ${filename}`);
      return;
    }

    // Only process paid_ files (skip preview_ files to avoid duplicate processing)
    if (fileInfo.type === "preview") {
      return;
    }

    console.log(`\n  Checking for missing files: ${filename}`);

    const paidPath = join(folderPath, filename);
    const previewFilename = `preview_${fileInfo.uniqueId}_${fileInfo.hash}${ext}`;
    const previewPath = join(folderPath, previewFilename);

    // Check if preview exists, generate if missing
    const previewExists = await fileExists(previewPath);
    if (!previewExists) {
      console.log(`  → Preview missing, regenerating...`);
      if (isVideo(filename)) {
        generateVideoPreview(paidPath, previewPath);
      } else if (isImage(filename)) {
        generateImagePreview(paidPath, previewPath);
      }
    }

    // For videos, check and generate thumbnails
    if (isVideo(filename)) {
      const thumbnailExt = ".jpg";
      const paidThumbnailFilename = `paid_${fileInfo.uniqueId}_${fileInfo.hash}_thumb${thumbnailExt}`;
      const previewThumbnailFilename = `preview_${fileInfo.uniqueId}_${fileInfo.hash}_thumb${thumbnailExt}`;
      const paidThumbnailPath = join(folderPath, paidThumbnailFilename);
      const previewThumbnailPath = join(folderPath, previewThumbnailFilename);

      // Generate thumbnail for paid video if missing
      const paidThumbnailExists = await fileExists(paidThumbnailPath);
      if (!paidThumbnailExists) {
        console.log(`  → Paid thumbnail missing, generating...`);
        generateVideoThumbnail(paidPath, paidThumbnailPath);
      }

      // Generate thumbnail for preview video if missing (and preview exists)
      if (previewExists || !previewExists) {
        // Re-check preview existence after potential generation
        const previewNowExists = await fileExists(previewPath);
        if (previewNowExists) {
          const previewThumbnailExists = await fileExists(previewThumbnailPath);
          if (!previewThumbnailExists) {
            console.log(`  → Preview thumbnail missing, generating...`);
            generateVideoThumbnail(previewPath, previewThumbnailPath);
          }
        }
      }
    }

    console.log(`  ✓ Check completed for: ${filename}`);
    return;
  }

  console.log(`\n  Processing: ${filename}`);

  // Generate unique IDs
  const uniqueId = generateRandomString(8);
  const paidHash = generateRandomString(30);
  const previewHash = generateRandomString(30);

  // Generate new filenames
  const paidFilename = `paid_${uniqueId}_${paidHash}${ext}`;
  const previewFilename = `preview_${uniqueId}_${previewHash}${ext}`;

  // Thumbnail filenames (always .jpg for videos, same extension for images)
  const thumbnailExt = isVideo(filename) ? ".jpg" : ext;
  const paidThumbnailFilename = `paid_${uniqueId}_${paidHash}_thumb${thumbnailExt}`;
  const previewThumbnailFilename = `preview_${uniqueId}_${previewHash}_thumb${thumbnailExt}`;

  const paidPath = join(folderPath, paidFilename);
  const previewPath = join(folderPath, previewFilename);
  const paidThumbnailPath = join(folderPath, paidThumbnailFilename);
  const previewThumbnailPath = join(folderPath, previewThumbnailFilename);

  // STEP 1: Rename original file to paid_
  console.log(`  → Renaming to: ${paidFilename}`);
  await rename(filePath, paidPath);

  // STEP 2: Generate preview if it doesn't exist
  const previewExists = await fileExists(previewPath);
  if (!previewExists) {
    if (isVideo(filename)) {
      generateVideoPreview(paidPath, previewPath);
    } else if (isImage(filename)) {
      generateImagePreview(paidPath, previewPath);
    }
  } else {
    console.log(`  ⊘ Preview already exists: ${previewFilename}`);
  }

  // STEP 3: Generate thumbnails for videos only
  // For images, the files themselves will be used as thumbnails
  if (isVideo(filename)) {
    // Generate thumbnail for paid video
    const paidThumbnailExists = await fileExists(paidThumbnailPath);
    if (!paidThumbnailExists) {
      generateVideoThumbnail(paidPath, paidThumbnailPath);
    } else {
      console.log(
        `  ⊘ Paid thumbnail already exists: ${paidThumbnailFilename}`
      );
    }

    // Generate thumbnail for preview video
    const previewThumbnailExists = await fileExists(previewThumbnailPath);
    if (!previewThumbnailExists) {
      generateVideoThumbnail(previewPath, previewThumbnailPath);
    } else {
      console.log(
        `  ⊘ Preview thumbnail already exists: ${previewThumbnailFilename}`
      );
    }
  }

  console.log(`  ✓ Completed: ${basename(folderPath)}/${filename}`);
}

/**
 * Process all files in a folder
 */
async function processFolder(folderPath) {
  const folderName = basename(folderPath);
  console.log(`\n📁 Processing folder: ${folderName}`);

  try {
    const files = await readdir(folderPath);

    for (const file of files) {
      const filePath = join(folderPath, file);
      const stats = await stat(filePath);

      // Only process files, not subdirectories
      if (stats.isFile()) {
        await processFile(folderPath, file);
      }
    }
  } catch (error) {
    console.error(`✗ Error processing folder ${folderName}: ${error.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log("🎬 Starting media preparation script...\n");
  console.log(`📂 Uploads directory: ${UPLOADS_DIR}\n`);

  try {
    // Check if uploads directory exists
    const uploadsExists = await fileExists(UPLOADS_DIR);
    if (!uploadsExists) {
      console.error(`✗ Uploads directory does not exist: ${UPLOADS_DIR}`);
      process.exit(1);
    }

    // STEP 1: Rename folders to user ID format (u[20-length-hash])
    // This must happen BEFORE processing media files
    const renameMap = await renameFoldersToUserIdFormat(UPLOADS_DIR);

    // STEP 2: Process media files in each folder
    console.log("🎬 Processing media files...\n");

    // Get all folders in uploads directory (after renaming)
    const entries = await readdir(UPLOADS_DIR);

    for (const entry of entries) {
      const entryPath = join(UPLOADS_DIR, entry);
      const stats = await stat(entryPath);

      // Only process directories
      if (stats.isDirectory()) {
        await processFolder(entryPath);
      }
    }

    console.log("\n\n✅ Media preparation completed successfully!");

    // Remind user to update profiles.ts if any folders were renamed
    if (Object.keys(renameMap).length > 0) {
      console.log(
        "\n⚠️  REMINDER: Don't forget to update the folder names in src/data/profiles.ts!"
      );
    }
  } catch (error) {
    console.error(`\n✗ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main();
