import camelCase from 'camel-case'
import fs from 'fs-extra'
import nconf from 'nconf'
import path from 'path'
import TokenCreator from './TokenCreator'

export function getConfig(): nconf.Provider {
  const config = new nconf.Provider()
  // sources are defined in order of priority

  // command line arg
  config.argv({
    parseValues: true,
  })

  // env variable
  config.env({
    lowerCase: true,
    transform: (obj: { key: string }) => {
      const camelCased = camelCase(obj.key)

      if (camelCased.length > 0) {
        obj.key = camelCased
      }

      return obj
    },
    parseValues: true,
  })

  // set a default value for the config file path (if not given on command line or env), so we can load it
  config.defaults({
    configFile: path.resolve('config.json'),
  })

  // create config file if it doesn't exist
  if (!fs.existsSync(config.get('configFile'))) {
    console.info('First run, creating config file with random secret')
    fs.outputJSONSync(
      config.get('configFile'),
      {
        secret: TokenCreator.createRandomSecret(),
      },
      {
        spaces: 2,
      }
    )
  }

  // load config file
  config.file('user', config.get('configFile'))

  // populate rest of settings with default values
  config.file('default', path.resolve('data/config-default.json'))

  // sanity check config
  config.required(['secret', 'host'])

  if (config.get('https')) {
    config.required(['keyFile', 'certFile', 'httpsPort'])
  }

  if (config.get('http')) {
    config.required(['port'])
  }

  if (!config.get('http') && !config.get('https')) {
    throw new Error('Either http or https must be enabled!')
  }

  return config
}
