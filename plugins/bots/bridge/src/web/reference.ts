import { threadScheme, type ThreadLive, type ThreadView } from '@sand/chat/contract'
import type { LinkScheme } from '@sand/markdown/contract'
import type { Kit, WorkState } from '@sand/ui-kit/contract'
import type { Status } from '@sand/ui-shell/contract'
import { ago } from '@sand/util'
import { clock, div, dynamicChild, sig, span } from '@vaakx-dev/vrui'

type Live = () => ThreadLive | undefined

const looks: Record<Status, WorkState> = { waiting: 'waiting', ready: 'ready', merging: 'running', running: 'running', merged: 'settled', done: 'settled' }

const urgent = new Set<Status>(['waiting', 'ready', 'merging'])

const textOf = (label: (Node | string)[]) => label.map(part => (typeof part === 'string' ? part : part.textContent)).join('')

const standsAlone = (link: Node) => {
  const paragraph = link.parentElement
  return paragraph?.tagName === 'P' && paragraph.textContent?.trim() === link.textContent?.trim()
}

const stateMark = (kit: Kit, live: Live) =>
  dynamicChild(
    () => live()?.status,
    status => (status ? kit.stateIcon(looks[status], 'sm', urgent.has(status)) : kit.stateIcon('idle')),
  )

const age = (live: Live) => {
  const now = clock(60_000)
  return span({ class: 'tabular-nums' }, () => {
    now.get()
    return ago(live()?.at)
  })
}

const row = (kit: Kit, live: Live, label: string, open: () => void) =>
  div(
    { class: '-mx-2' },
    kit.listRow({
      lead: stateMark(kit, live),
      title: () => live()?.title ?? label,
      meta: () => live()?.note ?? '',
      trail: age(live),
      touch: true,
      onClick: open,
    }),
  )

const inline = (kit: Kit, live: Live, label: string, open: () => void) =>
  kit.plainButton(
    { class: 'inline-flex max-w-full items-center gap-1 underline hover:text-neutral-400', onClick: open },
    stateMark(kit, live),
    span({ class: 'min-w-0 truncate' }, label),
  )

export const threadLinks = (kit: Kit, view: ThreadView): LinkScheme => ({
  scheme: threadScheme,
  render(thread, label) {
    const live = () => view.live(thread)
    const text = textOf(label)
    const open = () => view.open(thread)
    const alone = sig(false)
    return dynamicChild(
      alone,
      block => (block ? row(kit, live, text, open) : inline(kit, live, text, open)),
      span({ class: 'contents', onMount: link => void alone.set(standsAlone(link)) }),
    )
  },
})
