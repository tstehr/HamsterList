// @flow
import React, { Component } from 'react'
import { Switch, Route, Redirect } from 'react-router-dom'
import { createRandomUUID } from 'shoppinglist-shared'
import './ChooseListComponent.css'
import { responseToJSON } from './utils';

type State = {
  listid: ?string
}

export default class ChooseListComponent extends Component<void, State> {
  constructor() {
    super()

    this.state = {
      listid: null
    }
  }

  onSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    const formData = new FormData(e.target)
    this.setState({
      listid: formData.get('listid')
    })
    e.preventDefault()
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

          <p><button type="button" className="ChooseListComponent__randomButton" onClick={this.createRandomList.bind(this)}>Create new List</button></p>

          <p>
            Or create/open list with name
            <form className="ChooseListComponent__openForm" onSubmit={this.onSubmit}>
              <input type="text" name="listid" />
              <button>Go</button>
            </form>
          </p>
        </div>
      </div>
    )
  }
}
