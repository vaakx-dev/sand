import type { PairInvite } from '@sand/host-devices/contract'
import { routeKind } from '@sand/host-remotes/pairing'
import type { Kit } from '@sand/ui-kit/contract'
import { capital } from '@sand/util'
import { routeLabel } from '@sand/web-client/pairing'
import { div, dynamicChild, sig, span } from '@vaakx-dev/vrui'
import { listenBox } from './listen'
import { qrCode } from './qr'

export type InviteFor = 'phone' | 'pc'

const local = (url: string) => routeKind(url) === 'local'

const lan = (url: string) => routeKind(url) === 'lan'

const secureTailscale = (url: string) => routeKind(url) === 'tailscale' && url.startsWith('https:')

const phoneLink = (links: string[]) => {
  const preferred = location.protocol === 'https:' ? [secureTailscale, lan] : [lan]
  for (const match of preferred) {
    const link = links.find(match)
    if (link) return link
  }
  return links[0]
}

const routeTitle = (url: string) => (lan(url) ? 'Home wifi' : capital(routeLabel(routeKind(url), url)))

const listenText: Record<InviteFor, string> = {
  phone: 'sand only listens on this computer, so your phone can’t reach it. Turn on network listening to pair it over your home wifi.',
  pc: 'sand only listens on this computer, so the other PC can’t reach it. Turn on network listening to connect over your home wifi.',
}

const expiry = 'Works once and expires in 10 minutes. Anyone with it can use this sand.'

const phoneRow = ({ copyButton, listRow }: Kit, url: string, chosen: () => boolean, choose: () => void) =>
  listRow({
    surface: 'raised',
    title: routeTitle(url),
    meta: span({ class: 'font-mono' }, url),
    disabled: local(url),
    'aria-pressed': () => String(chosen()),
    onClick: choose,
    actions: copyButton({ text: () => url, surface: 'raised' }),
  })

const pcLink = ({ codeBlock, metaLine }: Kit, url: string) => div({ class: 'flex flex-col gap-1' }, metaLine(routeTitle(url)), codeBlock({ copy: () => url }, url))

const phoneLinks = (kit: Kit, invite: PairInvite) => {
  const reachable = invite.links.filter(link => !local(link))
  const chosen = sig(phoneLink(reachable) ?? '')
  return [
    dynamicChild(chosen, link => (link ? div({ class: 'flex flex-col items-center gap-2' }, qrCode(link), kit.sheetText('Scan it with your phone’s camera, or open a link below on the phone.')) : null)),
    div(
      { class: 'flex flex-col' },
      invite.links.map(link => phoneRow(kit, link, () => chosen.get() === link, () => chosen.set(link))),
    ),
  ]
}

export const inviteBody = (kit: Kit, invite: PairInvite, listen: () => Promise<unknown>, kind: InviteFor = 'phone') => {
  const reachable = invite.links.filter(link => !local(link))
  const shown = kind === 'phone' ? invite.links : reachable
  return div(
    { class: 'flex flex-col gap-4' },
    reachable.length ? null : listenBox(kit, listenText[kind], listen),
    ...(kind === 'phone' ? phoneLinks(kit, invite) : reachable.map(link => pcLink(kit, link))),
    shown.length ? kit.sheetText(expiry) : null,
  )
}
