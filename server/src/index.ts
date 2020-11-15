import { getConfig } from './config'
import { runServer } from './runServer'

const config = getConfig()
runServer(config).catch((e) => console.error(e))
