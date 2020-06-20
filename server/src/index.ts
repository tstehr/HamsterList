import { getConfig } from './config'
import { runServer } from './runServer'

const config = getConfig()
runServer(config)
