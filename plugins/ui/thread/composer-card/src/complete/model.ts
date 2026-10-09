import type { CompletionSource, Suggestion } from '../contract'
import { derive, listbox, sig, type KeyMap } from '@sand/dom'

export type Field = HTMLTextAreaElement | HTMLInputElement

const limit = 20

export type CompletionModel = ReturnType<typeof completionModel>

export const completionModel = (input: Field, sources: () => CompletionSource[], submit: () => void) => {
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
    const cursor = input.selectionStart ?? input.value.length
    input.value = input.value.slice(0, start) + text + input.value.slice(cursor)
    input.selectionStart = input.selectionEnd = start + text.length
    input.dispatchEvent(new Event('input'))
    input.focus()
  }

  const accept = (index: number, enter: boolean) => {
    const item = items.get()[index]
    const current = source.get()
    if (!item || !current) return
    insert(`${item.trigger ?? current.trigger}${item.value}${item.partial ? '' : ' '}`)
    if (item.partial) return
    close()
    if (enter && item.submit) submit()
  }

  const box = listbox({ count: () => items.get().length, choose: index => accept(index, true), wrap: true })

  const keyMap: KeyMap = {
    ...box.keyMap,
    Tab: () => accept(box.selected.get(), false),
    Escape: close,
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
    const typed = input.value.slice(0, input.selectionStart ?? input.value.length)
    for (const candidate of sources()) {
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

  return { items, hint, source, visible, box, keyMap, close, update }
}
