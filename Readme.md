# ShoppingList

A React-based shared shopping list.

## Clients

This repository contains a server and a web-based client. There is also a [cli
client](https://github.com/AberDerBart/shoppinglist-cli). If you wish to develop your own client, consider the [API
documentation](./API.md).

## Developing

This section describes how to set up and run shoppinglist locally on your computer.

1. Install required tools
   1. [node](https://nodejs.org/en/)
   2. [yarn](https://yarnpkg.com/en/docs/install)
2. Check out this repo
3. Run `./install.sh` to download required node packages
4. ShoppingList has three components shared, server and client. You need to start a watcher for each of them to rebuild and restart when you perform changes:
   1. shared: `cd shared; yarn watch`
   2. server: `cd server; yarn start`
   3. client: `cd client; yarn start`
5. You should now be able to access ShoppingList on `http://localhost:3000`

## Deploying

You can deploy your own shoppinglist instance.

1. Install required tools
   1. [node](https://nodejs.org/en/)
   2. [yarn](https://yarnpkg.com/en/docs/install)
2. Check out this repo
3. Run `./install.sh` to download required node packages
4. Run `./production_build.sh` to build for production
5. Run the server: `node server/build/index.js`, then stop it. This generates a config file.
6. Edit the file `config.json` and set the value of `"host"` to your domain
7. Run the server again
