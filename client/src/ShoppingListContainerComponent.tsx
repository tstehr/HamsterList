import { RECENTLY_USED_KEY, RecentlyUsedList } from 'DB'
import { Up } from 'HistoryTracker'
import Loading from 'Loading'
import LocalStorageDB from 'LocalStorageDB'
import React, { useCallback, useEffect } from 'react'
import { generatePath, match, useHistory } from 'react-router-dom'
import ShoppingListComponent from 'ShoppingListComponent'
import useSync from 'useSync'

interface Props {
  listid: string
  match: match<Record<string, string>>
  up: Up
}

export default function ShoppingListContainerComponent({ listid, match, up }: Props) {
  const [state, sync] = useSync(listid)

  const history = useHistory()
  const updateListid = useCallback(
    (newListid: string) => {
      // update listid in recently used
      const db = new LocalStorageDB()
      const recentlyUsedLists = db.get<RecentlyUsedList[]>(RECENTLY_USED_KEY)
      if (recentlyUsedLists) {
        db.set(
          RECENTLY_USED_KEY,
          recentlyUsedLists.map((rul) => (rul.id === listid ? { ...rul, id: newListid } : rul)),
        )
      }

      // redirect to new path
      const newParams = { ...match.params, listid: newListid }
      const newPath = generatePath(match.path, newParams)
      history.replace(newPath)
    },
    [history, listid, match.params, match.path],
  )

  useEffect(() => {
    if (state && state.id && listid !== state.id) {
      updateListid(state.id)
    }
  }, [listid, state, updateListid])

  return (
    <div>
      {state?.loaded && sync ? (
        <ShoppingListComponent
          shoppingList={sync.getShoppingList(state)}
          completions={state.completions}
          categories={state.categories}
          orders={state.orders}
          changes={state.changes}
          selectedOrder={state.selectedOrder}
          username={state.username}
          unsyncedChanges={state.unsyncedChanges}
          connectionState={state.connectionState}
          syncing={state.syncing}
          lastSyncFailed={state.lastSyncFailed}
          dirty={state.dirty}
          updateListTitle={sync.updateListTitle.bind(sync)}
          createItem={sync.createItem.bind(sync)}
          updateItem={sync.updateItem.bind(sync)}
          deleteItem={sync.deleteItem.bind(sync)}
          updateCategories={sync.updateCategories.bind(sync)}
          selectOrder={sync.selectOrder.bind(sync)}
          updateOrders={sync.updateOrders.bind(sync)}
          setUsername={sync.setUsername.bind(sync)}
          applyDiff={sync.applyDiff.bind(sync)}
          createApplicableDiff={sync.createApplicableDiff.bind(sync)}
          deleteCompletion={sync.deleteCompletion.bind(sync)}
          addCompletion={sync.addCompletion.bind(sync)}
          modifyCompletions={sync.modifyCompletions.bind(sync)}
          manualSync={sync.initiateSyncConnection.bind(sync)}
          removeListFromDB={sync.removeListFromDB.bind(sync)}
          performTransaction={sync.performTransaction.bind(sync)}
          up={up}
        />
      ) : (
        <Loading />
      )}
    </div>
  )
}
