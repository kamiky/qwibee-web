#!/bin/bash
# Use this script in staging server only

# When we have error "Could not read from remote repository"
# read this : https://www.notion.so/Local-Remote-SSH-deploy-b57482f9a06f40629802003434db95a4?pvs=4

set -e  # Exit on any error

echo "Pulling from staging branch..."
git pull origin staging

echo "Installing dependencies..."
yarn install

echo "Building for staging..."
yarn build:prod

# Only proceed if build was successful (safe-build.sh handles everything)
if [ $? -eq 0 ]; then
  echo "Restarting PM2 process..."
  pm2 restart qwibee-web-staging

  echo "✅ Deployment complete!"
else
  echo "❌ Build failed! PM2 not restarted."
  exit 1
fi
