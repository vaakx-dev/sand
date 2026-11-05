import { Decoration, EditorView, WidgetType } from '@codemirror/view'
import type { Kit } from '@sand/ui-kit/contract'
import { collectScope, disposeAll, type Disposer } from '@vaakx-dev/vrui'
import { quoteSpans, remove, reply } from './field'
import { quoteRow } from './row'

const owned = new WeakMap<HTMLElement, Disposer>()

class QuoteWidget extends WidgetType {
  constructor(
    readonly kit: Kit,
    readonly text: string,
  ) {
    super()
  }

  override eq(other: QuoteWidget) {
    return other.text === this.text
  }

  toDOM(view: EditorView) {
    const at = () => view.posAtDOM(row)
    const { value: row, scope } = collectScope(() => quoteRow(this.kit, this.text, { reply: () => reply(view, at()), remove: () => remove(view, at()) }))
    owned.set(row, () => disposeAll(scope))
    return row
  }

  override destroy(row: HTMLElement) {
    owned.get(row)?.()
    owned.delete(row)
  }
}

export const quoteWidgets = (kit: Kit) =>
  EditorView.decorations.compute([quoteSpans], state =>
    Decoration.set(state.field(quoteSpans).map(span => Decoration.replace({ widget: new QuoteWidget(kit, span.run.text), block: true }).range(span.from, span.to))),
  )
