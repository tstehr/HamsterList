import { RecentlyUsedList, RECENTLY_USED_KEY } from 'DB'
import LocalStorageDB from 'LocalStorageDB'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import globalStyles from './index.module.css'
import styles from './RecentlyUsedListsMigration.module.css'
import { useHistory } from 'react-router-dom'

export default function RecentlyUsedListsMigration() {
  const [canMigrateRecentlyUsedListsTo, setCanMigrateRecentlyUsedListsTo] = useState<RecentlyUsedListsToMigrate>()

  const history = useHistory()
  const migrateRecentlyUsedLists = useCallback(
    (db: LocalStorageDB, recentlyUsedListsToMigrate: RecentlyUsedListsToMigrate) => {
      db.set(RECENTLY_USED_KEY, recentlyUsedListsToMigrate.newLists)
      history.replace({ search: recentlyUsedListsToMigrate.newQuery.toString() })
    },
    [history],
  )

  const checkedForMigrationRef = useRef(false)
  useEffect(() => {
    if (checkedForMigrationRef.current) {
      return
    }
    checkedForMigrationRef.current = true

    const recentlyUsedListsToMigrate = getRecentlyUsedListsToMigrate()
    if (!recentlyUsedListsToMigrate) {
      return
    }

    const db = new LocalStorageDB()
    const oldRecentlyUsedLists: RecentlyUsedList[] | null = db.get(RECENTLY_USED_KEY)
    if (oldRecentlyUsedLists?.length) {
      setCanMigrateRecentlyUsedListsTo(recentlyUsedListsToMigrate)
    } else {
      migrateRecentlyUsedLists(db, recentlyUsedListsToMigrate)
    }
  }, [migrateRecentlyUsedLists])

  return canMigrateRecentlyUsedListsTo ? (
    <div className={styles.RecentlyUsedListsMigration}>
      <h3>HamsterList has moved to a new web address!</h3>
      <div className={styles.InfoLine}>
        <p>Do you want to migrate your recently used lists from the old location?</p>
        <span className={styles.Actions}>
          <button
            onClick={() => {
              history.replace({ search: canMigrateRecentlyUsedListsTo.newQuery.toString() })
              setCanMigrateRecentlyUsedListsTo(undefined)
            }}
            className={globalStyles.PaddedButton}
          >
            Keep current
          </button>{' '}
          <button
            onClick={() => {
              if (!canMigrateRecentlyUsedListsTo) {
                return
              }
              const db = new LocalStorageDB()
              migrateRecentlyUsedLists(db, canMigrateRecentlyUsedListsTo)
              setCanMigrateRecentlyUsedListsTo(undefined)
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

interface RecentlyUsedListsToMigrate {
  newLists: RecentlyUsedList[]
  newQuery: URLSearchParams
}

function getRecentlyUsedListsToMigrate(): RecentlyUsedListsToMigrate | undefined {
  const newQuery = new URLSearchParams(location.search)
  const recentlyUsedListsJson = newQuery.get('recentlyUsedListsJson')
  if (!recentlyUsedListsJson) {
    return
  }

  let newLists: RecentlyUsedList[]
  try {
    newLists = JSON.parse(recentlyUsedListsJson) as RecentlyUsedList[]
  } catch (e) {
    return
  }
  newQuery.delete('recentlyUsedListsJson')
  return { newLists, newQuery }
}
