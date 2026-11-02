import { pageLinkKeys } from '@sand/devices-contract'

export const pageUrl = (base: string, token: string) => {
  const url = new URL(base)
  url.hash = `${pageLinkKeys.pair}=${encodeURIComponent(token)}`
  return url.href
}
