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

echo "Creating symlink for prerendered pages..."
cd dist/server
ln -sf ../client ./client
cd ../..

echo "Restarting PM2 process..."
pm2 restart watchmefans-web

echo "Deployment complete!"