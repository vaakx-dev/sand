import { Prec } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { contextLink } from '@sand/chats/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, sig, type KeyMap } from '@vaakx-dev/vrui'
import type { Trigger } from '../contract'
import { placeLink } from '../editor/chips/place'
import type { Records } from '../records'
import { typedTrigger } from './detect'
import { merged, noMatch, type Found, type Suggestion } from './merge'

const perGroup = 10
const limit = 20

interface Target {
  view: EditorView
  from: number
  query: string
}

const lookup = (trigger: Trigger, query: string): Promise<Found> =>
  Promise.resolve()
    .then(() => trigger.items(query))
    .then(
      items => ({ trigger, items }),
      () => ({ trigger, items: [] }),
    )

export const createCompletion = ({ listbox }: Kit, triggers: () => Trigger[], records: Records) => {
  const items = sig<Suggestion[]>([])
  const hint = sig<string | undefined>(undefined)
  const visible = derive(() => items.get().length > 0 || Boolean(hint.get()))
  let target: Target | undefined
  let request = 0

  const close = () => {
    request++
    items.set([])
    hint.set(undefined)
  }

  const replace = (text: string) => {
    if (!target) return
    const { view, from } = target
    view.dispatch({ changes: { from, to: view.state.selection.main.head, insert: text }, selection: { anchor: from + text.length }, userEvent: 'input.complete' })
    view.focus()
  }

  const accept = (index: number) => {
    const chosen = items.get()[index]
    if (!chosen || !target) return
    const result = chosen.trigger.accept(chosen.item)
    if (typeof result === 'string') replace(result)
    else {
      records.add([result])
      placeLink(target.view, contextLink(result), target.from, target.view.state.selection.main.head)
    }
    if (!chosen.item.partial) close()
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

  const show = (found: Suggestion[], matching: Trigger[], at: Target) => {
    if (found.length === 1 && found[0]?.item.label === at.query) return close()
    target = at
    hint.set(found.length ? undefined : noMatch(matching))
    items.set(found)
    box.select(0)
  }

  const update = (view: EditorView) => {
    const { head } = view.state.selection.main
    const all = triggers()
    const found = typedTrigger(
      view.state.sliceDoc(0, head),
      all.map(trigger => trigger.char),
    )
    if (!found) return close()
    const matching = all.filter(trigger => trigger.char === found.char)
    const ticket = ++request
    const at = { view, from: found.from, query: found.query }
    void Promise.all(matching.map(trigger => lookup(trigger, found.query))).then(groups => {
      if (ticket === request) show(merged(groups, perGroup, limit), matching, at)
    })
  }

  const extension = [
    EditorView.updateListener.of(change => {
      if (!change.docChanged && !change.selectionSet && !change.focusChanged) return
      if (change.view.hasFocus) update(change.view)
      else close()
    }),
    Prec.highest(EditorView.domEventHandlers({ keydown })),
  ]

  return { items, hint, visible, box, close, extension }
}

export type Completion = ReturnType<typeof createCompletion>
