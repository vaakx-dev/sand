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
  const code = 'code' in error ? error.code : undefined
  return typeof code === 'string' && !error.message.includes(code) ? `${code}: ${error.message}` : error.message
}

export const detailOf = (error: unknown) => (error instanceof AccountError ? error.detail : undefined)
