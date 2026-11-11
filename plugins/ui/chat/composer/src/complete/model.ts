import type { EditorView } from '@codemirror/view'
import { contextLink } from '@sand/chats/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, sig, type KeyMap } from '@vaakx-dev/vrui'
import type { TriggerItem } from '../contract'
import { placeLink } from '../editor/chips/place'
import type { Records } from '../records'
import { typedTrigger } from './detect'
import { firstItem, merged, noMatch, type Group, type Suggestion } from './merge'
import type { Source } from './registry'

const perGroup = 10
const limit = 20

interface Target {
  view: EditorView
  from: number
}

interface Lookup {
  at: Target
  triggers: Source[]
  groups: Group[]
  acceptWhenReady: boolean
}

const itemsOf = (trigger: Source, query: string): Promise<TriggerItem[]> =>
  Promise.resolve()
    .then(() => trigger.items(query))
    .catch(() => [])

const typedText = ({ view, from }: Target) => view.state.sliceDoc(from, view.state.selection.main.head)

const confirms = (event: KeyboardEvent) => !event.shiftKey && (event.key === 'Enter' || event.key === 'Tab')

export const createCompletion = ({ listbox }: Kit, triggers: () => Source[], records: Records) => {
  const items = sig<Suggestion[]>([])
  const hint = sig<string | undefined>(undefined)
  const visible = derive(() => items.get().length > 0 || Boolean(hint.get()))
  let lookup: Lookup | undefined

  const close = () => {
    lookup = undefined
    items.set([])
    hint.set(undefined)
  }

  const replace = ({ view, from }: Target, text: string) => {
    view.dispatch({ changes: { from, to: view.state.selection.main.head, insert: text }, selection: { anchor: from + text.length }, userEvent: 'input.complete' })
    view.focus()
  }

  const accept = (index: number) => {
    const chosen = items.get()[index]
    if (!chosen || !lookup) return
    const { at } = lookup
    const result = chosen.trigger.accept(chosen.item)
    if (typeof result === 'string') replace(at, result)
    else {
      records.add([result])
      placeLink(at.view, contextLink(result), at.from, at.view.state.selection.main.head)
    }
    if (!chosen.item.partial) close()
    chosen.trigger.run?.(chosen.item)
  }

  const box = listbox({ count: () => items.get().length, choose: accept, wrap: true })

  const keyMap: KeyMap = {
    ...box.keyMap,
    Tab: () => accept(box.selected.get()),
    Escape: close,
  }

  const keydown = (event: KeyboardEvent) => {
    if (event.isComposing || !lookup) return false
    if (confirms(event) && firstItem(lookup.groups) === 'loading') {
      lookup.acceptWhenReady = true
      return true
    }
    const handler = keyMap[event.key]
    if (!handler || (event.key !== 'Escape' && !items.get().length)) return false
    handler(event)
    return true
  }

  const settled = (found: Suggestion[], at: Target) => {
    const [only] = found
    return found.length === 1 && only?.trigger.accept(only.item) === typedText(at)
  }

  const arrived = (current: Lookup) => {
    const found = merged(
      current.triggers.flatMap((trigger, index) => {
        const group = current.groups[index]
        return group ? [{ trigger, items: group }] : []
      }),
      perGroup,
      limit,
    )
    const done = current.groups.every(Boolean)
    if (done && settled(found, current.at)) return close()
    hint.set(done && !found.length ? noMatch(current.triggers) : undefined)
    items.set(found)
    box.select(0)
    const first = firstItem(current.groups)
    if (!current.acceptWhenReady || first === 'loading') return
    current.acceptWhenReady = false
    if (first === 'found') accept(0)
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
    const current: Lookup = { at: { view, from: found.from }, triggers: matching, groups: matching.map(() => undefined), acceptWhenReady: false }
    lookup = current
    matching.forEach((trigger, index) => {
      void itemsOf(trigger, found.query).then(group => {
        if (lookup !== current) return
        current.groups[index] = group
        arrived(current)
      })
    })
  }

  return { items, hint, visible, box, close, update, keydown }
}

export type Completion = ReturnType<typeof createCompletion>
