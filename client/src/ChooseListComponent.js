// @flow
import React, { Component } from 'react'
import { Redirect } from 'react-router-dom'
import FlipMove from 'react-flip-move'
import { createRandomUUID, frecency } from 'shoppinglist-shared'
import { createDB } from './db'
import { responseToJSON } from './utils';
import './ChooseListComponent.css'

export type RecentlyUsedList = {
  id: string,
  uses: number,
  lastUsedTimestamp: number,
  title?: string,
}

type State = {
  listid: ?string,
  recentlyUsedLists: $ReadOnlyArray<RecentlyUsedList>,
}

export default class ChooseListComponent extends Component<void, State> {
  db: Object

  constructor() {
    super()

    this.db = createDB()

    this.state = {
      listid: null,
      recentlyUsedLists: this.getRecentlyUsedLists(),
    }
  }

  getRecentlyUsedLists() {
    return this.db.get('recentlyUsedLists')
      .orderBy([entry => frecency(entry)], ['desc'])
      .value()
  }

  componentDidMount() {
    window.addEventListener('storage', this.handleStorage)
  }

  componentWillUnmount() {
    window.removeEventListener('storage', this.handleStorage)
  }

  handleStorage = () => {
    this.db.read()
    this.setState({
      recentlyUsedLists: this.getRecentlyUsedLists(),
    })
  }

  onSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    this.setState({
      // $FlowFixMe
      listid: e.currentTarget.elements['listid'].value.trim()
    })
  }

  async createRandomList() {
    const listid = createRandomUUID()
    const response = await fetch(`/api/${listid}/`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      method: "PUT",
      body: JSON.stringify({
        id: listid,
        title: `New List (${new Date().toLocaleString()})`,
      })
    })
    const json = await responseToJSON(response)
    this.setState({
      listid: json.id
    })
  }

  render() {
    return (
      <div className="ChooseListComponent">
        { this.state.listid &&
          <Redirect to={this.state.listid} push />
        }
        <div className="ChooseListComponent__content">
          <h1>Shopping List</h1>

          <section><button type="button" className="ChooseListComponent__randomButton" onClick={this.createRandomList.bind(this)}>Create new List</button></section>

          <section>
            Or create/open list with name
            <form className="ChooseListComponent__openForm" onSubmit={this.onSubmit}>
              <input type="text" name="listid" />
              <button>Go</button>
            </form>
          </section>

          <section>
            <h2>Recently Used</h2>

            <FlipMove
              typeName={null} duration="250" staggerDurationBy="10" staggerDelayBy="10"
              enterAnimation="accordionVertical" leaveAnimation="accordionVertical"
            >
            {
              this.state.recentlyUsedLists.map(rul =>
                <a className="ChooseListComponent__recentlyUsedLink" key={rul.id} href={"/"+rul.id}>{
                  rul.title
                }</a>
              )
            }
            </FlipMove>
          </section>

          <section className="ChooseListComponent__footer">
            Icons made by <a href="https://www.flaticon.com/authors/egor-rumyantsev" title="Egor Rumyantsev">Egor Rumyantsev</a>, <a href="https://www.flaticon.com/authors/hanan" title="Hanan">Hanan</a> and <a href="https://www.flaticon.com/authors/gregor-cresnar" title="Gregor Cresnar">Gregor Cresnar</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a>
          </section>
        </div>
      </div>
    )
  }
}
