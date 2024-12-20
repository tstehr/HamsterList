import classNames from 'classnames'
import Frame from 'Frame'
import IconButton from 'IconButton'
import { KEY_FOCUS_COMPONENT_NO_FOCUS } from 'KeyFocusComponent'
import _ from 'lodash'
import React, { Component } from 'react'
import FlipMove from 'react-flip-move'
import { Link, Redirect } from 'react-router-dom'
import { createRandomUUID, createShoppingList } from 'hamsterlist-shared'
import styles from './ChooseListComponent.module.css'
import DB, { getRecentlyUsedLists, Key, RecentlyUsedList, RECENTLY_USED_KEY, RESTORATION_ENABLED } from './DB'
import globalStyles from './index.module.css'
import LocalStorageDB from './LocalStorageDB'
import TopBarComponent from './TopBarComponent'
import { responseToJSON } from './utils'

interface State {
  listid: string | undefined | null
  recentlyUsedLists: readonly RecentlyUsedList[]
  restorationEnabled: boolean
}

export default class ChooseListComponent extends Component<{}, State> {
  db: DB
  inputListid: {
    current: null | HTMLInputElement
  }

  constructor(props: {}) {
    super(props)
    this.db = new LocalStorageDB()
    this.state = {
      listid: null,
      recentlyUsedLists: getRecentlyUsedLists(this.db),
      restorationEnabled: this.db.get<boolean>(RESTORATION_ENABLED) ?? false,
    }
    this.inputListid = React.createRef()
  }

  componentDidMount(): void {
    if (this.inputListid.current) {
      this.inputListid.current.focus()
    }

    this.db.on('change', this.handleStorage)
  }

  componentWillUnmount(): void {
    this.db.off('change', this.handleStorage)
  }

  handleStorage = ({ key }: { key: Key }): void => {
    if (_.isEqual(key, RECENTLY_USED_KEY)) {
      this.setState({
        recentlyUsedLists: getRecentlyUsedLists(this.db),
      })
    } else if (_.isEqual(key, RESTORATION_ENABLED)) {
      this.setState({
        restorationEnabled: this.db.get(RESTORATION_ENABLED) ?? false,
      })
    }
  }

  onSubmit = (e: React.SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault()
    if (this.inputListid.current == null) {
      return
    }
    const listidInputValue = this.inputListid.current.value.trim()
    const href = window.location.href
    const listid = listidInputValue.startsWith(href) ? listidInputValue.substring(href.length) : listidInputValue
    this.setState({ listid })
  }

  onRestorationEnabledChange = (e: React.SyntheticEvent<HTMLInputElement>): void => {
    const restorationEnabled = e.currentTarget.checked
    this.db.set(RESTORATION_ENABLED, restorationEnabled)
    this.setState({
      restorationEnabled,
    })
  }

  async createRandomList(): Promise<void> {
    const listid = createRandomUUID()
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL ?? ''}/api/${listid}/`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'PUT',
      body: JSON.stringify({
        id: listid,
        title: `New List (${new Date().toLocaleString()})`,
      }),
    })
    const json = await responseToJSON(response)
    const shoppingList = createShoppingList(json)
    this.setState({
      listid: shoppingList.id,
    })
  }

  removeRecentlyUsedList(listid: string) {
    const recentlyUsedLists = this.db.get<RecentlyUsedList[]>(RECENTLY_USED_KEY)
    if (!recentlyUsedLists) {
      return
    }
    this.db.set(
      RECENTLY_USED_KEY,
      recentlyUsedLists.filter(({ id }) => id !== listid),
    )
    this.setState({ recentlyUsedLists: getRecentlyUsedLists(this.db) })
  }

  render(): JSX.Element {
    return (
      <>
        {this.state.listid && <Redirect to={encodeURIComponent(this.state.listid)} push />}
        <Frame>
          {{
            topBar: (
              <TopBarComponent responsive={true}>
                <h1 className={styles.Title}>HamsterList</h1>
              </TopBarComponent>
            ),
            sections: [
              <div key="Content" className={styles.Content}>
                <section>
                  <button
                    type="button"
                    className={classNames(globalStyles.Button, styles.RandomButton)}
                    onClick={() => {
                      this.createRandomList().catch(console.error)
                    }}
                  >
                    <span>Create new List</span>
                  </button>
                </section>

                <section>
                  <div className={styles.OpenFormHeadline}>Or create/open list with name</div>
                  <form className={styles.OpenForm} onSubmit={this.onSubmit}>
                    <input type="text" name="listid" ref={this.inputListid} />
                    <button>Go</button>
                  </form>
                </section>

                {this.state.recentlyUsedLists.length > 0 && (
                  <section>
                    <h2 className={styles.RecentlyUsedHeadline}>Recently Used</h2>

                    <FlipMove
                      typeName={null}
                      duration="250"
                      staggerDurationBy="10"
                      staggerDelayBy="10"
                      enterAnimation="accordionVertical"
                      leaveAnimation="accordionVertical"
                    >
                      {this.state.recentlyUsedLists.map((rul) => (
                        <div className={classNames(globalStyles.Button, styles.RecentlyUsedLink)} key={rul.id}>
                          <Link to={'/' + rul.id}>{rul.title}</Link>
                          <IconButton
                            onClick={() => this.removeRecentlyUsedList(rul.id)}
                            icon="DELETE"
                            alt="Remove from recently used"
                            className={KEY_FOCUS_COMPONENT_NO_FOCUS}
                          />
                        </div>
                      ))}
                    </FlipMove>
                  </section>
                )}

                <section>
                  <p className={styles.RestorationCheckbox}>
                    <label>
                      <input type="checkbox" checked={this.state.restorationEnabled} onChange={this.onRestorationEnabledChange} />{' '}
                      Return to last used list on open
                    </label>
                  </p>
                </section>
              </div>,
            ],
            footer: (
              <div className={styles.Footer}>
                <p>
                  Icons made by{' '}
                  <a href="https://www.flaticon.com/authors/egor-rumyantsev" title="Egor Rumyantsev">
                    Egor Rumyantsev
                  </a>
                  ,{' '}
                  <a href="https://www.flaticon.com/authors/hanan" title="Hanan">
                    Hanan
                  </a>{' '}
                  and{' '}
                  <a href="https://www.flaticon.com/authors/gregor-cresnar" title="Gregor Cresnar">
                    Gregor Cresnar
                  </a>{' '}
                  from{' '}
                  <a href="https://www.flaticon.com/" title="Flaticon">
                    www.flaticon.com
                  </a>
                </p>
                <p>Version: {import.meta.env.VITE_GIT_SHA ?? 'No version information found!'}</p>
              </div>
            ),
          }}
        </Frame>
      </>
    )
  }
}
