// @flow
import _ from 'lodash'
import { Component } from 'react'
import { type RouterHistory, type Location, withRouter } from 'react-router-dom'


export type Up = (levels: number | 'home' | 'list') => void

type Props = {
  render: (up: Up) => React$Node,
  history: RouterHistory
}

type NavigationStackEntry = {
  path: string,
  key: ?string
}

class UnboundHistoryTracker extends Component<Props> {
  unlisten: (() => void) | void
  navigationStack: NavigationStackEntry[]
  navigationStackIndex: number

  historyListener = (location: Location, action) => {
    switch(action) {
      case "PUSH":
        this.navigationStackIndex++
        this.navigationStack.splice(this.navigationStackIndex, Infinity, this.createNavigationStackEntry(location))
        break
      case "POP":
        const stackEntry = this.createNavigationStackEntry(location)
        const keyIndex = _.findIndex(this.navigationStack, (entry) => _.isEqual(entry, stackEntry))
        if (keyIndex === -1) {
          this.navigationStack.splice(this.navigationStackIndex-2, Infinity, stackEntry)
        } else {
          this.navigationStackIndex = keyIndex
        }
        break
      case "REPLACE":
        this.navigationStack.splice(this.navigationStackIndex, 1, this.createNavigationStackEntry(location))
        break
      default:
        console.warn(`Unkonwn navigation action: ${action}`)
    }
  }

  up = (levels: number | 'home' | 'list') => {
    if (levels === 'home') {
      this.navigateBackTo('')
    } else if (levels === 'list') {
      const listid = this.navigationStack[this.navigationStackIndex].path.split('/')[1]
      this.navigateBackTo('/' + listid)
    } else {
      const splitPath = this.navigationStack[this.navigationStackIndex].path.split('/')
      const newPath = splitPath.slice(0, splitPath.length - levels).join('/')
      this.navigateBackTo(newPath)
    }
  }

  escapeListener = e => {
    if (e.code === 'Escape' && !e.defaultPrevented) {
      this.up('list')
    }
  }

  componentDidMount() {
    this.navigationStack = [this.createNavigationStackEntry(this.props.history.location)]
    this.navigationStackIndex = 0

    this.setupHistoryListener()

    window.addEventListener('keydown', this.escapeListener)
  }

  componentWillUnmount() {
    if (this.unlisten) {
      this.unlisten()
    }
    window.removeEventListener('keydown', this.escapeListener)
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.history !== this.props.history) {
        this.setupHistoryListener()
    }
  }

  setupHistoryListener() {
    if (this.unlisten) {
      this.unlisten()
    }
    this.unlisten = this.props.history.listen(this.historyListener)
  }

  createNavigationStackEntry(location: Location): NavigationStackEntry {
    return Object.freeze({
      path: `${this.removeTrailingSlash(location.pathname)}`,
      key: location.key
    })
  }

  removeTrailingSlash(pathname: string) {
    if (pathname.endsWith('/')) {
      return pathname.substr(0, pathname.length - 1)
    }
    return pathname
  }

  navigateBackTo(pathname: string) {
    const idx = _.findLastIndex(this.navigationStack, (entry) => entry.path === pathname, this.navigationStackIndex)

    if (idx === -1) {
      this.props.history.push(pathname)
    } else {
      const stepsBack = this.navigationStackIndex - idx
      if (stepsBack > 0) {
        this.props.history.go(-stepsBack)
      }
    }
  }

  render() {
    return this.props.render(this.up)
  }
}

const HistoryTracker = withRouter(UnboundHistoryTracker)
export default HistoryTracker
