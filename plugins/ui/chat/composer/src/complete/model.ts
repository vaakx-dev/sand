import { Prec } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import type { IconName, Kit } from '@sand/ui-kit/contract'
import { derive, sig, type KeyMap } from '@vaakx-dev/vrui'

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

interface Target {
  view: EditorView
  from: number
}

export const createCompletion = ({ listbox }: Kit, sources: CompletionSource[]) => {
  const items = sig<Suggestion[]>([])
  const hint = sig<string | undefined>(undefined)
  const source = sig<CompletionSource | undefined>(undefined)
  const visible = derive(() => items.get().length > 0 || Boolean(hint.get()))
  let target: Target | undefined
  let request = 0

  const close = () => {
    request++
    items.set([])
    hint.set(undefined)
  }

  const insert = (text: string) => {
    if (!target) return
    const { view, from } = target
    view.dispatch({ changes: { from, to: view.state.selection.main.head, insert: text }, selection: { anchor: from + text.length }, userEvent: 'input.complete' })
    view.focus()
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
    if (event.isComposing || !handler || !visible.get()) return false
    if (event.key !== 'Escape' && !items.get().length) return false
    handler(event)
    return true
  }

  const show = (found: Suggestion[], candidate: CompletionSource, query: string, at: Target) => {
    const shown = found.slice(0, limit)
    if (shown.length === 1 && shown[0]?.value === query) return close()
    target = at
    source.set(candidate)
    hint.set(shown.length ? undefined : candidate.hint?.(query))
    items.set(shown)
    box.select(0)
  }

  const update = (view: EditorView) => {
    const { head } = view.state.selection.main
    const line = view.state.doc.lineAt(head)
    const typed = line.text.slice(0, head - line.from)
    for (const candidate of sources) {
      const query = candidate.pattern.exec(typed)?.[1]
      if (query === undefined) continue
      const ticket = ++request
      const at = { view, from: head - query.length - candidate.trigger.length }
      void Promise.resolve(candidate.items(query)).then(found => {
        if (ticket === request) show(found, candidate, query, at)
      })
      return
    }
    close()
  }

  const extension = [
    EditorView.updateListener.of(change => {
      if (!change.docChanged && !change.selectionSet && !change.focusChanged) return
      if (change.view.hasFocus) update(change.view)
      else close()
    }),
    Prec.highest(EditorView.domEventHandlers({ keydown })),
  ]

  return { items, hint, source, visible, box, close, extension }
}

export type Completion = ReturnType<typeof createCompletion>
