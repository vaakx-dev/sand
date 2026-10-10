const timeout = 10_000

export const getJson = async (source: string, url: string, headers: Record<string, string> = {}, limit = timeout): Promise<any> => {
  let response: Response
  try {
    response = await fetch(url, { headers: { accept: 'application/json', ...headers }, signal: AbortSignal.timeout(limit) })
  } catch (error) {
    const reason = error instanceof Error && error.name === 'TimeoutError' ? 'timed out' : error instanceof Error ? error.message : 'request failed'
    throw new Error(`${source} model list failed: ${reason}`)
  }
  if (!response.ok) throw new Error(`${source} model list failed: HTTP ${response.status} ${response.statusText}`.trim())
  try {
    return await response.json()
  } catch {
    throw new Error(`${source} model list failed: the answer was not JSON`)
  }
}

export const trimmed = (url: string) => url.replace(/\/+$/, '')

export const bearer = (key?: string): Record<string, string> => (key ? { authorization: `Bearer ${key}` } : {})
