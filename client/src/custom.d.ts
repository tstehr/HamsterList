declare module 'lodash-id' {
  declare module 'lodash' {
    interface CollectionChain<T> {
      // minimal subsets of lodash-id functions we use
      // see https://github.com/typicode/lodash-id
      getById(id): ExpChain<T | undefined>
      upsert(object: T): CollectionChain<T>
      removeById(id): ExpChain<T | undefined>
    }
  }
}

declare module 'share-api-polyfill'

// https://github.com/Microsoft/TypeScript/issues/18642#issuecomment-505413180
// TODO remove once https://github.com/microsoft/TSJS-lib-generator/pull/837 is released
interface ShareData {
  title?: string
  text?: string
  url?: string
}

interface Navigator {
  share?: (data?: ShareData) => Promise<void>
}
