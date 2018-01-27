// @flow
import { type Item, createItem, mergeItems } from './Item'

export type Order = {
  groups: $ReadOnlyArray<{
    name: string,
    expressions: $ReadOnlyArray<string>
  }>,
  groupOrder: $ReadOnlyArray<number>
}

export type Sorting = "unsorted" | "alphabetical" | Order;

type ShoppingList<S: Sorting = "unsorted"> = {
  +id: string,
  +title: string,
  +items: $ReadOnlyArray<Item>,
  [any]: empty
}

const s: Sorting = {
  groups: [
      {
      name: "Obst/Gemüse",
      expressions: [
        "Tomaten"
      ]
    }
  ],
  groupOrder: [0, -1]
}

function sort<S: Sorting>(list: ShoppingList<>, sorting: S): ShoppingList<S> {
  return {
    id: "",
    title: "",
    items: []
  }
}
