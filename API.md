# API Specification

Base URL is `/api/`, all URLs are formed by appending to the base URL. All payloads are formatted as [JSON].

[JSON]: http://json.org

Generally, endpoints will respond with status *200 Success* unless specified otherwise.

## General error handling

On any error, an appropriate HTTP status code will be returned. The endpoint will return an [Error] that describes what went wrong.

All bodies must contain the object as specified. If keys are missing or additional keys are present, the request will be rejected with status *400 Bad Request*.

Requests to non-existing resources will result in a *404 Not Found* status.

Endpoint-specific errors are described below.

## Endpoints

| Endpoint                 | Method | Body           | Return                        |
|--------------------------|--------|----------------|-------------------------------|
| `/:listid`               | GET    | -              | [ShoppingList]                |
| `/:listid`               | PUT    | [ShoppingList] | [ShoppingList]                |
| `/:listid/items`         | GET    | -              | Array of [Item]               |
| `/:listid/items`         | POST   | [Item]         | [Item]                        |
| `/:listid/items/:itemid` | PUT    | [Item]         | [Item]                        |
| `/:listid/items/:itemid` | DELETE | -              | -                             |
| `/:listid/completions`   | GET    | -              | Array of [CompletionItem]     |
| `/:listid/categories `   | GET    | -              | Array of [CategoryDefinition] |
| `/:listid/categories `   | PUT    | Array of [CategoryDefinition] | Array of [CategoryDefinition] |
| `/:listid/sync`          | GET    | -              | [SyncedShoppingList]          |
| `/:listid/sync`          | POST   | [SyncRequest]  | [SyncedShoppingList]          |

### GET  /:listid

Gets the list object.

### PUT  /:listid

Updates the list object, `id` in the body and `:listid` in the URL must be equal. Note `items` will be ignored and may be omitted, only the name can be set.

### GET   /:listid/items

Gets the current items of the list.

### POST  /:listid/items

Creates a new item, `id` must be omitted in body and will be assigned by the server. If you wish to create items with the `id` assigned by the client, use the PUT endpoint instead.

Clients may choose to send an item's [string representation](#string-representation) instead of the item by appending the query parameter `parse` (`/:listid/items?parse`).

On success, returns the newly created with status *201 Created*. The *Location* header will contain the URL of the new item.

### PUT   /:listid/items/:id

Creates or updates item, `id`  in body and `:id` in the URL must be equal.

Clients may choose to send an item's [string representation](#string-representation) instead of the item by appending the query parameter `parse` (`/:listid/items/:id?parse`).

On success, may return status *200 Success* for successful update or *201 Created* for successful creation.

### DELETE /:listid/items/:id

Deletes item with id `:id`.

On success, returns *204 No Content*

### GET    /:listid/completions

Returns a list of frequently used items in descending order of use. The items contain `name` and optionally a `category`. This list is kept by the server and updated over time. Clients may use this list to implement completion when inserting new items.

### GET    /:listid/categories

Gets the categories for the shopping list.

### PUT    /:listid/categories

Updates the categories for the shopping list.

### GET    /:listid/sync

Used for sync with offline-capable clients to get an initial state from which to sync.

### POST   /:listid/sync

Used for sync with offline-capable clients. This is __not__ a REST endpoint!

To use the sync endpoint the client should persistently store the response of the last sync and send it together with the current local state. The client state and the server state will then be merged to produce a new state, which is sent as response. Use the GET endpoint to obtain an initial sync state.

## Change Notifications

Clients can connect to the server to receive notifications when a [ShoppingList] is updated. For this the server provides a WebSocket at `/:listid/socket`.

Whenever the list is touched[^touch] on the server, its current token is pushed to the client. The client can compare it to the token of its previous sync to determine whether a sync is necessary.

Note: A touch indicates a server operation on the [ShoppingList], e.g. a PUT on an [Item] or a POST to `/:listid/sync`. The operation may have not changed the [ShoppingList] at all. However, every change is guaranteed to be a touch.

## Data Types

[ShoppingList]: #shoppinglist
[Item]: #item
[CompletionItem]: #completionitem
[Amount]: #amount
[CategoryDefinition]: #categorydefinition
[SyncRequest]: #syncrequest
[SyncedShoppingList]: #syncedshoppinglist
[Error]: #error

