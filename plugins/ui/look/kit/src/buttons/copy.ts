import { copyText } from '../page/clipboard'
import { dynamicChild, effect, onTimeout, sig } from '@vaakx-dev/vrui'
import { icon } from '../icons/lucide'
import { iconButton, quietButton, type ToggleProps } from './button'

type CopyState = 'idle' | 'copied' | 'failed'

export type CopyProps = Omit<ToggleProps, 'active'> & { text: () => string; label?: string }

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
  const word = (fallback: string) => () => words[state.get()] || fallback
  const size = props.size === 'md' ? 'md' : 'sm'
  const px = size === 'md' ? 16 : 14
  if (label) return quietButton({ ...props, size, onClick: () => void copy() }, glyph(px), word(label))
  return iconButton({ title: word('Copy'), 'aria-label': word('Copy'), ...props, size, onClick: () => void copy() }, glyph(px))
}
