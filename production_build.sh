#! /usr/bin/env sh

if [ -f env.sh ]
then
  echo "[prepare] Using env.sh"
  source ./env.sh
fi

./install.sh | sed "s/^/[install] /"

cd shared
yarn build | sed "s/^/[build] [shared] /"

cd ../server
yarn build | sed "s/^/[build] [server] /"

cd ../client
yarn build | sed "s/^/[build] [client] /"

cd ../

rm -rf server/static
mv client/build server/static
