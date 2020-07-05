import classNames from 'classnames'
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
import styles from './ImportComponent.module.css'

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
    <div className={styles.ImportComponent}>
      {sourceListid === undefined ? (
        <ChooseList setSourceListid={setSourceListid} listid={props.listid} />
      ) : (
        <ImportFromList {...props} sourceListid={sourceListid} cancel={() => setSourceListid(undefined)} />
      )}
    </div>
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
      <button type="submit" className="PaddedButton">
        Load
      </button>
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
  const [importCategories, setImportCategories] = useState(false)
  const [importCompletions, setImportCompletions] = useState(false)
  const [importOrders, setImportOrders] = useState<string[]>([])
  const [importItems, setImportItems] = useState(false)

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
        newCategories = mergeCategoryLists(categories, state.categories, { dropUnmatched: replace })
        updateCategories(newCategories)
      }

      if (importOrders.length) {
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
          <label className={styles.FormRow}>
            <strong>Replace</strong>
            <input type="checkbox" onChange={() => setReplace(!replace)} checked={replace} />
          </label>
          <label className={styles.FormRow}>
            <strong>Categories</strong>
            <input type="checkbox" onChange={() => setImportCategories(!importCategories)} checked={importCategories} />{' '}
          </label>
          <label className={styles.FormRow}>
            <strong>Category Assignments</strong>
            <input type="checkbox" onChange={() => setImportCompletions(!importCompletions)} checked={importCompletions} />{' '}
          </label>
          {!state.orders.length ? (
            <p className={styles.FormRow}>
              <strong>Orders:</strong>
              <em>No orders to imports</em>
            </p>
          ) : (
            <p className={classNames(styles.FormRow, styles.orders)}>
              <strong>Orders:</strong>
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
          )}
          <label className={styles.FormRow}>
            <strong>Items</strong>
            <input type="checkbox" onChange={() => setImportItems(!importItems)} checked={importItems} />
          </label>
        </>
      )}
      <button type="submit" className="PaddedButton">
        Import
      </button>
      <button type="button" onClick={cancel} className="PaddedButton">
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
