import { Up } from 'HistoryTracker'
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
      const newParams = { ...match.params, listid: newListid }
      const newPath = generatePath(match.path, newParams)
      history.replace(newPath)
    },
    [history, match.params, match.path]
  )

  useEffect(() => {
    if (state && listid !== state.id) {
      updateListid(state.id)
    }
  }, [listid, state, updateListid])

  return (
    <div>
      {state?.loaded && sync && (
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
      )}
    </div>
  )
}
