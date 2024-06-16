import { useEffect, useState } from 'react'
import SyncingCore, { ClientShoppingList } from 'sync'

export default function useSync(listid: string): [ClientShoppingList | undefined, SyncingCore | undefined] {
  const [state, setState] = useState<ClientShoppingList>()
  const [sync, setSync] = useState<SyncingCore>()

  useEffect(() => {
    const sync = new SyncingCore(listid, import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}` : null)
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

  return [state, sync]
}
