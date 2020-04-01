import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import registerServiceWorker from './registerServiceWorker'
import smoothscroll from 'smoothscroll-polyfill'
// polyfill is applied simply by importing
import shareapipolyfill from 'share-api-polyfill' // eslint-disable-line no-unused-vars

// kick off the polyfill!
smoothscroll.polyfill()

ReactDOM.render(<App />, document.getElementById('root'))
registerServiceWorker()
