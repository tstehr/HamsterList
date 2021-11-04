import { Up } from 'HistoryTracker'
import React from 'react'
import ShoppingListComponent from 'ShoppingListComponent'
import useSync from 'useSync'

interface Props {
  listid: string
  up: Up
}

export default function ShoppingListContainerComponent({ listid, up }: Props) {
  const [state, sync] = useSync(listid)

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
