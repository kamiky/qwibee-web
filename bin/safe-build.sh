#!/bin/bash
# Safe build script: builds to dist-tmp, then swaps with dist if successful

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WEB_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_MODE="${1:-development}"

cd "$WEB_DIR"

echo "🏗️  Starting safe build process (mode: $BUILD_MODE)..."

# Step 1: Backup current dist to dist-backup if it exists
if [ -d "dist" ]; then
  echo "  💾 Backing up current dist to dist-backup..."
  if [ -d "dist-backup" ]; then
    rm -rf dist-backup
  fi
  mv dist dist-backup
fi

# Step 2: Build (will create new dist/)
echo "  📦 Building..."
if [ "$BUILD_MODE" = "production" ]; then
  yarn translate && astro check && astro build --mode production
else
  yarn translate && astro check && astro build
fi

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  
  # Restore backup if build failed
  if [ -d "dist-backup" ]; then
    echo "  🔄 Restoring previous dist from backup..."
    if [ -d "dist" ]; then
      rm -rf dist
    fi
    mv dist-backup dist
    echo "  ✓ Previous build restored"
  fi
  
  exit 1
fi

# Step 3: Copy uploads to new dist
echo "  📂 Copying uploads to dist/client/uploads..."

# Check if dist/client exists
if [ ! -d "dist/client" ]; then
  echo "❌ Error: dist/client directory does not exist."
  
  # Restore backup
  if [ -d "dist-backup" ]; then
    echo "  🔄 Restoring previous dist from backup..."
    rm -rf dist
    mv dist-backup dist
  fi
  
  exit 1
fi

# Remove existing uploads folder in dist if it exists
if [ -d "dist/client/uploads" ] || [ -L "dist/client/uploads" ]; then
  rm -rf dist/client/uploads
fi

# Determine source based on environment
if [ -d "/var/www/qwibee-uploads" ]; then
  UPLOADS_SRC="/var/www/qwibee-uploads"
  echo "     📍 Production environment detected"
  echo "     Copying /var/www/qwibee-uploads -> dist/client/uploads..."
else
  UPLOADS_SRC="$WEB_DIR/../uploads"
  echo "     📍 Local environment detected"
  echo "     Copying ../uploads -> dist/client/uploads..."
fi

# Copy uploads folder using rsync
rsync -a \
  --exclude='.git' \
  --exclude='.gitignore' \
  --exclude='node_modules' \
  --exclude='.DS_Store' \
  --exclude='package.json' \
  --exclude='README.md' \
  --exclude='scripts' \
  "$UPLOADS_SRC/" "dist/client/uploads/"

if [ $? -ne 0 ]; then
  echo "❌ Failed to copy uploads!"
  
  # Restore backup
  if [ -d "dist-backup" ]; then
    echo "  🔄 Restoring previous dist from backup..."
    rm -rf dist
    mv dist-backup dist
  fi
  
  exit 1
fi

FILE_COUNT=$(find dist/client/uploads -type f 2>/dev/null | wc -l | tr -d ' ')
echo "     ✓ Copied $FILE_COUNT files"

# Step 4: Clean up backup
if [ -d "dist-backup" ]; then
  echo "  🗑️  Removing backup..."
  rm -rf dist-backup
fi

echo "✅ Build completed successfully!"
echo ""
echo "📊 Build output at: dist/"

