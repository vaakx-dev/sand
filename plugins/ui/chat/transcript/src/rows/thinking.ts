import type { Kit } from '@sand/ui-kit/contract'
import { oneLine } from '@sand/util'
import { div, dynamicChild, show, span, type Derive, type Sig } from '@vaakx-dev/vrui'

export interface ThinkingProps {
  streaming: Sig<boolean> | Derive<boolean>
  text: Sig<string> | Derive<string>
  open: Sig<boolean>
  toggle: () => void
}

const titled = /^\s*\*\*(.+?)\*\*[ \t]*(?:\n|$)/

const unmarked = (text: string) => text.replace(/\*\*|__/g, '')

const thought = (text: string) => {
  const found = titled.exec(text)
  if (found) return { title: oneLine(unmarked(found[1] ?? '')), body: unmarked(text.slice(found[0].length)).trim() }
  return { title: oneLine(unmarked(text)), body: unmarked(text).trim() }
}

export const thinkingCard = ({ icon, shine, toolBody, toolCard }: Kit, { streaming, text, open, toggle }: ThinkingProps) => {
  const parts = text.map(thought)
  const title = parts.map(value => value.title)
  const body = parts.map(value => value.body)
  return toolCard(
    {
      icon: icon('message', 'sm'),
      verb: () => (streaming.get() ? 'Thinking' : 'Thought'),
      target: dynamicChild(streaming, live => (live ? shine(title) : span(title))),
      targetClass: 'text-neutral-500',
      expanded: () => open.get() && Boolean(body.get()),
      onToggle: toggle,
    },
    show(
      () => open.get() && Boolean(body.get()),
      () => toolBody(div({ class: 'whitespace-pre-wrap text-neutral-400' }, body)),
    ),
  )
}
