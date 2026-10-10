import type { NavAsk } from '@sand/dom'
import { derive, div, input, keys, primaryAction, sig, span } from '@sand/dom'

export type AskSize = 'sm' | 'md'

const fields: Record<AskSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-12 px-3 text-base',
}

export const askView = (ask: NavAsk, done: () => void, size: AskSize) => {
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
    input({
      autocomplete: 'off',
      spellcheck: false,
      placeholder: ask.placeholder,
      'aria-label': ask.tip,
      class: ['w-full min-w-0 rounded-lg bg-neutral-900 text-neutral-100 outline-none ring-1 ring-neutral-700 focus:ring-accent-500', fields[size]],
      onInput: event => text.set((event.currentTarget as HTMLInputElement).value),
      onKeyDown: keys({ Enter: submit }),
      onMount: node => node.focus(),
    }),
    div(
      { class: 'flex items-center gap-2' },
      span(
        { class: () => ['min-w-0 flex-1 truncate text-xs', preview.get() ? 'text-accent-400' : 'text-neutral-500'] },
        () => preview.get() ?? (text.get().trim() ? `Try ${ask.placeholder}` : ''),
      ),
      primaryAction({ size: size === 'md' ? 'md' : 'sm', disabled: () => !preview.get(), onClick: submit }, ask.submit),
    ),
  )
}
