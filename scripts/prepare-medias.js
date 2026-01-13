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
 * Generate preview for video file (first 5 seconds, blurred)
 */
function generateVideoPreview(inputPath, outputPath) {
  console.log(`  → Generating video preview: ${basename(outputPath)}`);
  try {
    // Extract first 5 seconds and apply blur filter
    execSync(
      `ffmpeg -i "${inputPath}" -t 5 -vf "boxblur=20:5" -c:v libx264 -preset fast -c:a copy -y "${outputPath}"`,
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
    // Apply blur filter to image
    execSync(`ffmpeg -i "${inputPath}" -vf "boxblur=20:5" -y "${outputPath}"`, {
      stdio: "inherit",
    });
    return true;
  } catch (error) {
    console.error(`  ✗ Error generating image preview: ${error.message}`);
    return false;
  }
}

/**
 * Process a single file
 */
async function processFile(folderPath, filename) {
  const filePath = join(folderPath, filename);
  const ext = extname(filename);

  // Skip if already processed
  if (isAlreadyProcessed(filename)) {
    console.log(`  ⊘ Skipping (already processed): ${filename}`);
    return;
  }

  // Skip if not a media file
  if (!isVideo(filename) && !isImage(filename)) {
    console.log(`  ⊘ Skipping (not a media file): ${filename}`);
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

  const paidPath = join(folderPath, paidFilename);
  const previewPath = join(folderPath, previewFilename);

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

    // Get all folders in uploads directory
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
  } catch (error) {
    console.error(`\n✗ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main();
