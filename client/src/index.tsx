import React from 'react'
import ReactDOM from 'react-dom'
import shareApiPolyfill from 'share-api-polyfill'
import smoothscroll from 'smoothscroll-polyfill'
import App from './App'

// kick off the polyfill!
smoothscroll.polyfill()

// share api polyfill needs to be imported and referenced to not be a unused import that will be optimized away
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const dummy = shareApiPolyfill

ReactDOM.render(<App />, document.getElementById('root'))
