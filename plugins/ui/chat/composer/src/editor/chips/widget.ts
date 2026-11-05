import { StateEffect, type Text } from '@codemirror/state'
import { Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { contextLinks, type ContextLink, type ContextRecord } from '@sand/chats/contract'
import { collectScope, disposeAll, effect, type Disposer } from '@vaakx-dev/vrui'
import type { Records } from '../../records'

export type DrawChip = (link: ContextLink, record: ContextRecord) => HTMLElement

const owned = new WeakMap<HTMLElement, Disposer>()

const refresh = StateEffect.define<null>()

class ChipWidget extends WidgetType {
  constructor(
    readonly link: ContextLink,
    readonly record: ContextRecord,
    readonly draw: DrawChip,
  ) {
    super()
  }

  override eq(other: ChipWidget) {
    return other.record === this.record && other.link.label === this.link.label
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

const decorate = (doc: Text, records: Records, draw: DrawChip) =>
  Decoration.set(
    contextLinks(doc.toString()).flatMap(link => {
      const record = records.find(link)
      return record ? [Decoration.replace({ widget: new ChipWidget(link, record, draw) }).range(link.start, link.end)] : []
    }),
  )

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
        if (update.docChanged || refreshed(update)) this.decorations = decorate(update.state.doc, records, draw)
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
