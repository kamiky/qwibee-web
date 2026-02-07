#!/bin/bash
# When connecting to the remote server, use the -A flag to enable agent forwarding:

# Check this notion if issues with git auth (ssh key passphrase)
# https://www.notion.so/Local-Remote-SSH-deploy-b57482f9a06f40629802003434db95a4?pvs=4
# 
# git@github.com: Permission denied (publickey).
# fatal: Could not read from remote repository.
#
# > Please run the following command :
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa

echo "Deploying medias to production server..."
rsync -avz --delete --progress -e ssh \
  ../uploads/assets/ \
  root@142.93.173.10:/var/www/qwibee-uploads/

echo "✓ Medias deployed successfully to /var/www/qwibee-uploads!"

