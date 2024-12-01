import React, { Component, ReactElement } from 'react'

export default class ClassWrapper<P> extends Component<P & { component: (props: P) => ReactElement | null }> {
  render(): React.ReactNode {
    const { component: Component, ...props } = this.props
    // @ts-expect-error TS is unwilling to conclude that props is P here
    return <Component {...props} />
  }
}
