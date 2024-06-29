import Emittery from 'emittery'

export class HTTPErrorStatusError extends Error {
  code: number

  constructor(msg: string, code: number) {
    super(msg)
    this.code = code
  }
}

export async function responseToJSON(res: Response): Promise<unknown> {
  const json: unknown = await res.json()

  if (!res.ok) {
    const errorMessage =
      typeof json === 'object' && json !== null && 'error' in json && typeof json.error === 'string'
        ? json?.error
        : 'Unknown error'
    throw new HTTPErrorStatusError(errorMessage, res.status)
  }

  return json
}

export type MixinEmitter<T> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Emittery.Typed<any, any>
    ? PublicEmitter<T> & {
        emitter: T
      }
    : never

export type PublicEmitter<T> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Emittery.Typed<any, any> ? Omit<T, 'emit' | 'emitSerial' | 'bindMethods' | 'clearListeners'> : never
