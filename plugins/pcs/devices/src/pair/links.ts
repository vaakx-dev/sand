import type { PairInvite } from '@sand/host-devices/contract'
import { routeKind } from '@sand/host-remotes/pairing'
import type { Kit } from '@sand/ui-kit/contract'
import { routeLabel } from '@sand/web-client/pairing'
import { div, dynamicChild, sig, span } from '@vaakx-dev/vrui'
import { linkText } from '../components'
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

const listenText: Record<InviteFor, string> = {
  phone: 'sand only listens on this computer, so phones and other PCs can’t reach it. Turn on network listening to pair them over your home wifi.',
  pc: 'sand only listens on this computer, so the other PC can’t reach it. Turn on network listening to connect over your home wifi.',
}

const qrText: Record<InviteFor, string> = {
  phone: 'Scan with your phone’s camera, or open the link on the other device.',
  pc: 'Copy the link below and paste it on the other PC.',
}

const linkRow = ({ copyButton, rowButton }: Kit, url: string, chosen: () => boolean, choose: () => void) =>
  div(
    { class: ['flex items-center gap-3 rounded-lg py-2 pr-2 pl-3', () => (chosen() ? 'bg-neutral-700' : 'hover:bg-neutral-700')] },
    rowButton(
      { title: 'Show QR code', class: 'gap-3 rounded-md', 'aria-pressed': () => String(chosen()), onClick: choose },
      span({ class: 'w-16 shrink-0 truncate text-xs text-neutral-500 sm:w-24' }, routeLabel(routeKind(url), url)),
      linkText(url),
    ),
    copyButton({ text: () => url, label: 'Copy' }),
  )

const qrPanel = ({ note }: Kit, link: string, kind: InviteFor) => div({ class: 'flex flex-col items-center gap-2' }, qrCode(link), note(qrText[kind]))

export const inviteBody = (kit: Kit, invite: PairInvite, listen: () => Promise<unknown>, kind: InviteFor = 'phone') => {
  const { note } = kit
  const reachable = invite.links.filter(link => !local(link))
  const shown = kind === 'pc' ? reachable : invite.links
  const chosen = sig(phoneLink(reachable) ?? '')
  const choose = (link: string) => {
    if (!local(link)) chosen.set(link)
  }
  return div(
    { class: 'flex flex-col gap-4' },
    reachable.length ? dynamicChild(chosen, link => qrPanel(kit, link, kind)) : listenBox(kit, listenText[kind], listen),
    shown.length
      ? div(
          { class: 'flex flex-col gap-1' },
          shown.map(link => linkRow(kit, link, () => chosen.get() === link, () => choose(link))),
        )
      : null,
    shown.length ? note('Works once, expires in 10 minutes. Anyone with it can use this sand.') : null,
  )
}
