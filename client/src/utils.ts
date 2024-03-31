import Emittery from 'emittery'

export class HTTPErrorStatusError extends Error {
  code: number

  constructor(msg: string, code: number) {
    super(msg)
    this.code = code
  }
}

export async function responseToJSON(res: Response): Promise<unknown> {
  const json = await res.json()

  if (!res.ok) {
    const errorMessage = json?.error
    throw new HTTPErrorStatusError(errorMessage, res.status)
  }

  return json
}

export type MixinEmitter<T> = T extends Emittery.Typed<infer P, infer Q>
  ? PublicEmitter<T> & {
      emitter: T
    }
  : never

export type PublicEmitter<T> = T extends Emittery.Typed<infer P, infer Q>
  ? Omit<T, 'emit' | 'emitSerial' | 'bindMethods' | 'clearListeners'>
  : never
