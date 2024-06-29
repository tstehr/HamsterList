import React, { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import globalStyles from './index.module.css'
import styles from './ServiceWorkerInstall.module.css'

const intervalMS = 60 * 60 * 1000

export default function ServiceWorkerInstall() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('[SW]', 'Registered: ', r)
      if (r) {
        setInterval(() => {
          console.log('[SW]', 'Updating')
          r.update().catch(console.error)
        }, intervalMS)
      }
    },
    onRegisterError(error) {
      console.error('[SW]', 'Registration error', error)
    },
  })

  const countdown = useOfflineReadyCloseCountdown({ offlineReady, setOfflineReady })

  return needRefresh ? (
    <div className={styles.ServiceWorkerInstall}>
      <h3>Update available</h3>
      <div>
        <button onClick={() => setNeedRefresh(false)} className={globalStyles.PaddedButton}>
          Ignore
        </button>
        <button
          onClick={() => {
            updateServiceWorker(true).catch(console.error)
          }}
          className={globalStyles.PaddedButton}
        >
          Update
        </button>
      </div>
    </div>
  ) : offlineReady ? (
    <div className={styles.ServiceWorkerInstall}>
      <h3>You can now work offline</h3>
      <div>
        <button onClick={() => setOfflineReady(false)} className={globalStyles.PaddedButton}>
          OK {countdown && <span className={styles.Countdown}>({countdown})</span>}
        </button>
      </div>
    </div>
  ) : null
}

function useOfflineReadyCloseCountdown({
  offlineReady,
  setOfflineReady,
}: {
  offlineReady: boolean
  setOfflineReady: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const countdownIntervalRef = useRef<number>()
  const [countdown, setCountdown] = useState<number>()
  useEffect(() => {
    if (!offlineReady) {
      clearInterval(countdownIntervalRef.current)
      setCountdown(undefined)
      return
    }
    if (!countdownIntervalRef.current) {
      let cd = 10
      setCountdown(cd)
      countdownIntervalRef.current = window.setInterval(() => {
        cd -= 1
        if (cd === 0) {
          setOfflineReady(false)
          clearInterval(countdownIntervalRef.current)
          setCountdown(undefined)
        } else {
          setCountdown(cd)
        }
      }, 1000)
    }
  }, [offlineReady, setOfflineReady])

  return countdown
}
