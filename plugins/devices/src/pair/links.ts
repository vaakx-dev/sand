import { copyButton, div, dynamicChild, p, sig, stop, span, type Child } from '@sand/dom'
import { routeKind, routeLabel } from '@sand/kit'
import type { PairInvite } from '@sand/protocol'
import { linkText } from '../components'
import { listenBox } from './listen'
import { qrCode } from './qr'

export type InviteFor = 'phone' | 'pc'

const local = (url: string) => routeKind(url) === 'local'

const secureTailscale = (url: string) => routeKind(url) === 'tailscale' && url.startsWith('https:')

const phoneLink = (links: string[]) => {
  const preferred = location.protocol === 'https:' ? [secureTailscale, (url: string) => routeKind(url) === 'lan'] : [(url: string) => routeKind(url) === 'lan']
  for (const match of preferred) {
    const link = links.find(match)
    if (link) return link
  }
  return links[0]
}

const note = (...children: Child[]) => p({ class: 'text-xs text-neutral-400' }, ...children)

const listenText: Record<InviteFor, string> = {
  phone: 'sand only listens on this computer, so phones and other PCs can’t reach it. Turn on network listening to pair them over your home wifi.',
  pc: 'sand only listens on this computer, so the other PC can’t reach it. Turn on network listening to connect over your home wifi.',
}

const qrText: Record<InviteFor, string> = {
  phone: 'Scan with your phone’s camera, or open the link on the other device.',
  pc: 'Copy the link below and paste it on the other PC.',
}

const linkRow = (url: string, chosen: () => boolean, choose: () => void) =>
  div(
    {
      title: 'Show QR code',
      class: ['flex cursor-pointer items-center gap-3 rounded-lg py-2 pr-2 pl-3', () => (chosen() ? 'bg-neutral-700' : 'hover:bg-neutral-700')],
      onClick: choose,
    },
    span({ class: 'w-16 shrink-0 truncate text-xs text-neutral-500 sm:w-24' }, routeLabel(routeKind(url), url)),
    linkText(url),
    div({ onClick: stop }, copyButton({ text: () => url, label: 'Copy' })),
  )

const qrPanel = (link: string, kind: InviteFor) =>
  div({ class: 'flex flex-col items-center gap-2' }, qrCode(link), note(qrText[kind]))

export const inviteBody = (invite: PairInvite, listen: () => Promise<void>, kind: InviteFor = 'phone') => {
  const reachable = invite.links.filter(link => !local(link))
  const shown = kind === 'pc' ? reachable : invite.links
  const chosen = sig(phoneLink(reachable) ?? '')
  return div(
    { class: 'flex flex-col gap-4' },
    reachable.length ? dynamicChild(chosen, link => qrPanel(link, kind)) : listenBox(listenText[kind], listen),
    shown.length
      ? div(
          { class: 'flex flex-col gap-1' },
          shown.map(link =>
            linkRow(
              link,
              () => chosen.get() === link,
              () => {
                if (!local(link)) chosen.set(link)
              },
            ),
          ),
        )
      : null,
    shown.length ? note('Works once, expires in 10 minutes. Anyone with it can use this sand.') : null,
  )
}
