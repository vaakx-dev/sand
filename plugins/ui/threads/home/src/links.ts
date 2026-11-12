import { threadRoute, threadScheme } from '@sand/chat/contract'
import type { LinkScheme } from '@sand/markdown/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Shell, ShellRow } from '@sand/ui-shell/contract'
import { div, dynamicChild, span } from '@vaakx-dev/vrui'

export interface LinkParts {
  kit: Kit
  shell: Shell
  row(thread: string): ShellRow | undefined
  open(thread: string): void
}

const textOf = (label: (Node | string)[]) => label.map(part => (typeof part === 'string' ? part : part.textContent)).join('')

const unknownRow = (thread: string, label: string): ShellRow => ({ id: thread, label, to: { kind: threadRoute, id: thread } })

const block = ({ shell, row }: LinkParts, thread: string, label: string) => div({ class: '-mx-2' }, shell.row(() => row(thread) ?? unknownRow(thread, label)))

const stateMark = ({ kit, row }: LinkParts, thread: string) =>
  dynamicChild(
    () => row(thread)?.status,
    status => (status ? kit.statusIcon(status) : kit.stateIcon('idle')),
  )

const inline = (parts: LinkParts, thread: string, label: string) =>
  parts.kit.plainButton(
    { class: 'inline-flex max-w-full items-center gap-1 underline hover:text-neutral-400', onClick: () => parts.open(thread) },
    stateMark(parts, thread),
    span({ class: 'min-w-0 truncate' }, label),
  )

export const threadLinks = (parts: LinkParts): LinkScheme => ({
  scheme: threadScheme,
  render(thread, label, place) {
    const text = textOf(label)
    return place === 'block' ? block(parts, thread, text) : inline(parts, thread, text)
  },
})
