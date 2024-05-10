import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'

import { it } from 'vitest'

it('renders without crashing', (): void => {
  const div = document.createElement('div')
  ReactDOM.render(<App />, div)
})
