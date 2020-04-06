import React from 'react'
import ReactDOM from 'react-dom'
import shareApiPolyfill from 'share-api-polyfill'
import smoothscroll from 'smoothscroll-polyfill' // polyfill is applied simply by importing
import App from './App'
import './index.css'
import * as serviceWorker from './serviceWorker'

// kick off the polyfill!
smoothscroll.polyfill()
// share api polyfill needs to be imported and referenced to not be a unused import
const dummy = shareApiPolyfill

ReactDOM.render(<App />, document.getElementById('root'))

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
