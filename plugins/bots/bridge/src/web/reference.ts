import { threadScheme, type ThreadLive, type ThreadView } from '@sand/chat/contract'
import type { LinkScheme } from '@sand/markdown/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, sig, span } from '@vaakx-dev/vrui'

type Live = () => ThreadLive | undefined

const textOf = (label: (Node | string)[]) => label.map(part => (typeof part === 'string' ? part : part.textContent)).join('')

const standsAlone = (link: Node) => {
  const paragraph = link.parentElement
  return paragraph?.tagName === 'P' && paragraph.textContent?.trim() === link.textContent?.trim()
}

const stateMark = (kit: Kit, live: Live) =>
  dynamicChild(
    () => live()?.status,
    status => (status ? kit.statusIcon(status) : kit.stateIcon('idle')),
  )

const row = (kit: Kit, live: Live, label: string, open: () => void) =>
  div(
    { class: '-mx-2' },
    kit.workRow(
      { onClick: open },
      dynamicChild(live, shown => kit.workRowBody({ title: shown?.title ?? label, detail: shown?.note, status: shown?.status, at: shown?.at })),
    ),
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
