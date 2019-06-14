#! /usr/bin/env sh

if [ -f env.sh ]
then
  echo "[prepare] Using env.sh"
  source ./env.sh
fi

./install.sh | sed "s/^/[install] /"

# build shared first, then server and client in parallel
cd shared
yarn build | sed "s/^/[build] [shared] /"

# build client
cd ../client
yarn build | sed "s/^/[build] [client] /" &
client_pid=$!

# build server
cd ../server
yarn build | sed "s/^/[build] [server] /" &
server_pid=$!

wait $server_pid
wait $client_pid

# copy new static files after build
cd ../
rm -rf server/static
mv client/build server/static
