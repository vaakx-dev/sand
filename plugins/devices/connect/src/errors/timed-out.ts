export class TimedOut extends Error {
  override readonly name = 'TimedOut'
}

export const isTimeout = (error: unknown) =>
  error instanceof TimedOut || (error instanceof Error && error.name === 'TimeoutError')
