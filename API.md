# API Specification

Base URL is `/api/`, all URLs are formed by appending to the base URL. All payloads are formatted as [JSON].

[JSON]: http://json.org

Generally, endpoints will respond with status *200 Success* unless specified otherwise.

## General error handling

On any error, an appropriate HTTP status code will be returned. The endpoint will return an [Error] that describes what went wrong.

All bodies must contain the object as specified. If keys are missing or additional keys are present, the request will be rejected with status *400 Bad Request*.

Requests to non-existing resources will result in a *404 Not Found* status.

Endpoint-specific errors are described below.

## Username

Clients should include a username to specify the name of the user that is performing the change. This name will be used in the [Changes](#Change) caused by the user.

The username is specified as a HTTP header `X-ShoppingList-Username`, where the value is [URL encoded].

[URL encoded]: https://en.wikipedia.org/wiki/Percent-encoding#Current_standard


## Endpoints

| Endpoint                               | Method | Body           | Return                        |
|----------------------------------------|--------|----------------|-------------------------------|
| `/:listid`                             | GET    | -              | [ShoppingList]                |
| `/:listid`                             | PUT    | [ShoppingList] | [ShoppingList]                |
| `/:listid/items`                       | GET    | -              | Array of [Item]               |
| `/:listid/items`                       | POST   | [Item]         | [Item]                        |
| `/:listid/items/:itemid`               | PUT    | [Item]         | [Item]                        |
| `/:listid/items/:itemid`               | DELETE | -              | -                             |
| `/:listid/completions`                 | GET    | -              | Array of [CompletionItem]     |
| `/:listid/completions/:completionname` | DELETE | -              | -                             |
| `/:listid/categories `                 | GET    | -              | Array of [CategoryDefinition] |
| `/:listid/changes`                     | GET    | -              | Array of [Change]             |
| `/:listid/categories `                 | PUT    | Array of [CategoryDefinition] | Array of [CategoryDefinition] |
| `/:listid/sync`                        | GET    | -              | [SyncedShoppingList]          |
| `/:listid/sync`                        | POST   | [SyncRequest]  | [SyncedShoppingList]          |

### GET  /:listid

Gets the list object.

### PUT  /:listid

Updates the list object, `id` in the body and `:listid` in the URL must be equal. Note `items` will be ignored and may be omitted, only the name can be set.

### GET   /:listid/items

Gets the current items of the list.

### POST  /:listid/items

Creates a new item, `id` must be omitted in body and will be assigned by the server. If you wish to create items with the `id` assigned by the client, use the PUT endpoint instead.

Clients may also send an item's [string representation](#string-representation).

On success, returns the newly created with status *201 Created*. The *Location* header will contain the URL of the new item.

### PUT   /:listid/items/:id

Creates or updates item, `id`  in body and `:id` in the URL must be equal.

Clients may also send an item's [string representation](#string-representation).

On success, may return status *200 Success* for successful update or *201 Created* for successful creation.

### DELETE /:listid/items/:id

Deletes item with id `:id`.

On success, returns *204 No Content*

### GET    /:listid/completions

Returns a list of frequently used items in descending order of use. The items contain `name` and optionally a `category`. This list is kept by the server and updated over time. Clients may use this list to implement completion when inserting new items.

### DELETE /:listid/completions/:completionname

Removes the completion with the given name. `completionname` is case insensitive and leading and trailing whitespace is removed.

On success, returns *204 No Content*

### GET    /:listid/categories

Gets the categories for the shopping list.

### PUT    /:listid/categories

Updates the categories for the shopping list.

### GET    /:listid/changes

Gets the list of changes of the shopping list, sorted from oldest to newest. Note that the server only retains a limited number of changes. 

By default, all changes are returned. To restrict the changes returned, GET parameters can be used:

| Field  | Type                   | Description                                                    |
|--------|------------------------|----------------------------------------------------------------|
| oldest | String, UUID-v4        | Id of oldest change to include in response<sup>[CH](#CH)</sup> |
| newest | String, UUID-v4        | Id of oldest change to include in response<sup>[CH](#CH)</sup> |

<a name="CH">CH</a>: If no change with the given id is found, the parameter is ignored.


### GET    /:listid/sync

Used for sync with offline-capable clients to get an initial state from which to sync.

### POST   /:listid/sync

Used for sync with offline-capable clients. This is __not__ a REST endpoint!

To use the sync endpoint the client should persistently store the response of the last sync and send it together with the current local state. The client state and the server state will then be merged to produce a new state, which is sent as response. Use the GET endpoint to obtain an initial sync state.

Note that in `currentState`, you may also send an item's [string representation](#string-representation) instead of the item.

## Change Notifications

Clients can connect to the server to receive notifications when a [ShoppingList] is updated. For this the server provides a WebSocket at `/:listid/socket`.

Whenever the list is touched on the server, its current token is pushed to the client. The client can compare it to the token of its previous sync to determine whether a sync is necessary.

Note: A touch indicates a server operation on the [ShoppingList], e.g. a PUT on an [Item] or a POST to `/:listid/sync`. The operation may have not changed the [ShoppingList] at all. However, every change is guaranteed to be a touch.

## Data Types

[ShoppingList]: #shoppinglist
[Item]: #item
[CompletionItem]: #completionitem
[Amount]: #amount
[CategoryDefinition]: #categorydefinition
[Change]: #change
[Diff]: #diff
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

An item has a canonical string representation. Clients are advised to use this representation when displaying items as strings. The string representation can be created as follows:

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

Instead of the object as specified above clients may also send the following object to have the server parse the string representation.

| Field                | Type            | Description                             |
|----------------------|-----------------|-----------------------------------------|
| id                   | String, UUID-v4 | Unique identifier of the item           |
| stringRepresentation | String          | String representation of the item       |

When having the server parse the string representation you may prepend the `shortName` of a [CategoryDefinition] in parentheses to assign that category to the item, e.g. `(M) 1 litre Milk` to assign the category with `shortName = M`.

If no category is present when parsing the string representation the server will try to assign a matching category from an internal list of recently used categories.

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

### Change

This object represents a change of the list by a user. A change is composes of one or more atomic [diffs](#Diff).

| Field     | Type                               | Description                                        |
|-----------|------------------------------------|----------------------------------------------------|
| id        | String, UUID-v4                    | Unique identifier of the change                    |
| date      | String, Date encoded as [ISO 8601] | Date the change was applied on the server          |
| diffs     | Array of [Diff]                    | Diffs included in the change                       |

[ISO 8601]: https://en.wikipedia.org/wiki/ISO_8601

### Diff

A diff represents a atomic change to a list. Diffs are differentiated by their `type` property. 

The followind types are defined:

| `type`        | Description                       |
|---------------|-----------------------------------|
| `ADD_ITEM`    | A new item was added to the list  |
| `DELETE_ITEM` | An item was removed from the list |
| `UPDATE_ITEM` | An item in the list was changed   |

Other fields of the Diff depend on the `type` property of the Diff.

| Field     | Type                          | Valid diff types             | Description                                        |
|-----------|-------------------------------|------------------------------|----------------------------------------------------|
| type      | String, one of the diff types | _all_                        | Type of the Diff                                   |
| oldItem   | [Item]                        | `DELETE_ITEM`, `UPDATE_ITEM` | Item before the diff was applied                   |
| item      | [Item]                        | `ADD_ITEM`, `UPDATE_ITEM`    | Item after the diff was applied                    |

Note that new diff types may be introduced in the future. Clients should ignore diffs of unknown type.

### SyncRequest

This object is sent by a client to the server when initiating sync.

| Field        | Type           | Description |
|--------------|----------------|-------------|
| previousSync | [SyncedShoppingList] | The object returned by the server on the previous sync request done by the client |
| currentState | [ShoppingList] | The current data as held by the client |

### SyncedShoppingList

This object is returned by the server after a finished sync. It is very similar to [ShoppingList] but contains a token for sync in addition.

| Field    | Type            | Description                                           |
|----------|-----------------|-------------------------------------------------------|
| id       | String          | Unique identifier of the shopping list                |
| title    | String          | Name of the shopping list                             |
| token    | String          | A token for synchronization                           |
| changeId | String, UUID-v4 | Id of the latest change included in the shopping list |
| items    | Array of [Item] | Items of the list                                     |

### Error

This object represents an error returned by the server.

| Field | Type   | Description                              |
|-------|--------|------------------------------------------|
| error | String | An string describing the error in detail |
