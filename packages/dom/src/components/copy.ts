import { dynamicChild, effect, onTimeout, sig } from '@vaakx-dev/vrui'
import { icon } from '../icons/lucide'
import { copyText } from '../integrations/clipboard'
import { iconButton, quietButton, type ButtonProps } from './button'

type CopyState = 'idle' | 'copied' | 'failed'

export type CopyProps = ButtonProps & { text: () => string; label?: string }

const resetAfter = 1500

const words: Record<CopyState, string> = { idle: '', copied: 'Copied', failed: 'Copy failed' }

export const copyButton = ({ text, label, ...props }: CopyProps) => {
  const state = sig<CopyState>('idle')
  const copies = sig(0)
  effect(() => {
    if (copies.get()) onTimeout(() => state.set('idle'), resetAfter)
  })
  const copy = async () => {
    const copied = await copyText(text())
    state.set(copied ? 'copied' : 'failed')
    copies.update(count => count + 1)
  }
  const glyph = (size: number) => dynamicChild(state, value => icon(value === 'copied' ? 'check' : 'copy', size))
  if (!label)
    return iconButton({ size: 'sm', title: () => words[state.get()] || 'Copy', 'aria-label': () => words[state.get()] || 'Copy', ...props, onClick: () => void copy() }, glyph(13))
  return quietButton({ size: 'sm', ...props, onClick: () => void copy() }, glyph(12), () => words[state.get()] || label)
}
