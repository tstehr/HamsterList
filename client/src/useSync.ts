import { useEffect, useState } from 'react'
import SyncingCore, { ClientShoppingList } from 'sync'

export default function useSync(listid: string): [ClientShoppingList | undefined, SyncingCore | undefined] {
  const [state, setState] = useState<ClientShoppingList>()
  const [sync, setSync] = useState<SyncingCore>()

  useEffect(() => {
    function handleChange({ clientShoppingList }: { clientShoppingList: ClientShoppingList }) {
      setState(clientShoppingList)
    }

    if (sync?.getListid() === listid) {
      sync.init()
      sync.on('change', handleChange)
      return
    }

    const newSync = new SyncingCore(listid, import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}` : null)
    setSync(newSync)
    newSync.init()
    newSync.on('change', handleChange)
    return () => {
      newSync.off('change', handleChange)
      newSync.close()
    }
  }, [listid])

  return [state, sync]
}
