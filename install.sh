#! /usr/bin/env sh

# all installs are run in parallel

cd shared
yarn install | sed "s/^/[shared] /" &
shared_pid=$!

cd ../server
yarn install | sed "s/^/[client] /" &
server_pid=$!

cd ../client
yarn install | sed "s/^/[server] /" &
client_pid=$!

wait $shared_pid
wait $server_pid
wait $client_pid