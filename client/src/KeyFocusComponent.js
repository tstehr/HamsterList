// @flow
import React, { Component, type Node } from 'react'
import _ from 'lodash'

type Direction = 'horizontal' | 'vertical'
type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

type Props = {
  rootTagName: string,
  className?: string,
  children?: Node,
  direction: Direction
}


export default class KeyFocusComponent extends Component<Props> {
  root: ?HTMLElement
  back: ArrowKey
  forward: ArrowKey

  constructor(props: Props) {
    super(props)

    switch(props.direction) {
      case 'horizontal':
        this.back = 'ArrowLeft'
        this.forward = 'ArrowRight'
        break;
      case 'vertical':
        this.back = 'ArrowUp'
        this.forward = 'ArrowDown'
        break;
      default:
        throw new Error('Unknown direction')
    }
  }

  handleKeyDown = (e: SyntheticKeyboardEvent<>) => {
    if ((e.key === this.back || e.key === this.forward) && this.root != null) {
      const root = this.root
      const tmp: $ReadOnlyArray<HTMLElement> = this.transitiveClosure([...root.children],
          (el) => el.classList.contains("KeyFocusComponent--ignore") ? [...el.children] : []
        )

      const focusable = tmp
        .filter((el) => this.canReceiveFocus(el) && !el.classList.contains("KeyFocusComponent--ignore"))
        .map((element) => element.querySelector('.KeyFocusComponent--defaultFocus') || element)

      const focused = root.querySelector(':focus')
      if (focused == null) {
        return
      }

      let newIndex

      if (focusable.includes(focused)) {
        const index = focusable.indexOf(focused)

        if (e.key === this.back) {
            newIndex = index - 1
        } else if (e.key === this.forward) {
            newIndex = index + 1
        }
      } else {
        const all: HTMLElement[] = [...root.querySelectorAll('*')]
        const index = all.indexOf(focused)
        let search
        if (e.key === this.back) {
            search = all.slice(0, index).reverse()
        } else if (e.key === this.forward) {
          search = all.slice(index)
        }
        if (search != null) {
          for (const el of search) {
            if (focusable.includes(el)) {
              newIndex = focusable.indexOf(el)
              break
            }
          }
        }
      }

      if (newIndex != null) {
        if (newIndex < 0) {
          newIndex = newIndex + focusable.length
        } else if (newIndex >= focusable.length) {
          newIndex = newIndex - focusable.length
        }
        focusable[newIndex].focus()
        e.preventDefault()
      }
    }
  }

  canReceiveFocus(el: HTMLElement) {
    if (el.classList.contains('KeyFocusComponent--noFocus')) {
      return false
    }
    const defaultFocus = el.querySelector('.KeyFocusComponent--defaultFocus')
    if (defaultFocus != null) {
      return true
    }
    return el.tabIndex != null && el.tabIndex !== -1
  }

  transitiveClosure<I>(input: $ReadOnlyArray<I>, continuation: (I) => $ReadOnlyArray<I>): $ReadOnlyArray<I> {
    const working = [...input]
    for (const el of working) {
      working.splice(working.length, 0, ...continuation(el))
    }
    return Object.freeze(working)
  }

  render() {
    const Component = this.props.rootTagName
    const className = this.props.className != null ? this.props.className + " KeyFocusComponent" : "KeyFocusComponent"
    const passthroughProps = _.omit(this.props, ['rootTagName', 'className', 'children', 'direction'])

    return <Component onKeyDown={this.handleKeyDown} ref={(root) => this.root = root} className={className} {...passthroughProps}>
      {this.props.children}
    </Component>
  }
}
