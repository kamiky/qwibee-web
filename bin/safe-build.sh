#!/bin/bash
# Safe build script: builds to dist/, renames to build/ on success

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WEB_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_MODE="${1:-development}"

cd "$WEB_DIR"

echo "🏗️  Starting build process (mode: $BUILD_MODE)..."

# Step 1: Remove old dist/ if it exists (from previous failed build)
if [ -d "dist" ]; then
  echo "  🗑️  Removing old dist/..."
  rm -rf dist
fi

# Step 2: Build (Astro builds to dist/)
echo "  📦 Building..."
if [ "$BUILD_MODE" = "production" ]; then
  yarn translate && astro check && astro build --mode production
else
  yarn translate && astro check && astro build
fi

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  echo "  🗑️  Cleaning up dist/..."
  if [ -d "dist" ]; then
    rm -rf dist
  fi
  exit 1
fi

# Step 3: Create symlink for uploads
echo "  🔗 Creating symlink for uploads..."

if [ ! -d "dist/client" ]; then
  echo "❌ Error: dist/client directory does not exist."
  rm -rf dist
  exit 1
fi

# Remove existing uploads folder/symlink if it exists
if [ -d "dist/client/uploads" ] || [ -L "dist/client/uploads" ]; then
  rm -rf dist/client/uploads
fi

# Determine source based on environment
if [ -d "/var/www/qwibee-uploads" ]; then
  UPLOADS_SRC="/var/www/qwibee-uploads"
  echo "     📍 Production environment"
else
  # For local environment, use absolute path
  UPLOADS_SRC="$(cd "$WEB_DIR/../uploads" && pwd)"
  echo "     📍 Local environment"
fi

# Create symlink
ln -sf "$UPLOADS_SRC" "dist/client/uploads"

if [ $? -ne 0 ]; then
  echo "❌ Failed to create uploads symlink!"
  rm -rf dist
  exit 1
fi

# Verify symlink was created
if [ -L "dist/client/uploads" ]; then
  TARGET=$(readlink dist/client/uploads)
  FILE_COUNT=$(find "$UPLOADS_SRC" -type f 2>/dev/null | wc -l | tr -d ' ')
  echo "     ✓ Symlink created: uploads -> $TARGET"
  echo "     ✓ $FILE_COUNT files accessible"
else
  echo "❌ Failed to verify uploads symlink!"
  rm -rf dist
  exit 1
fi

# Step 4: Create symlink for SSR
echo "  🔗 Creating symlink..."
if [ -d "dist/server" ]; then
  cd dist/server
  if [ -L "client" ] || [ -d "client" ]; then
    rm -rf client
  fi
  ln -sf ../client ./client
  cd ../..
  echo "     ✓ Symlink created"
fi

# Step 5: Replace build/ with new dist/
echo "  🔄 Replacing build/ with new build..."

if [ -d "build" ]; then
  rm -rf build
fi

mv dist build

echo "✅ Build completed successfully!"
echo ""
echo "📊 Build output at: build/"
echo "🚀 Site ready to start/restart"

