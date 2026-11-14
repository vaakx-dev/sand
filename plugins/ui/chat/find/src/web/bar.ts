import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, onTimeout, sig, span } from '@vaakx-dev/vrui'
import { queryLimit } from '../contract'
import type { Finder } from './finder'

interface BarParts {
  kit: Kit
  finder: Finder
  close(): void
}

const TYPING_PAUSE_MS = 150

const barLook = [
  'absolute inset-x-0 top-0 z-10 flex items-center gap-1 border-b border-neutral-800 bg-neutral-950 px-3 py-2',
  'md:inset-x-auto md:right-4 md:top-2 md:w-96 md:rounded-xl md:border-0 md:bg-neutral-900 md:p-1.5 md:shadow-xl md:ring-1 md:ring-neutral-800',
]

export const findBar = ({ kit, finder, close }: BarParts) => {
  const text = sig('')
  let field: HTMLInputElement | undefined
  let typing: (() => void) | undefined

  const search = () => {
    typing?.()
    typing = undefined
    void finder.find(text.get())
  }

  const typed = () => {
    typing?.()
    typing = onTimeout(search, TYPING_PAUSE_MS, view)
  }

  const press = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      return close()
    }
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (typing) return search()
    finder.step(event.shiftKey ? -1 : 1)
  }

  const waiting = kit.delayed(finder.searching)
  const counter = dynamicChild(waiting, shown => (shown ? kit.spinner('sm') : span(finder.label)))
  const none = () => !finder.count.get()

  const view: HTMLElement = div(
    { 'data-part': 'find-bar', role: 'search', class: barLook },
    kit.searchField({
      ref: node => (field = node),
      placeholder: 'Find in chat',
      'aria-label': 'Find in chat',
      maxLength: queryLimit,
      bindValue: text,
      onInput: typed,
      onKeyDown: press,
    }),
    span({ class: 'flex w-20 shrink-0 justify-center text-xs tabular-nums text-neutral-400', 'aria-live': 'polite' }, counter),
    kit.iconButton({ title: 'Previous match', 'aria-label': 'Previous match', disabled: none, onClick: () => finder.step(-1) }, kit.icon('up')),
    kit.iconButton({ title: 'Next match', 'aria-label': 'Next match', disabled: none, onClick: () => finder.step(1) }, kit.icon('arrowDown')),
    span({ class: 'hidden md:flex' }, kit.closeButton({ onClick: close })),
    span({ class: 'flex md:hidden' }, kit.quietButton({ onClick: close }, 'Done')),
  )

  const focus = () => {
    field?.focus()
    field?.select()
  }

  const show = (query: string) => {
    text.set(query)
    typing?.()
    typing = undefined
  }

  return { view, focus, show }
}

export type FindBar = ReturnType<typeof findBar>
