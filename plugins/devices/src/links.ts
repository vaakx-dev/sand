import { copyButton, derive, div, dynamicChild, el, p, secondaryAction, show, sig, stop, span, type Child, type Derive } from '@sand/dom'
import { qrCode } from './qr'
import type { DeviceLinks } from './source'

const local = (url: string) => /^http:\/\/(127\.|localhost|\[::1\])/.test(url)

const note = (...children: Child[]) => p({ class: 'text-xs text-neutral-400' }, ...children)

const code = (text: string) => el('code', { class: 'rounded-md bg-neutral-700 px-1 font-mono text-xs text-neutral-300' }, text)

const shareRow = (share: () => Promise<void>) => {
  const busy = sig(false)
  const run = async () => {
    busy.set(true)
    await share()
    busy.set(false)
  }
  return div(
    { class: 'flex flex-col items-start gap-2' },
    note(
      'sand only listens on this computer, so your phone can’t reach it yet. Allow devices on your network until sand restarts, or always start it with ',
      code('sand --lan'),
      '.',
    ),
    secondaryAction({ disabled: busy, onClick: () => void run() }, 'Allow devices on my network'),
  )
}

const linkRow = (url: string, chosen: () => boolean, choose: () => void) =>
  div(
    {
      title: 'Show QR code',
      class: ['flex cursor-pointer items-center gap-3 rounded-lg py-2 pr-2 pl-3', () => (chosen() ? 'bg-neutral-700' : 'hover:bg-neutral-700')],
      onClick: choose,
    },
    span({ class: 'min-w-0 flex-1 truncate font-mono text-xs text-neutral-300' }, url),
    div({ onClick: stop }, copyButton({ text: () => url, label: 'Copy' })),
  )

const pairUrl = (link: string | undefined, code: string | undefined) => (link && code && !local(link) ? `${new URL(link).origin}/p/${code}` : '')

const pairPanel = (url: Derive<string>) =>
  div(
    { class: 'flex flex-col items-center gap-2' },
    dynamicChild(url, current => qrCode(current.toUpperCase())),
    span({ class: 'font-mono text-xs text-neutral-300' }, url),
    note('Scan with your phone’s camera. The code works once and expires in 10 minutes.'),
  )

const linksList = (links: string[], code: Derive<string | undefined>, share: () => Promise<void>) => {
  const remote = links.filter(link => !local(link))
  const chosen = sig(remote[0] ?? links[0])
  const url = derive(() => pairUrl(chosen.get(), code.get()))
  return div(
    { class: 'flex flex-col gap-3' },
    note('Anyone with the link can use this sand.'),
    remote.length ? null : shareRow(share),
    div(
      { class: 'flex flex-col gap-1' },
      links.map(link => linkRow(link, () => chosen.get() === link, () => chosen.set(link))),
    ),
    show(url.map(Boolean), () => pairPanel(url)),
  )
}

export const linksBody = ({ links, code, share }: DeviceLinks) =>
  show(links.map(list => list.length > 0), () => dynamicChild(links, list => linksList(list, code, share)))
