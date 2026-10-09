import { rawMessage } from '../errors'
import { sharePaths, type ShareInfo } from '../share/info'
import type { RemotePc } from './remotes'

const identityTimeout = 2_000
const infoTimeout = 8_000

export class Refused extends Error {
  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(detail)
  }
}

export class Offline extends Error {}

const trim = (url: string) => url.replace(/\/+$/, '')

export const authHeaders = (pc: RemotePc) => ({ authorization: `Bearer ${pc.key}` })

const answersAs = async (url: string, id: string): Promise<string | undefined> => {
  try {
    const response = await fetch(`${trim(url)}/identity`, { signal: AbortSignal.timeout(identityTimeout) })
    if (!response.ok) return `${url} · HTTP ${response.status}`
    const body = (await response.json()) as { deviceId?: string; id?: string }
    return (body.deviceId ?? body.id) === id ? undefined : `${url} · a different PC answered`
  } catch (error) {
    return `${url} · ${rawMessage(error)}`
  }
}

export const findUrl = async (pc: RemotePc) => {
  const found = await Promise.all(pc.urls.map(url => answersAs(url, pc.id)))
  const index = found.indexOf(undefined)
  if (index < 0) throw new Offline(found.join('\n') || 'no address to try')
  return trim(pc.urls[index]!)
}

export const refusal = async (response: Response) => {
  const text = (await response.text().catch(() => '')).trim()
  return text || `HTTP ${response.status}`
}

export const fetchInfo = async (base: string, pc: RemotePc, refresh: boolean): Promise<ShareInfo> => {
  const url = `${base}${sharePaths.info}${refresh ? '?refresh=1' : ''}`
  const response = await fetch(url, { headers: authHeaders(pc), signal: AbortSignal.timeout(infoTimeout) })
  if (response.status === 401 || response.status === 403 || response.status === 404) throw new Refused(response.status, await refusal(response))
  if (!response.ok) throw new Error(await refusal(response))
  const info = (await response.json()) as Partial<ShareInfo>
  if (!Array.isArray(info.accounts) || !Array.isArray(info.models)) throw new Refused(404, 'it runs an older sand')
  return info as ShareInfo
}
