import DB, { getRecentlyUsedLists, Key, RecentlyUsedList, RECENTLY_USED_KEY } from 'db'
import _ from 'lodash'
import React, { useCallback, useEffect, useState } from 'react'
import {
  CategoryDefinition,
  CompletionItem,
  Item,
  mergeCategoryLists,
  Order,
  transformItemsToCategories,
  transformOrderToCategories,
} from 'shoppinglist-shared'
import { AddCompletion, CreateItem, DeleteCompletion, DeleteItem, UpdateCategories, UpdateOrders } from 'sync'
import useSync from 'useSync'

interface Props {
  listid: string
  items: readonly Item[]
  completions: readonly CompletionItem[]
  categories: readonly CategoryDefinition[]
  orders: readonly Order[]
  createItem: CreateItem
  deleteItem: DeleteItem
  updateCategories: UpdateCategories
  updateOrders: UpdateOrders
  deleteCompletion: DeleteCompletion
  addCompletion: AddCompletion
}

export default function ImportComponent(props: Props) {
  const [sourceListid, setSourceListid] = useState<string>()

  return (
    <>
      {sourceListid === undefined ? (
        <ChooseList setSourceListid={setSourceListid} listid={props.listid} />
      ) : (
        <ImportFromList {...props} sourceListid={sourceListid} cancel={() => setSourceListid(undefined)} />
      )}
    </>
  )
}

function ChooseList({
  setSourceListid: setListid,
  listid,
}: {
  setSourceListid: (listid: string | undefined) => void
  listid: string
}) {
  const [inputListid, setinputListid] = useState<string>()
  const recentlyUsedLists = useRecentlyUsedLists()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setListid(inputListid)
      }}
    >
      <h2>Choose List</h2>
      <input type="text" onChange={(e) => setinputListid(e.currentTarget.value.trim())} list="recentlyUsedLists" />
      <datalist id="recentlyUsedLists">
        {recentlyUsedLists
          .filter((ru) => ru.id !== listid)
          .map((ru) => (
            <option value={ru.id} key={ru.id}>
              {ru.title ?? ru.id}
            </option>
          ))}
      </datalist>
      <button type="submit">Load</button>
    </form>
  )
}

function ImportFromList({
  items,
  completions,
  categories,
  orders,
  createItem,
  deleteItem,
  updateCategories,
  updateOrders,
  deleteCompletion,
  addCompletion,
  sourceListid,
  cancel,
}: { sourceListid: string; cancel: () => void } & Props) {
  const [state] = useSync(sourceListid)

  const [replace, setReplace] = useState(false)
  const [importCategories, setImportCategories] = useState(true)
  const [importCompletions, setImportCompletions] = useState(true)
  const [importOrders, setImportOrders] = useState<string[]>()
  const [importItems, setImportItems] = useState(true)

  useEffect(() => {
    if (importOrders === undefined && state?.loaded) {
      setImportOrders(state.orders.map((o) => o.id))
    }
  }, [importOrders, state])

  const performImport = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!state) {
        return
      }
      // eslint-disable-next-line no-restricted-globals
      if (replace && !confirm("This will delete the list's existing content, continue?")) {
        return
      }

      let newCategories = categories
      if (importCategories) {
        newCategories = mergeCategoryLists(categories, state.categories, { preferBase: false, dropUnmatched: replace })
        updateCategories(newCategories)
      }

      if (importOrders?.length) {
        const ordersToAdd = state.orders
          .filter((o) => importOrders.includes(o.id))
          .map((o) => transformOrderToCategories(o, state.categories, newCategories))
        const newOrders = replace ? ordersToAdd : [...orders, ...ordersToAdd]
        updateOrders(newOrders)
      }

      if (importCompletions) {
        const completionsToDelete = replace ? completions.map((c) => c.name) : []
        const completionsToAdd = transformItemsToCategories(state.completions, state.categories, newCategories)
        completionsToDelete.forEach((n) => deleteCompletion(n))
        completionsToAdd.forEach((c) => addCompletion(c))
      }

      if (importItems) {
        const itemsToAdd = transformItemsToCategories(state.items, state.categories, newCategories)
        if (replace) {
          items.forEach((i) => deleteItem(i.id))
        }
        itemsToAdd.forEach((i) => createItem(i))
      }
    },
    [
      addCompletion,
      categories,
      completions,
      createItem,
      deleteCompletion,
      deleteItem,
      importCategories,
      importCompletions,
      importItems,
      importOrders,
      items,
      orders,
      replace,
      state,
      updateCategories,
      updateOrders,
    ]
  )

  return (
    <form onSubmit={performImport}>
      {!state?.loaded ? (
        'loading'
      ) : (
        <>
          <h2>Importing from {state.title}</h2>
          <p>
            <label>
              <input type="checkbox" onChange={() => setReplace(!replace)} checked={replace} /> Replace
            </label>
          </p>
          <p>
            <label>
              <input type="checkbox" onChange={() => setImportCategories(!importCategories)} checked={importCategories} />{' '}
              Categories
            </label>
          </p>
          <p>
            <label>
              <input type="checkbox" onChange={() => setImportCompletions(!importCompletions)} checked={importCompletions} />{' '}
              Category Assignments
            </label>
          </p>
          <p>
            <select
              value={importOrders}
              multiple={true}
              onChange={(e) => {
                setImportOrders(Array.from(e.currentTarget.selectedOptions).map((o) => o.value))
              }}
            >
              {state.orders.map((o) => (
                <option value={o.id} key={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </p>
          <p>
            <label>
              <input type="checkbox" onChange={() => setImportItems(!importItems)} checked={importItems} /> Items
            </label>
          </p>
        </>
      )}
      <button type="submit">Import</button>
      <button type="button" onClick={cancel}>
        Cancel
      </button>
    </form>
  )
}

function useRecentlyUsedLists() {
  const [recentlyUsedLists, setRecentlyUsedLists] = useState<readonly RecentlyUsedList[]>([])
  useEffect(() => {
    const db = new DB()

    const unsubscribe = db.on('change', ({ key }: { key: Key }) => {
      if (_.isEqual(key, RECENTLY_USED_KEY)) {
        setRecentlyUsedLists(getRecentlyUsedLists(db))
      }
    })

    setRecentlyUsedLists(getRecentlyUsedLists(db))

    return unsubscribe
  }, [])

  return recentlyUsedLists
}
