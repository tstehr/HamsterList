// @flow
import React from 'react'
import './IconButton.css'

type Props = {
  icon: string,
  alt: string,
  className?: string,
  onClick?: (SyntheticEvent<HTMLButtonElement>) => void
}

export default function IconButton(props: Props) {
  return (
    <button onClick={props.onClick} className={"IconButton " + (props.className ? props.className : "")}>
      <img src={props.icon} alt={props.alt}/>
    </button>
  )
}
