import { div, dynamicChild, icon, shine, show, span, toolBody, toolCard, type Derive, type Sig } from '@sand/dom'
import { oneLine } from '@sand/kit'

export interface ThinkingProps {
  streaming: Sig<boolean> | Derive<boolean>
  text: Sig<string> | Derive<string>
  open: Sig<boolean>
  toggle: () => void
}

export const thinkingCard = ({ streaming, text, open, toggle }: ThinkingProps) => {
  const line = text.map(oneLine)
  return toolCard(
    {
      icon: icon('message', 14),
      verb: () => (streaming.get() ? 'Thinking' : 'Thought'),
      target: dynamicChild(streaming, live => (live ? shine(line) : span(line))),
      targetClass: 'italic text-neutral-500',
      onToggle: toggle,
    },
    show(open, () => toolBody(div({ class: 'whitespace-pre-wrap text-neutral-400' }, text))),
  )
}
