// @flow
import React, { Component, type Element, useState, useRef } from 'react'
import _ from 'lodash'
import FlipMove from 'react-flip-move'
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now'
import { type Item, type Change, type Diff, type CategoryDefinition, ADD_ITEM, UPDATE_ITEM, DELETE_ITEM } from 'shoppinglist-shared'
import PillItemComponent from './PillItemComponent'
import './ChangesComponent.css'

type Props = {
  changes: $ReadOnlyArray<Change>,
  categories: $ReadOnlyArray<CategoryDefinition>,
}

const defaultChangeLength = 15

export default function ChangesComponent(props: Props) {
  const [length, setLength] = useState(defaultChangeLength)

  const changes = [...props.changes.slice(Math.max(props.changes.length - length, 0), props.changes.length)]
  changes.reverse()
  
  return (
  <div className="KeyFocusComponent--ignore" >
    <FlipMove
      typeName="ul" className="ChangesComponent KeyFocusComponent--ignore"
      duration="250" staggerDelayBy="10"
      enterAnimation="accordionVertical" leaveAnimation="accordionVertical"
    >
      {_.flatMap(changes, c =>
        c.diffs.map((d, i) => <DiffComponent key={`${c.id}_${i}`} change={c} diff={d} categories={props.categories}/>)
      )}
    </FlipMove>
    {length !== Infinity && <>
        <button type="button" onClick={() => setLength(length + defaultChangeLength)}>More</button> 
        <button type="button" onClick={() => setLength(Infinity)}>Show All</button>
    </>}
    {length !== defaultChangeLength && <button type="button" onClick={() => {window.scrollTo({top: 0, left: 0, behavior: 'smooth'}); setLength(defaultChangeLength)}}>Reset</button>}
  </div>
  )
}

type DiffProps = { 
  change: Change, 
  diff: Diff, 
  categories: $ReadOnlyArray<CategoryDefinition> 
}

export class DiffComponent extends Component<DiffProps> {
  render() {
    return <li className="DiffComponent">
      {this.props.change.username} - {distanceInWordsToNow(this.props.change.date)} ago:&nbsp;
      {this.createDiffElement()}
    </li> 
  }

  createDiffElement(): React$Node {
    const diff = this.props.diff
    const categories = this.props.categories

    if (diff.type === UPDATE_ITEM) {
      return <>
        Changed <PillItemComponent item={diff.oldItem} categories={categories} /> to <PillItemComponent item={diff.item} categories={categories} />
      </>
    }

    if (diff.type === ADD_ITEM) {
      return <>Added <PillItemComponent item={diff.item} categories={categories} /></>
    }

    if (diff.type === DELETE_ITEM) {
      return <>Deleted <PillItemComponent item={diff.oldItem} categories={categories} /></>
    }

    return (diff: empty) || <>Unknown diff type</> // https://stackoverflow.com/a/54030217
  }
}