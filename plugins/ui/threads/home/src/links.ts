import { threadRoute } from '@sand/chat/contract'
import { threadScheme } from '@sand/chats/contract'
import type { LinkScheme } from '@sand/markdown/contract'
import type { Shell, ShellRow } from '@sand/ui-shell/contract'
import { div } from '@vaakx-dev/vrui'

export interface LinkParts {
  shell: Shell
  row(thread: string): ShellRow | undefined
}

const textOf = (label: (Node | string)[]) => label.map(part => (typeof part === 'string' ? part : part.textContent)).join('')

const unknownRow = (thread: string, label: string): ShellRow => ({ id: thread, label, to: { kind: threadRoute, id: thread } })

export const threadLinks = ({ shell, row }: LinkParts): LinkScheme => ({
  scheme: threadScheme,
  render(thread, label) {
    const text = textOf(label)
    return div({ class: '-mx-2' }, shell.row(() => row(thread) ?? unknownRow(thread, text)))
  },
})
