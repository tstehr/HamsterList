import { Response } from 'express'

export default function sendErrorResponse(res: Response, e: unknown) {
  if (!(e instanceof Error)) {
    res.status(500).json({
      error: `An unexpected error occurred: ${String(e)}`,
    })
    return
  }
  res.status(400).json({
    error: e.message,
  })
}
