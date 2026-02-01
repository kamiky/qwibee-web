#!/bin/bash
# Use this script in production server only

# When we have error "Could not read from remote repository"
# read this : https://www.notion.so/Local-Remote-SSH-deploy-b57482f9a06f40629802003434db95a4?pvs=4

set -e  # Exit on any error

echo "Pulling from master branch..."
git pull origin master

echo "Installing dependencies..."
yarn install

echo "Building for production..."
yarn build:prod

# Only proceed if build was successful (safe-build.sh handles backup/restore)
if [ $? -eq 0 ]; then
  echo "Creating symlink for prerendered pages..."
  cd dist/server
  ln -sf ../client ./client
  cd ../..

  echo "Restarting PM2 process..."
  pm2 restart qwibee-web

  echo "✅ Deployment complete!"
else
  echo "❌ Build failed! PM2 not restarted. Previous build is still running."
  exit 1
fi
