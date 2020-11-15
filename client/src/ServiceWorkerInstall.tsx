import _ from 'lodash'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import './ServiceWorkerInstall.css'
import * as serviceWorkerRegistration from './serviceWorkerRegistration'

export default function ServiceWorkerInstall() {
  const [showReload, setShowReload] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    serviceWorkerRegistration.register({
      onUpdate: (registration: ServiceWorkerRegistration) => {
        setShowReload(true)
        setWaitingWorker(registration.waiting)
      },
    })
  }, [])

  const reloadPage = () => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' })
    setShowReload(false)
    window.location.reload(true)
  }

  useCheckForUpdateOnVisible()

  return showReload ? (
    <div className="ServiceWorkerInstall">
      <h3>Update available</h3>
      <div>
        <button onClick={() => setShowReload(false)} className="PaddedButton">
          Ignore
        </button>
        <button onClick={reloadPage} className="PaddedButton">
          Update
        </button>
      </div>
    </div>
  ) : null
}

function useCheckForUpdateOnVisible() {
  const checkForUpdate = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      await registration.update()
    } catch (error) {
      console.error(error.message)
    }
  }, [])

  // only check for updates once every 5 minutes
  const debouncedCheckForUpdate = useMemo(
    () =>
      _.debounce(checkForUpdate, 5 * 60_000, {
        leading: true,
        trailing: true,
      }),
    [checkForUpdate]
  )

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        debouncedCheckForUpdate().catch((err) => console.error(err))
      }
    }

    window.addEventListener('visibilitychange', handleVisibilityChange)
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [debouncedCheckForUpdate])
}
