import { derive, div, keys, sig, span } from '@vaakx-dev/vrui'
import type { NavAsk } from '../../shell/nav/types'
import { primaryAction } from '../button'
import { textInput } from '../field'

export const askView = (ask: NavAsk, done: () => void, size: 'sm' | 'md') => {
  const text = sig('')
  const preview = derive(() => (text.get().trim() ? ask.preview(text.get()) : undefined))
  const submit = () => {
    const value = text.get()
    if (!ask.preview(value)) return
    done()
    void ask.run(value)
  }
  return div(
    { class: 'flex flex-col gap-2 p-1' },
    textInput(
      {
        placeholder: ask.placeholder,
        'aria-label': ask.tip,
        bindValue: text,
        onKeyDown: keys({ Enter: submit }),
        onMount: node => node.focus(),
      },
      size,
    ),
    div(
      { class: 'flex items-center gap-2' },
      span(
        { class: () => ['min-w-0 flex-1 truncate text-xs', preview.get() ? 'text-accent-400' : 'text-neutral-500'] },
        () => preview.get() ?? (text.get().trim() ? `Try ${ask.placeholder}` : ''),
      ),
      primaryAction({ size, disabled: () => !preview.get(), onClick: submit }, ask.submit),
    ),
  )
}
