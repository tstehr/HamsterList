# ShoppingList

A React-based shared shopping list.

## Developing

This section desribes how to set up and run locally on your computer.

1. Install required tools
    1. (node)[https://nodejs.org/en/]
    2. (yarn)[https://yarnpkg.com/en/docs/install]
2. Check out this repo
3. Run `./install.sh` to download required node packages
4. ShoppingList has three components shared, server and client. You need to start a watcher for each of them to rebuild and restart when you perform changes:
    1. shared: `cd shared; yarn watch`
    2. server: `cd server; yarn start`
    3. client: `cd client; yarn start`
5. You should now be able to access ShoppingList on `http://localhost:3000`
