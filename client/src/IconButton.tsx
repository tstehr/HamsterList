import classNames from 'classnames'
import React from 'react'
import styles from './IconButton.module.css'

type IconType = 'DELETE' | 'ADD'
interface Props {
  icon: IconType
  alt: string
  className?: string
  onClick?: (a: React.SyntheticEvent<HTMLButtonElement>) => void
}
export default function IconButton(props: Props): JSX.Element {
  return (
    <button onClick={props.onClick} className={classNames(styles.IconButton, props.className)}>
      {getSvg(props.icon, props.alt)}
    </button>
  )
}

function getSvg(icon: IconType, alt: string): JSX.Element {
  switch (icon) {
    case 'ADD':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 491.86 491.86">
          <title>{alt}</title>
          <path d="M465.167 211.614H280.245V26.691c0-8.424-11.439-26.69-34.316-26.69s-34.316 18.267-34.316 26.69v184.924H26.69C18.267 211.614 0 223.053 0 245.929s18.267 34.316 26.69 34.316h184.924v184.924c0 8.422 11.438 26.69 34.316 26.69s34.316-18.268 34.316-26.69V280.245H465.17c8.422 0 26.69-11.438 26.69-34.316s-18.27-34.315-26.693-34.315z" />
        </svg>
      )

    case 'DELETE':
      return (
        <svg viewBox="0 0 268.476 268.476">
          <title>{alt}</title>
          <path
            d="M63.119 250.254s3.999 18.222 24.583 18.222h93.072c20.583 0 24.582-18.222 24.582-18.222l18.374-178.66H44.746l18.373 178.66zM170.035 98.442a8.948 8.948 0 0 1 8.949-8.949 8.95 8.95 0 0 1 8.95 8.949l-8.95 134.238a8.949 8.949 0 1 1-17.898 0l8.949-134.238zm-44.746 0a8.949 8.949 0 0 1 8.949-8.949 8.948 8.948 0 0 1 8.949 8.949V232.68a8.948 8.948 0 0 1-8.949 8.949 8.949 8.949 0 0 1-8.949-8.949V98.442zm-35.797-8.95a8.948 8.948 0 0 1 8.949 8.949l8.95 134.238a8.95 8.95 0 0 1-17.899 0L80.543 98.442a8.95 8.95 0 0 1 8.949-8.95zM218.36 35.811h-39.376V17.899C178.984 4.322 174.593 0 161.086 0H107.39C95.001 0 89.492 6.001 89.492 17.899v17.913H50.116c-7.914 0-14.319 6.007-14.319 13.43 0 7.424 6.405 13.431 14.319 13.431H218.36c7.914 0 14.319-6.007 14.319-13.431 0-7.423-6.405-13.431-14.319-13.431zm-57.274 0h-53.695l.001-17.913h53.695v17.913z"
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </svg>
      )

    default:
      throw Error(`Unknwon icon type`)
  }
}
