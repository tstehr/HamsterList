#! /usr/bin/env sh

if [ -f env.sh ]
then
  echo "Using env.sh"
  source ./env.sh
fi

./install.sh
cd shared
yarn build
cd ../server
yarn build
cd ../client
yarn build
cd ../

rm -rf server/static
mv client/build server/static
