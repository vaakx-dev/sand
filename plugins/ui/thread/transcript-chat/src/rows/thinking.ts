import { oneLine } from '@sand/kit'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, show, span, type Derive, type Sig } from '@vaakx-dev/vrui'

export interface ThinkingProps {
  streaming: Sig<boolean> | Derive<boolean>
  text: Sig<string> | Derive<string>
  open: Sig<boolean>
  toggle: () => void
}

export const thinkingCard = ({ icon, shine, toolBody, toolCard }: Kit, { streaming, text, open, toggle }: ThinkingProps) => {
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
