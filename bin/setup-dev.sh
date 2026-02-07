#!/bin/bash
# Setup script for local development
# Creates symlink from public/uploads to the uploads folder at project root

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WEB_DIR="$(dirname "$SCRIPT_DIR")"
UPLOADS_DIR="$WEB_DIR/../uploads/assets"
PUBLIC_UPLOADS="$WEB_DIR/public/uploads"

echo "🔗 Setting up local development environment..."

# Remove existing uploads folder/symlink if it exists
if [ -L "$PUBLIC_UPLOADS" ] || [ -d "$PUBLIC_UPLOADS" ]; then
  echo "  Removing existing uploads folder/symlink..."
  rm -rf "$PUBLIC_UPLOADS"
fi

# Create symlink
echo "  Creating symlink: public/uploads -> ../../uploads/assets"
ln -s "$UPLOADS_DIR" "$PUBLIC_UPLOADS"

echo "✓ Development environment setup complete!"
echo ""
echo "  public/uploads -> $(readlink "$PUBLIC_UPLOADS")"
