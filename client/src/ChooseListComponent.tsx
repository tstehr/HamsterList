import React, { Component } from 'react'
import FlipMove from 'react-flip-move'
import { Link, Redirect } from 'react-router-dom'
import { createRandomUUID } from 'shoppinglist-shared'
import './ChooseListComponent.css'
import { createDB, getRecentlyUsedLists } from './db'
import TopBarComponent from './TopBarComponent'
import { responseToJSON } from './utils'

export type RecentlyUsedList = {
  id: string
  uses: number
  lastUsedTimestamp: number
  title?: string
}

type Props = {}

type State = {
  listid: string | undefined | null
  recentlyUsedLists: ReadonlyArray<RecentlyUsedList>
}

export default class ChooseListComponent extends Component<Props, State> {
  db: any
  inputListid: {
    current: null | HTMLInputElement
  }

  constructor(props: Props) {
    super(props)
    this.db = createDB()
    this.state = {
      listid: null,
      recentlyUsedLists: getRecentlyUsedLists(this.db),
    }
    this.inputListid = React.createRef()
  }

  componentDidMount() {
    if (this.inputListid.current) {
      this.inputListid.current.focus()
    }

    window.addEventListener('storage', this.handleStorage)
  }

  componentWillUnmount() {
    window.removeEventListener('storage', this.handleStorage)
  }

  handleStorage = () => {
    this.db.read()
    this.setState({
      recentlyUsedLists: getRecentlyUsedLists(this.db),
    })
  }

  onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    this.setState({
      // @ts-ignore
      listid: e.currentTarget.elements['listid'].value.trim(),
    })
  }

  async createRandomList() {
    const listid = createRandomUUID()
    const response = await fetch(`/api/${listid}/`, {
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
    this.setState({
      listid: json.id,
    })
  }

  render() {
    return (
      <div className="ChooseListComponent">
        {this.state.listid && <Redirect to={this.state.listid} push />}
        <TopBarComponent responsive={false}>
          <h1 className="ChooseListComponent__title">ShoppingList</h1>
        </TopBarComponent>
        <div className="ChooseListComponent__content">
          <section>
            <button type="button" className="ChooseListComponent__randomButton" onClick={this.createRandomList.bind(this)}>
              Create new List
            </button>
          </section>

          <section>
            Or create/open list with name
            <form className="ChooseListComponent__openForm" onSubmit={this.onSubmit}>
              <input type="text" name="listid" ref={this.inputListid} />
              <button>Go</button>
            </form>
          </section>

          {this.state.recentlyUsedLists.length > 0 && (
            <section>
              <h2>Recently Used</h2>

              <FlipMove
                typeName={null}
                duration="250"
                staggerDurationBy="10"
                staggerDelayBy="10"
                enterAnimation="accordionVertical"
                leaveAnimation="accordionVertical"
              >
                {this.state.recentlyUsedLists.map((rul) => (
                  <Link className="ChooseListComponent__recentlyUsedLink" key={rul.id} to={'/' + rul.id}>
                    {rul.title}
                  </Link>
                ))}
              </FlipMove>
            </section>
          )}

          <section className="ChooseListComponent__footer">
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
            <p>Version: {process.env.REACT_APP_GIT_SHA || 'No version information found!'}</p>
          </section>
        </div>
      </div>
    )
  }
}
