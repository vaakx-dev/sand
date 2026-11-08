import type { Kit } from '@sand/ui-kit/contract'
import { oneLine } from '@sand/util'
import { div, dynamicChild, show, span, type Derive, type Sig } from '@vaakx-dev/vrui'
import { stepLine, stepMark } from './line'

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

export const thinkingStep = (kit: Kit, { streaming, text, open, toggle }: ThinkingProps) => {
  const parts = text.map(thought)
  const label = () => {
    const { title } = parts.get()
    const verb = streaming.get() ? 'Thinking' : 'Thought'
    return title ? `${verb} · ${title}` : verb
  }
  const expanded = () => open.get() && Boolean(parts.get().body)
  return stepLine(
    kit,
    {
      mark: dynamicChild(streaming, live => stepMark(kit, live ? 'running' : 'done')),
      label: dynamicChild(streaming, live => (live ? kit.shine(label) : span(label))),
      title: label,
      expanded,
      onToggle: toggle,
    },
    show(expanded, () => div({ class: 'mt-1 mb-2 pl-5 whitespace-pre-wrap wrap-anywhere text-neutral-500' }, () => parts.get().body)),
  )
}
