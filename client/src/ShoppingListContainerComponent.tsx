import { Up } from 'HistoryTracker'
import React, { useEffect, useState } from 'react'
import ShoppingListComponent from 'ShoppingListComponent'
import SyncingCore, { ClientShoppingList } from 'sync'

interface Props {
  listid: string
  up: Up
}

export default function ShoppingListContainerComponent({ listid, up }: Props) {
  const [state, setState] = useState<ClientShoppingList>()
  const [sync, setSync] = useState<SyncingCore>()
  useEffect(() => {
    const sync = new SyncingCore(listid)
    function handleChange({ clientShoppingList }: { clientShoppingList: ClientShoppingList }) {
      setState(clientShoppingList)
    }
    setSync(sync)
    sync.init()
    sync.on('change', handleChange)
    return () => {
      sync.off('change', handleChange)
      sync.close()
    }
  }, [listid])

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
          manualSync={sync.initiateSyncConnection.bind(sync)}
          clearLocalStorage={sync.clearLocalStorage.bind(sync)}
          up={up}
        />
      )}
    </div>
  )
}
