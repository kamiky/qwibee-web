#!/bin/bash
# Post-build script to copy uploads folder to dist/client/uploads

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WEB_DIR="$(dirname "$SCRIPT_DIR")"
UPLOADS_DEST="$WEB_DIR/dist/client/uploads"

echo "📦 Copying uploads to build directory..."

# Check if dist/client exists
if [ ! -d "$WEB_DIR/dist/client" ]; then
  echo "❌ Error: dist/client directory does not exist. Build the project first."
  exit 1
fi

# Remove existing uploads folder in dist if it exists
if [ -d "$UPLOADS_DEST" ] || [ -L "$UPLOADS_DEST" ]; then
  echo "  Removing existing uploads in dist..."
  rm -rf "$UPLOADS_DEST"
fi

# Determine source based on environment
# In production: use /var/www/qwibee-uploads
# In local: use ../uploads/assets
if [ -d "/var/www/qwibee-uploads" ]; then
  UPLOADS_SRC="/var/www/qwibee-uploads"
  echo "  📍 Production environment detected"
  echo "  Copying /var/www/qwibee-uploads -> dist/client/uploads..."
else
  UPLOADS_SRC="$WEB_DIR/../uploads/assets"
  echo "  📍 Local environment detected"
  echo "  Copying ../uploads/assets -> dist/client/uploads..."
fi

# Copy uploads folder to dist/client using rsync to exclude unnecessary files
rsync -a \
  --exclude='.git' \
  --exclude='.gitignore' \
  --exclude='node_modules' \
  --exclude='.DS_Store' \
  "$UPLOADS_SRC/" "$UPLOADS_DEST/"

# Count files copied (excluding directories)
FILE_COUNT=$(find "$UPLOADS_DEST" -type f | wc -l | tr -d ' ')
FOLDER_COUNT=$(find "$UPLOADS_DEST" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
echo "✅ Uploads copied successfully! ($FOLDER_COUNT folders, $FILE_COUNT files)"


