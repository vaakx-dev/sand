import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, show, span, type Derive, type Sig } from '@vaakx-dev/vrui'
import { stepLine, stepMark } from './line'
import { thought } from '../thought'

export interface ThinkingProps {
  item: string
  streaming: Sig<boolean> | Derive<boolean>
  text: Sig<string> | Derive<string>
  open: Sig<boolean>
  toggle: () => void
}

export const thinkingStep = (kit: Kit, { item, streaming, text, open, toggle }: ThinkingProps) => {
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
      label: dynamicChild(streaming, live => span({ class: 'min-w-0 truncate' }, live ? kit.shine(label) : label)),
      title: label,
      expanded,
      onToggle: toggle,
      item,
    },
    show(expanded, () => div({ class: 'mt-1 mb-2 pl-5 whitespace-pre-wrap wrap-anywhere text-neutral-500' }, () => parts.get().body)),
  )
}
