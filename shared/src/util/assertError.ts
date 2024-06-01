export default function assertError(e: unknown): asserts e is Error {
  if (!(e instanceof Error)) {
    throw new Error('Unexpected non-error thrown')
  }
}
