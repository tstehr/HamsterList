export class HTTPErrorStatusError extends Error {
  code: number

  constructor(msg: string, code: number) {
    super(msg)
    this.code = code
    Error.captureStackTrace(this, HTTPErrorStatusError)
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
