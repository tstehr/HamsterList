import React from 'react'
import ReactDOM from 'react-dom'
import 'share-api-polyfill'
import smoothscroll from 'smoothscroll-polyfill'
import App from './App'

// kick off the polyfill!
smoothscroll.polyfill()

ReactDOM.render(<App />, document.getElementById('root'))
