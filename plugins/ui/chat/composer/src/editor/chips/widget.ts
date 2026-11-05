import { StateEffect, type Text } from '@codemirror/state'
import { Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { contextLinks, type ContextRecord } from '@sand/chats/contract'
import type { ChipLink } from '@sand/context/contract'
import { collectScope, disposeAll, effect, type Disposer } from '@vaakx-dev/vrui'
import type { Records } from '../../records'

export type DrawChip = (link: ChipLink, record?: ContextRecord) => HTMLElement

const owned = new WeakMap<HTMLElement, Disposer>()

const refresh = StateEffect.define<null>()

class ChipWidget extends WidgetType {
  constructor(
    readonly link: ChipLink,
    readonly record: ContextRecord | undefined,
    readonly draw: DrawChip,
  ) {
    super()
  }

  override eq(other: ChipWidget) {
    const { kind, id, label } = other.link
    return other.record === this.record && kind === this.link.kind && id === this.link.id && label === this.link.label
  }

  toDOM() {
    const { value: node, scope } = collectScope(() => this.draw(this.link, this.record))
    owned.set(node, () => disposeAll(scope))
    return node
  }

  override destroy(node: HTMLElement) {
    owned.get(node)?.()
    owned.delete(node)
  }
}

const chipsIn = (doc: Text, from: number, to: number, records: Records, draw: DrawChip) =>
  contextLinks(doc.sliceString(from, to)).map(link => Decoration.replace({ widget: new ChipWidget(link, records.find(link), draw) }).range(from + link.start, from + link.end))

const decorate = (doc: Text, records: Records, draw: DrawChip) => Decoration.set(chipsIn(doc, 0, doc.length, records, draw))

const redecorate = (chips: DecorationSet, { changes, state }: ViewUpdate, records: Records, draw: DrawChip) => {
  let next = chips.map(changes)
  changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
    const from = state.doc.lineAt(fromB).from
    const to = state.doc.lineAt(toB).to
    next = next.update({ filterFrom: from, filterTo: to, filter: () => false, add: chipsIn(state.doc, from, to, records, draw) })
  })
  return next
}

const refreshed = (update: ViewUpdate) => update.transactions.some(tr => tr.effects.some(effect => effect.is(refresh)))

const followRecords = (view: EditorView, records: Records) => {
  let started = false
  return collectScope(() =>
    effect(() => {
      records.list.get()
      if (started) view.dispatch({ effects: refresh.of(null) })
      started = true
    }),
  ).scope
}

export const chipWidgets = (records: Records, draw: DrawChip) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      following: Disposer[]

      constructor(view: EditorView) {
        this.decorations = decorate(view.state.doc, records, draw)
        this.following = followRecords(view, records)
      }

      update(update: ViewUpdate) {
        if (refreshed(update)) this.decorations = decorate(update.state.doc, records, draw)
        else if (update.docChanged) this.decorations = redecorate(this.decorations, update, records, draw)
      }

      destroy() {
        disposeAll(this.following)
      }
    },
    {
      decorations: chips => chips.decorations,
      provide: plugin => EditorView.atomicRanges.of(view => view.plugin(plugin)?.decorations ?? Decoration.none),
    },
  )
