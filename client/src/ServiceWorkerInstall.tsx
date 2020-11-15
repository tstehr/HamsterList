import _ from 'lodash'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import * as serviceWorkerRegistration from './serviceWorkerRegistration'

export default function ServiceWorkerInstall() {
  const [showReload, setShowReload] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  const registerServiceWorker = useCallback(() => {
    console.log('[ServiceWorkerInstall]', 'Register!')
    serviceWorkerRegistration.register({
      onUpdate: (registration: ServiceWorkerRegistration) => {
        setShowReload(true)
        setWaitingWorker(registration.waiting)
      },
    })
  }, [])

  const debouncedRegister = useMemo(
    () =>
      _.debounce(registerServiceWorker, 5 * 60_000, {
        leading: true,
        trailing: true,
      }),
    [registerServiceWorker]
  )

  useEffect(() => {
    registerServiceWorker()
  }, [registerServiceWorker])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        debouncedRegister()
      }
    }

    window.addEventListener('visibilitychange', handleVisibilityChange)
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [debouncedRegister])

  const reloadPage = () => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' })
    setShowReload(false)
    window.location.reload(true)
  }

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
