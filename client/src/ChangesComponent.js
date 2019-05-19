// @flow
import React, { Component } from 'react'
import _ from 'lodash'
import FlipMove from 'react-flip-move'
import { type Change } from 'shoppinglist-shared'
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now'


type Props = {
  changes: $ReadOnlyArray<Change>,
}

export default function ChangesComponent(props: Props) {
  const changes = [...props.changes.slice(props.changes.length - 10, props.changes.length)]
  changes.reverse()
  return (<FlipMove
    typeName={null} duration="250" staggerDurationBy="10" staggerDelayBy="10"
    enterAnimation="accordionVertical" leaveAnimation="accordionVertical"
  >
    {changes.map(c =>
      <div key={c.date.toISOString() + '_' + c.token}>
        <h2>{c.username} - {distanceInWordsToNow(c.date)} ago</h2>
        {c.diffs.map(d =>
          <div>{d.type}</div>
        )}
      </div>
    )}
  </FlipMove>)
}

function createChangeString() {

}
