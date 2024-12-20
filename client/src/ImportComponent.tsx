import classNames from 'classnames'
import { getRecentlyUsedLists, Key, RecentlyUsedList, RECENTLY_USED_KEY } from 'DB'
import LocalStorageDB from 'LocalStorageDB'
import _ from 'lodash'
import React, { useCallback, useEffect, useState } from 'react'
import {
  CategoryDefinition,
  CompletionItem,
  createRandomUUID,
  Item,
  mergeCategoryLists,
  Order,
  transformItemsToCategories,
  transformOrderToCategories,
} from 'hamsterlist-shared'
import { CreateItem, DeleteItem, ModifyCompletions, UpdateCategories, UpdateOrders } from 'sync'
import useSync from 'useSync'
import styles from './ImportComponent.module.css'
import globalStyles from './index.module.css'

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
  modifyCompletions: ModifyCompletions
  close: () => void
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
      <button type="submit" className={globalStyles.PaddedButton}>
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
  modifyCompletions,
  sourceListid,
  cancel,
  close,
}: { sourceListid: string; cancel: () => void } & Props) {
  const [state] = useSync(sourceListid)

  const [replace, setReplace] = useState(false)
  const [importCategories, setImportCategories] = useState(false)
  const [importCompletions, setImportCompletions] = useState(false)
  const [importOrders, setImportOrders] = useState<string[]>([])
  const [importItems, setImportItems] = useState(false)

  const [inProgress, setInProgress] = useState(false)

  const performImport = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!state) {
        return
      }

      if (replace && !confirm("This will delete the list's existing content, continue?")) {
        return
      }

      setInProgress(true)

      setTimeout(() => {
        let newCategories = categories
        if (importCategories) {
          newCategories = mergeCategoryLists(categories, state.categories, { dropUnmatched: replace })
          updateCategories(newCategories)
        }

        if (importOrders.length) {
          const ordersToAdd = state.orders
            .filter((o) => importOrders.includes(o.id))
            .map((o) => transformOrderToCategories(o, state.categories, newCategories))
            // replace ids to prevent duplicating ids on repeated import
            .map((o) => ({ ...o, id: createRandomUUID() }))
          const newOrders = replace ? ordersToAdd : [...orders, ...ordersToAdd]
          updateOrders(newOrders)
        }

        if (importCompletions) {
          const completionsToDelete = replace ? completions.map((c) => c.name) : []
          const completionsToAdd = transformItemsToCategories(state.completions, state.categories, newCategories)
          modifyCompletions(completionsToDelete, completionsToAdd)
        }

        if (importItems) {
          const itemsToAdd = transformItemsToCategories(state.items, state.categories, newCategories)
          if (replace) {
            items.forEach((i) => deleteItem(i.id))
          }
          itemsToAdd.forEach((i) => createItem(i))
        }

        close()
      }, 0)
    },
    [
      categories,
      close,
      completions,
      createItem,
      deleteItem,
      importCategories,
      importCompletions,
      importItems,
      importOrders,
      items,
      modifyCompletions,
      orders,
      replace,
      state,
      updateCategories,
      updateOrders,
    ],
  )

  return (
    <form onSubmit={performImport}>
      <h2>Importing {!!state?.title && `from ${state.title}`}</h2>
      {!state?.loaded ? (
        <p className={styles.FormRow}>loading…</p>
      ) : inProgress ? (
        <p className={styles.FormRow}>importing, please wait…</p>
      ) : (
        <>
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
      <button type="submit" className={globalStyles.PaddedButton}>
        Import
      </button>
      <button type="button" onClick={cancel} className={globalStyles.PaddedButton}>
        Cancel
      </button>
    </form>
  )
}

function useRecentlyUsedLists() {
  const [recentlyUsedLists, setRecentlyUsedLists] = useState<readonly RecentlyUsedList[]>([])
  useEffect(() => {
    const db = new LocalStorageDB()

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
