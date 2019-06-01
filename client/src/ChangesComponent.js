// @flow
import React, { Component, type Element, useState, useRef } from 'react'
import _ from 'lodash'
import FlipMove from 'react-flip-move'
import distanceInWords from 'date-fns/distance_in_words'
import differenceInHours from 'date-fns/difference_in_hours'
import memoize from 'memoize-one'
import format from 'date-fns/format'
import classNames from 'classnames'
import { type Item, type Change, type Diff, type CategoryDefinition, ADD_ITEM, UPDATE_ITEM, DELETE_ITEM, createReverseDiff } from 'shoppinglist-shared'
import PillItemComponent from './PillItemComponent'
import type { ApplyDiff, CreateApplicableDiff } from './ShoppingListContainerComponent'
import './ChangesComponent.css'

type Props = {
  changes: $ReadOnlyArray<Change>,
  unsyncedChanges: $ReadOnlyArray<Change>,
  categories: $ReadOnlyArray<CategoryDefinition>,
  applyDiff: ApplyDiff, 
  createApplicableDiff: CreateApplicableDiff,
}

const defaultDiffLength = 15
const maxDiffLength = 50

export default function ChangesComponent(props: Props) {
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(defaultDiffLength)
  const [detailsExpandedDiff, setDetailsExpandedDiff] = useState({ changeId: null, diffIndex: NaN})

  // changes chronologically
  const allDiffs = _.flatMap([...props.changes, ...props.unsyncedChanges], (change, changeIndex) => 
    change.diffs.map((diff, diffIndex) => ({ 
      change, changeIndex, unsynced: changeIndex >= props.changes.length,
      diff, diffIndex,
    }))
  )
  allDiffs.reverse()

  const loadOlder = () => {
    const newEnd = Math.min(end + defaultDiffLength, allDiffs.length)
    setEnd(newEnd)
    if (newEnd - start > maxDiffLength) {
      setStart(Math.max(newEnd - maxDiffLength, 0))
    }
  }
  
  const loadNewer = () => {
    const newStart = Math.max(start - defaultDiffLength, 0)
    setStart(newStart)
    if (newStart - end > maxDiffLength) {
      const newEnd = Math.min(newStart + maxDiffLength, allDiffs.length)
    }
  }

  const reset = () => {
    window.scrollTo({top: 0, left: 0, behavior: 'smooth'})
    setStart(0)
    setEnd(defaultDiffLength)
  }

  const diffs = allDiffs.slice(start, end)
  
  return (
  <div className="ChangesComponent" >
     {start > 0 && 
      <button type="button" className="PaddedButton" onClick={loadNewer}>Show newer changes</button> 
    }
    <FlipMove
      typeName="ul" className="ChangesComponent__list"
      duration="250" staggerDelayBy="10"
      enterAnimation="accordionVertical" leaveAnimation="accordionVertical"
    >
    {/* <ul className="ChangesComponent__list"> */}
      {
        diffs.map(({change, changeIndex, unsynced, diff, diffIndex}) => {
          const detailsExpanded = detailsExpandedDiff.changeId === change.id && detailsExpandedDiff.diffIndex === diffIndex
          return <DiffComponent key={`${change.id}_${diffIndex}`} 
            change={change} diff={diff} categories={props.categories} 
            unsynced={unsynced} 
            applyDiff={props.applyDiff} 
            createApplicableDiff={props.createApplicableDiff}
            detailsExpanded={detailsExpanded}
            onHeaderClick={() => setDetailsExpandedDiff({ changeId: detailsExpanded ? null : change.id, diffIndex })}
          />
        })
      }
    {/* </ul> */}
    </FlipMove>
    {end < allDiffs.length && 
      <button type="button" className="PaddedButton" onClick={loadOlder}>Show older changes</button> 
    }
    {(end !== defaultDiffLength || start !== 0) &&  
      <button type="button" className="PaddedButton" onClick={reset}>Reset</button>
    }
  </div>
  )
}

