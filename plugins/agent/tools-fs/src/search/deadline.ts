const seconds = 30

export const timeoutNote = `… stopped after ${seconds} s. Use a narrower path or pattern.`

export const withDeadline = (signal: AbortSignal) => AbortSignal.any([signal, AbortSignal.timeout(seconds * 1000)])

export const timedOut = (error: unknown) => error instanceof DOMException && error.name === 'TimeoutError'
