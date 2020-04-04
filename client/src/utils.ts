export async function responseToJSON(res: Response) {
  const json = await res.json()

  if (!res.ok) {
    const errorMessage = json && json.error
    throw new HTTPErrorStatusError(errorMessage, res.status)
  }

  return json
}
export class HTTPErrorStatusError extends Error {
  code: number

  constructor(msg: string, code: number) {
    super(msg)
    this.code = code
    Error.captureStackTrace(this, HTTPErrorStatusError)
  }
}
