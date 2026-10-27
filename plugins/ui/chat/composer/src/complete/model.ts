import type { IconName, Kit } from '@sand/ui-kit/contract'
import { derive, listen, sig, type KeyMap } from '@vaakx-dev/vrui'

export interface Suggestion {
  value: string
  description?: string
  partial?: boolean
  group?: string
  icon?: IconName
}

export interface CompletionSource {
  trigger: string
  label: string
  ready(): boolean
  pattern: RegExp
  items(query: string): Suggestion[] | Promise<Suggestion[]>
  hint?(query: string): string | undefined
}

const limit = 20

export const createCompletion = ({ listbox }: Kit, host: HTMLElement, active: () => HTMLTextAreaElement | undefined, sources: CompletionSource[]) => {
  const items = sig<Suggestion[]>([])
  const hint = sig<string | undefined>(undefined)
  const source = sig<CompletionSource | undefined>(undefined)
  const visible = derive(() => items.get().length > 0 || Boolean(hint.get()))
  let start = 0
  let request = 0

  const close = () => {
    request++
    items.set([])
    hint.set(undefined)
  }

  const insert = (text: string) => {
    const input = active()
    if (!input) return
    const cursor = input.selectionStart ?? input.value.length
    input.value = input.value.slice(0, start) + text + input.value.slice(cursor)
    input.selectionStart = input.selectionEnd = start + text.length
    input.dispatchEvent(new Event('input'))
    input.focus()
  }

  const accept = (index: number) => {
    const item = items.get()[index]
    const current = source.get()
    if (!item || !current) return
    insert(`${current.trigger}${item.value}${item.partial ? '' : ' '}`)
    if (!item.partial) close()
  }

  const box = listbox({ count: () => items.get().length, choose: accept, wrap: true })

  const keyMap: KeyMap = {
    ...box.keyMap,
    Tab: () => accept(box.selected.get()),
    Escape: close,
  }

  const keydown = (event: KeyboardEvent) => {
    const handler = keyMap[event.key]
    if (!handler || !visible.get()) return false
    if (event.key !== 'Escape' && !items.get().length) return false
    handler(event)
    return true
  }

  const show = (candidate: CompletionSource, query: string, typed: string, found: Suggestion[]) => {
    const shown = found.slice(0, limit)
    if (shown.length === 1 && shown[0]?.value === query) return close()
    start = typed.length - query.length - candidate.trigger.length
    source.set(candidate)
    hint.set(shown.length ? undefined : candidate.hint?.(query))
    items.set(shown)
    box.select(0)
  }

  const update = () => {
    const input = active()
    if (!input) return close()
    const typed = input.value.slice(0, input.selectionStart ?? input.value.length)
    for (const candidate of sources) {
      const query = candidate.pattern.exec(typed)?.[1]
      if (query === undefined) continue
      const ticket = ++request
      void Promise.resolve(candidate.items(query)).then(found => {
        if (ticket === request) show(candidate, query, typed, found)
      })
      return
    }
    close()
  }

  listen(host, 'input', update)
  listen(host, 'click', update)
  listen(host, 'focusout', close)

  return { items, hint, source, visible, box, close, keydown }
}

export type Completion = ReturnType<typeof createCompletion>
