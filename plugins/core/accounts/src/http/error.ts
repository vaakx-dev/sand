interface ErrorDetail {
  type?: string
  code?: string
  message?: string
  resets_at?: number
}

interface Reply {
  waitMs?: number
  usageLimit?: boolean
  resetsAt?: number
}

const usageLimitErrors = new Set(['insufficient_quota', 'usage_limit_reached', 'usage_not_included'])

const waitOf = (headers: Headers) => {
  const ms = Number(headers.get('retry-after-ms'))
  if (ms > 0) return ms
  const seconds = Number(headers.get('retry-after'))
  return seconds > 0 ? seconds * 1000 : undefined
}

const usageLimited = (headers: Headers, { type, code }: ErrorDetail) =>
  headers.get('anthropic-ratelimit-unified-status') === 'rejected' || usageLimitErrors.has(type ?? '') || usageLimitErrors.has(code ?? '')

const resetOf = (headers: Headers, { resets_at }: ErrorDetail) => {
  const seconds = Number(headers.get('anthropic-ratelimit-unified-reset') ?? resets_at)
  return seconds > 0 ? seconds * 1000 : undefined
}

const detailOf = (text: string): ErrorDetail => {
  try {
    const error = JSON.parse(text)?.error
    return error && typeof error === 'object' ? error : {}
  } catch {
    return {}
  }
}

export class ApiError extends Error {
  readonly waitMs?: number
  readonly usageLimit: boolean
  readonly resetsAt?: number

  constructor(
    readonly status: number | undefined,
    readonly type: string,
    detail: string,
    { waitMs, usageLimit = false, resetsAt }: Reply = {},
  ) {
    super(`${status ? `${status} ` : ''}${type}: ${detail}`)
    this.waitMs = waitMs
    this.usageLimit = usageLimit
    this.resetsAt = resetsAt
  }

  static async from(response: Response) {
    const text = await response.text()
    const error = detailOf(text)
    const reply = { waitMs: waitOf(response.headers), usageLimit: usageLimited(response.headers, error), resetsAt: resetOf(response.headers, error) }
    return new ApiError(response.status, error.type ?? 'api_error', error.message ?? (text || response.statusText), reply)
  }
}