### ShoppingList

This object represents a shopping list.

| Field | Type                   | Description                            |
|-------|------------------------|----------------------------------------|
| id    | String                 | Unique identifier of the shopping list |
| title | String                 | Name of the shopping list              |
| items | Array of [Item]        | Items of the list                      |

### Item

This object represents an item on a shopping list.

| Field    | Type            | Description                                                 |
|----------|-----------------|-------------------------------------------------------------|
| id       | String, UUID-v4 | Unique identifier of the item                               |
| name     | String          | Description of the item to be bought                        |
| amount   | [Amount]        | *Optional.*<sup>[AM](#AM)</sup>The amount of the item       |
| category | String, UUID-v4 | *Optional.* ID of the item's category<sup>[CAT](#CAT)</sup> |


<a name="AM">AM</a>: If *amount* is not set an Item will be treated as having `amount.value = 1` and no `amount.unit`.

<a name="CAT">CAT</a>:  Clients should treat a category that is not in the categories for the list as if the category was not set.


#### String representation

An item has a canonical string representation. Clients are advised to use this representation when displaying items as strings. The string representation is be created as follows:

```
itemToString(item)
  if item.amount is defined and item.amount.unit is defined
    return round(item.amount.value, 2) + " " + trim(item.amount.unit) + " " + trim(item.name)
  else if item.amount is defined
    return round(item.amount.value, 2) + " " + trim(item.name)
  else
    return trim(item.name)

```

Note that two different items my share the same string description, e.g.  for `item1 = {name: "kg", amount: {value: 1}}` and `item2 = {name: "", amount: {value: 1, unit: "kg"} }`

When having the server parse the string representation you may  prepend the `shortName` of a [CategoryDefinition] in parentheses to assign that category to the item, e.g. `(M) 1 litre Milk` to assign the category with `shortName = m`.


### CompletionItem

This object represents an item for purposes of completions. This is essentially [Item], but simplified.

| Field    | Type            | Description                                        |
|----------|-----------------|----------------------------------------------------|
| name     | String          | Description of the item to be bought               |
| category | String, UUID-v4 | *Optional.* ID of the item's category              |


### Amount

This object represents an amount of an item.

| Field | Type                   | Description                                                             |
|-------|------------------------|-------------------------------------------------------------------------|
| value | Float, positive number | The value of the amount                                                 |
| unit  | String                 | *Optional.* Unit of amount. String must represent a unit of measurement |


### CategoryDefinition

This object represents a category of items.

| Field     | Type                                          | Description                                        |
|-----------|-----------------------------------------------|----------------------------------------------------|
| id        | String, UUID-v4                               | Unique identifier of the category                  |
| name      | String                                        | Description of the category                        |
| shortName | String                                        | Short name of the category                         |
| color     | String, valid CSS color<sup>[COL](#COL)</sup> | Color of the category                              |
| lightText | boolean                                       | Should light text be used with the color?          |

<a name="COL">COL</a>: The color should be a valid color value according to sections 4.1 -- 4.3 of the [CSS Color Module Level 3] specification.

[CSS Color Module Level 3]: https://www.w3.org/TR/2017/CR-css-color-3-20171205/

### SyncRequest

This object is sent by a client to the server when initiating sync.

| Field        | Type           | Description |
|--------------|----------------|-------------|
| previousSync | [SyncedShoppingList] | The object returned by the server on the previous sync request done by the client |
| currentState | [ShoppingList] | The current data as held by the client |

### SyncedShoppingList

This object is returned by the server after a finished sync. It is very similar to [ShoppingList] but contains a token for sync in addition.

| Field | Type                   | Description                            |
|-------|------------------------|----------------------------------------|
| id    | String                 | Unique identifier of the shopping list |
| title | String                 | Name of the shopping list              |
| token | String                 | A token for synchronization            |
| items | Array of [Item]        | Items of the list                      |

### Error

This object represents an error returned by the server.

| Field | Type   | Description                              |
|-------|--------|------------------------------------------|
| error | String | An string describing the error in detail |
