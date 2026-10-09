export class TokenError extends Error {
  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(`Token request failed (${status}): ${detail}`)
  }

  get rejected() {
    return this.status >= 400 && this.status < 500
  }
}

const attempts = 3

export const postToken = async (url: string, init: RequestInit): Promise<any> => {
  for (let attempt = 1; ; attempt++) {
    let response: Response
    try {
      response = await fetch(url, { method: 'POST', ...init })
    } catch (error) {
      if (attempt >= attempts || init.signal?.aborted) throw error
      await Bun.sleep(500 * 2 ** (attempt - 1))
      continue
    }
    if (response.ok) return response.json()
    if (response.status >= 500 && attempt < attempts) {
      await response.body?.cancel()
      await Bun.sleep(500 * 2 ** (attempt - 1))
      continue
    }
    const text = await response.text().catch(() => '')
    throw new TokenError(response.status, text || response.statusText)
  }
}

export const expiresAt = (seconds: unknown) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) throw new Error('Token response has no valid expires_in')
  return Date.now() + seconds * 1000
}

export const required = (value: unknown, name: string) => {
  if (typeof value !== 'string' || !value) throw new Error(`Token response has no ${name}`)
  return value
}
