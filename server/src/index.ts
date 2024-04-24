import { getConfig } from './config.js'
import { runServer } from './runServer.js'

const config = getConfig()
runServer(config).catch((e) => console.error(e))
