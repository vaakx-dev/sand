import { listen } from '@vaakx-dev/vrui'
import { openLink } from '../page/protocol'
import { post } from './post'

const linkIn = (event: MouseEvent) =>
  event.composedPath().find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement && node.hasAttribute('href'))

const webUrl = (link: HTMLAnchorElement) => {
  const url = URL.parse(link.getAttribute('href') ?? '', document.baseURI)
  return url && /^https?:$/.test(url.protocol) ? url.href : undefined
}

export const forwardLinks = () => {
  let asked = 0
  listen(
    document,
    'click',
    (event: MouseEvent) => {
      const link = event.isTrusted ? linkIn(event) : undefined
      const url = link && webUrl(link)
      if (!url) return
      event.preventDefault()
      post(openLink, { url }, ++asked)
    },
    true,
  )
}
