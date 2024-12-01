import { Location } from 'history'
import _ from 'lodash'
import { useCallback, useEffect, useRef } from 'react'
import { useHistory } from 'react-router-dom'

export type Up = (levels: number | 'home' | 'list') => void

interface Props {
  render: (up: Up) => JSX.Element
}

interface NavigationStackEntry {
  readonly path: string
  readonly key: string | undefined | null
}

export default function HistoryTracker(props: Props) {
  const history = useHistory()

  const navigationStackRef = useRef<NavigationStackEntry[]>([createNavigationStackEntry(history.location)])
  const navigationStackIndexRef = useRef<number>(0)

  const historyListener = useCallback((location: Location, action: string): void => {
    switch (action) {
      case 'PUSH': {
        navigationStackIndexRef.current++
        navigationStackRef.current.splice(navigationStackIndexRef.current, Infinity, createNavigationStackEntry(location))
        break
      }
      case 'POP': {
        const stackEntry = createNavigationStackEntry(location)
        const keyIndex = _.findIndex(navigationStackRef.current, (entry) => _.isEqual(entry, stackEntry))

        if (keyIndex === -1) {
          navigationStackRef.current.splice(navigationStackIndexRef.current - 2, Infinity, stackEntry)
        } else {
          navigationStackIndexRef.current = keyIndex
        }

        break
      }
      case 'REPLACE': {
        navigationStackRef.current.splice(navigationStackIndexRef.current, 1, createNavigationStackEntry(location))
        break
      }
      default: {
        console.warn(`Unkonwn navigation action: ${action}`)
      }
    }
  }, [])

  useEffect(() => {
    const unlisten = history.listen(historyListener)
    return () => unlisten()
  }, [history, historyListener])

  const navigateBackTo = useCallback(
    (pathname: string) => {
      const idx = _.findLastIndex(navigationStackRef.current, (entry) => entry.path === pathname, navigationStackIndexRef.current)

      if (idx === -1) {
        history.push(pathname)
      } else {
        const stepsBack = navigationStackIndexRef.current - idx

        if (stepsBack > 0) {
          history.go(-stepsBack)
        }
      }
    },
    [history],
  )

  const up = useCallback(
    (levels: number | 'home' | 'list') => {
      if (levels === 'home') {
        navigateBackTo('')
      } else if (levels === 'list') {
        const currentStackEntryParts = navigationStackRef.current[navigationStackIndexRef.current].path.split('/')
        if (currentStackEntryParts.length > 1) {
          const listid = currentStackEntryParts[1]
          navigateBackTo('/' + listid)
        }
      } else {
        const splitPath = navigationStackRef.current[navigationStackIndexRef.current].path.split('/')
        const newPath = splitPath.slice(0, splitPath.length - levels).join('/')
        navigateBackTo(newPath)
      }
    },
    [navigateBackTo],
  )

  useEffect(() => {
    const escapeListener = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && !e.defaultPrevented) {
        up('list')
      }
    }

    window.addEventListener('keydown', escapeListener)
    return () => window.removeEventListener('keydown', escapeListener)
  })

  return props.render(up)
}

function createNavigationStackEntry(location: Location): NavigationStackEntry {
  return Object.freeze({
    path: `${removeTrailingSlash(location.pathname)}`,
    key: location.key,
  })
}

function removeTrailingSlash(pathname: string): string {
  if (pathname.endsWith('/')) {
    return pathname.substring(0, pathname.length - 1)
  }
  return pathname
}
