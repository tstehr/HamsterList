#! /usr/bin/env sh

./install.sh
cd shared
yarn build
cd ../server
yarn build
cd ../client
yarn build
