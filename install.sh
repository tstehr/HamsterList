#! /usr/bin/env sh

cd shared
yarn install | sed "s/^/[shared] /"
cd ../server
yarn install | sed "s/^/[client] /"
cd ../client
yarn install | sed "s/^/[server] /"
