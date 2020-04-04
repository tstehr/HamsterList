import React from 'react'
import ReactDOM from 'react-dom'
import smoothscroll from 'smoothscroll-polyfill' // polyfill is applied simply by importing
import App from './App'
import './index.css'
import registerServiceWorker from './registerServiceWorker'

// kick off the polyfill!
smoothscroll.polyfill()

ReactDOM.render(<App />, document.getElementById('root'))
registerServiceWorker()
