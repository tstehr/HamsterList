import { RecentlyUsedList, RECENTLY_USED_KEY, RESTORATION_ENABLED } from 'DB'
import LocalStorageDB from 'LocalStorageDB'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import globalStyles from './index.module.css'
import styles from './LocalStorageMigration.module.css'
import { useHistory } from 'react-router-dom'
import { persistedInitialState } from 'sync'

export default function LocalStorageMigration() {
  const [canMigrateLocalStorageTo, setCanMigrateLocalStorageTo] = useState<LocalStorageToMigrate>()

  const history = useHistory()
  const migrateLocalStorage = useCallback((db: LocalStorageDB, localStorageToMigrate: LocalStorageToMigrate) => {
    if (localStorageToMigrate.newLists) {
      db.set(RECENTLY_USED_KEY, localStorageToMigrate.newLists)
    }
    if (localStorageToMigrate.usernames) {
      for (const [id, username] of Object.entries(localStorageToMigrate.usernames)) {
        db.updateList({ ...persistedInitialState, id, username })
      }
    }
    if (localStorageToMigrate.restorationEnabled) {
      db.set(RESTORATION_ENABLED, true)
    }
    const returnUrl = new URL(window.location.href)
    returnUrl.search = localStorageToMigrate.newQuery.toString()
    const successUrl = new URL(localStorageToMigrate.successUrl)
    successUrl.searchParams.set('returnUrl', returnUrl.toString())
    window.location.href = successUrl.toString()
  }, [])

  const checkedForMigrationRef = useRef(false)
  useEffect(() => {
    if (checkedForMigrationRef.current) {
      return
    }
    checkedForMigrationRef.current = true

    const localStorageToMigrate = getLocalStorageToMigrate()
    if (!localStorageToMigrate) {
      return
    }

    const db = new LocalStorageDB()
    const oldLocalStorage: RecentlyUsedList[] | null = db.get(RECENTLY_USED_KEY)
    if (oldLocalStorage?.length) {
      setCanMigrateLocalStorageTo(localStorageToMigrate)
    } else {
      migrateLocalStorage(db, localStorageToMigrate)
    }
  }, [migrateLocalStorage])

  return canMigrateLocalStorageTo ? (
    <div className={styles.LocalStorageMigration}>
      <h3>HamsterList has moved to a new web address!</h3>
      <div className={styles.InfoLine}>
        <p>Do you want to migrate your data from the old location?</p>
        <span className={styles.Actions}>
          <button
            onClick={() => {
              history.replace({ search: canMigrateLocalStorageTo.newQuery.toString() })
              setCanMigrateLocalStorageTo(undefined)
            }}
            className={globalStyles.PaddedButton}
          >
            Keep current
          </button>{' '}
          <button
            onClick={() => {
              if (!canMigrateLocalStorageTo) {
                return
              }
              const db = new LocalStorageDB()
              migrateLocalStorage(db, canMigrateLocalStorageTo)
              setCanMigrateLocalStorageTo(undefined)
            }}
            className={globalStyles.PaddedButton}
          >
            Migrate
          </button>
        </span>
      </div>
    </div>
  ) : null
}

interface LocalStorageToMigrate {
  newLists: RecentlyUsedList[] | undefined
  usernames: Record<string, string> | undefined
  restorationEnabled: boolean
  successUrl: string
  newQuery: URLSearchParams
}

function getLocalStorageToMigrate(): LocalStorageToMigrate | undefined {
  const newQuery = new URLSearchParams(location.search)

  let newLists: RecentlyUsedList[] | undefined
  const recentlyUsedListsStr = newQuery.get('recentlyUsedListsJson')
  if (recentlyUsedListsStr) {
    try {
      newLists = JSON.parse(recentlyUsedListsStr) as RecentlyUsedList[]
    } catch (e) {
      newLists = undefined
    }
  }
  newQuery.delete('recentlyUsedListsJson')

  let usernames: Record<string, string> | undefined
  const usernamesStr = newQuery.get('usernamesJson')
  if (usernamesStr) {
    try {
      usernames = JSON.parse(usernamesStr) as Record<string, string>
    } catch (e) {
      usernames = undefined
    }
  }
  newQuery.delete('usernamesJson')

  const restorationEnabled = !!newQuery.get('restorationEnabled')
  newQuery.delete('restorationEnabled')

  const successUrl = newQuery.get('successUrl')
  newQuery.delete('successUrl')

  if (successUrl && (newLists !== undefined || usernames !== undefined || restorationEnabled)) {
    return { newLists, newQuery, usernames, successUrl, restorationEnabled }
  }

  return undefined
}
