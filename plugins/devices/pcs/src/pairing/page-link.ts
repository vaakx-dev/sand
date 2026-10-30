import { type PageLink, pageLinkKeys } from '@sand/devices-contract'
import { listen } from '@vaakx-dev/vrui'

const readHash = (): PageLink | undefined => {
  const params = new URLSearchParams(location.hash.slice(1))
  const token = params.get(pageLinkKeys.pair)
  if (token) return { kind: 'pair', token }
  const request = params.get(pageLinkKeys.approve)
  if (request) return { kind: 'approve', request }
  return undefined
}

export const takePageLink = () => {
  const link = readHash()
  if (link) history.replaceState(history.state, '', location.pathname + location.search)
  return link
}

export const onPageLink = (found: (link: PageLink) => void) =>
  listen(window, 'hashchange', () => {
    const link = takePageLink()
    if (link) found(link)
  })