type DiffProps = { 
  change: Change, 
  diff: Diff, 
  categories: $ReadOnlyArray<CategoryDefinition>,
  unsynced: boolean,
  detailsExpanded: boolean,
  applyDiff: ApplyDiff,
  createApplicableDiff: CreateApplicableDiff,
  onHeaderClick: () => void,
}

export class DiffComponent extends Component<DiffProps> {
  getDateString = memoize((date: Date) => {
    const now = new Date()
    const absoluteDateString = format(date, 'YYYY-MM-DD HH:mm')
    const hours = differenceInHours(now, date)
    const dateString = hours < 12 ? `${distanceInWords(now, date)} ago` : absoluteDateString
    return [dateString, absoluteDateString, date.toISOString()]
  }, _.isEqual)

  getApplicableDiff = (diff: Diff) => {
    const reverseDiff = createReverseDiff(this.props.diff)
    const applicableDiff = this.props.createApplicableDiff(reverseDiff)
    const reverseEqualApplicable = _.isEqual(reverseDiff, applicableDiff)
    return [applicableDiff, reverseEqualApplicable];
  }
  
  render() {
    const elClasses = classNames('DiffComponent', {
      'DiffComponent--unsynced': this.props.unsynced,
      'DiffComponent--expanded': this.props.detailsExpanded,
    })

    const [dateString, absoluteDateString, isoDateString] = this.getDateString(this.props.change.date)
    const [applicableDiff, reverseEqualApplicable] = this.getApplicableDiff(this.props.diff)

    const undo = (e) => {
      e.preventDefault()
      if (applicableDiff != null) {
        try {
          this.props.applyDiff(applicableDiff)
        } catch (e) {
          console.error(e)
        }
      }
    }

    return <li className={elClasses}>
      <header>
        <button type="button" onClick={this.props.onHeaderClick} className="DiffComponent__headerButton">
          {this.props.change.username != null && this.props.change.username.trim() !== ''
            ? this.props.change.username
            : <em>{this.props.unsynced ? 'You' : 'Anonymus'}</em>
          }
          :&nbsp;
          {this.createDiffElement(this.props.diff, 'PAST')}
        </button>
      </header>
      <ul className="DiffComponent__details">
        <li><time dateTime={isoDateString} title={absoluteDateString}>{dateString}</time></li>
        <li>
          {/* Use a link even if undo isn't possible so focus isn't lost after undo */}
          <a href="#" onClick={undo} tabIndex={this.props.detailsExpanded ? 0 : -1} role="button" 
            className={classNames('DiffComponent__UndoLink', { 'DiffComponent__UndoLink--disabled': applicableDiff == null })}>
            {applicableDiff != null
              ? <>
                Undo 
                {!reverseEqualApplicable && <>&nbsp;({this.createDiffElement(applicableDiff, 'PRESENT')})</>}
              </>
              : "Can't undo"
            } 
          </a>
        </li>
      </ul>
    </li> 
  }

  createDiffElement(diff: Diff, tense: 'PAST' | 'PRESENT'): React$Node {
    const categories = this.props.categories

    if (diff.type === UPDATE_ITEM) {
      return <>
        {tense === 'PAST' ? 'Changed' : 'Change'} <PillItemComponent item={diff.oldItem} categories={categories} /> to <PillItemComponent item={diff.item} categories={categories} />
      </>
    }

    if (diff.type === ADD_ITEM) {
      return <>{tense === 'PAST' ? 'Added' : 'Add'} <PillItemComponent item={diff.item} categories={categories} /></>
    }

    if (diff.type === DELETE_ITEM) {
      return <>{tense === 'PAST' ? 'Deleted' : 'Delete'}  <PillItemComponent item={diff.oldItem} categories={categories} /></>
    }

    return (diff: empty) || <>Unknown diff type</> // https://stackoverflow.com/a/54030217
  }
}