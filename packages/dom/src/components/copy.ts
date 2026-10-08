import { dynamicChild, onTimeout, sig, type Props } from '@vaakx-dev/vrui'
import { icon } from '../icons/lucide'
import { copyText } from '../integrations/clipboard'
import { iconButton, quietButton } from './button'

type CopyState = 'idle' | 'copied' | 'failed'

export type CopyProps = Props<HTMLButtonElement> & { text: () => string; label?: string }

const resetAfter = 1500

const words: Record<CopyState, string> = { idle: '', copied: 'Copied', failed: 'Copy failed' }

export const copyButton = ({ text, label, ...props }: CopyProps) => {
  const state = sig<CopyState>('idle')
  let cancel: (() => void) | undefined
  const copy = async () => {
    const copied = await copyText(text())
    cancel?.()
    state.set(copied ? 'copied' : 'failed')
    cancel = onTimeout(() => state.set('idle'), resetAfter)
  }
  const glyph = (size: number) => dynamicChild(state, value => icon(value === 'copied' ? 'check' : 'copy', size))
  if (!label)
    return iconButton({ size: 'sm', title: () => words[state.get()] || 'Copy', 'aria-label': 'Copy', ...props, onClick: () => void copy() }, glyph(13))
  return quietButton({ size: 'sm', ...props, onClick: () => void copy() }, glyph(12), () => words[state.get()] || label)
}
