#!/bin/bash
# Use this script in production server only

# When we have error "Could not read from remote repository"
# read this : https://www.notion.so/Local-Remote-SSH-deploy-b57482f9a06f40629802003434db95a4?pvs=4

echo "Pulling from master branch..."
git pull origin master

echo "Installing dependencies..."
yarn install

echo "Building for production..."
yarn build:prod

echo "Copying uploads folder to dist/client/uploads..."
rm -rf dist/client/uploads
cp -r /var/www/qwibee-uploads dist/client/uploads

echo "Creating symlink for prerendered pages..."
cd dist/server
ln -sf ../client ./client
cd ../..

echo "Restarting PM2 process..."
pm2 restart qwibee-web

echo "Deployment complete!"