const timeout = 10_000

const reasonOf = (error: unknown) => {
  if (!(error instanceof Error)) return 'request failed'
  return error.name === 'TimeoutError' ? 'timed out' : error.message
}

export const getJson = async (source: string, url: string, headers: Record<string, string> = {}, limit = timeout): Promise<unknown> => {
  let response: Response
  try {
    response = await fetch(url, { headers: { accept: 'application/json', ...headers }, signal: AbortSignal.timeout(limit) })
  } catch (error) {
    throw new Error(`${source} model list failed: ${reasonOf(error)}`)
  }
  if (!response.ok) throw new Error(`${source} model list failed: HTTP ${response.status} ${response.statusText}`.trim())
  try {
    return await response.json()
  } catch {
    throw new Error(`${source} model list failed: the answer was not JSON`)
  }
}
