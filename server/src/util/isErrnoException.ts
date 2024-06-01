export default function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    (('errno' in error && (typeof error.errno === 'number' || error.errno === undefined)) || !('errno' in error)) &&
    (('code' in error && (typeof error.code === 'string' || error.code === undefined)) || !('code' in error)) &&
    (('path' in error && (typeof error.path === 'string' || error.path === undefined)) || !('path' in error)) &&
    (('syscall' in error && (typeof error.syscall === 'string' || error.syscall === undefined)) || !('syscall' in error))
  )
}
