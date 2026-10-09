export class AccountError extends Error {
  constructor(
    message: string,
    readonly detail?: string,
  ) {
    super(message)
  }
}

export const rawMessage = (error: unknown) => {
  if (!(error instanceof Error)) return String(error)
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' && !error.message.includes(code) ? `${code}: ${error.message}` : error.message
}

export const detailOf = (error: unknown) => (error instanceof AccountError ? error.detail : undefined)

export const offlineError = (pc: string, provider: string, detail?: string) => new AccountError(`${pc} is offline, so ${provider} isn't available`, detail)

export const refusedError = (pc: string, detail?: string) => new AccountError(`${pc} no longer accepts this PC — pair it again`, detail)

export const unsharedError = (pc: string, provider: string, detail?: string) => new AccountError(`${pc} doesn't share ${provider} anymore`, detail)
