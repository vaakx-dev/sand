import { history, historyKeymap, insertNewline, standardKeymap } from '@codemirror/commands'
import { EditorState, Transaction, type Extension } from '@codemirror/state'
import { EditorView, keymap, placeholder as placeholderText } from '@codemirror/view'
import type { Kit } from '@sand/ui-kit/contract'
import { quoteRuns } from '@sand/util'
import { div, effect, scoped, span, type Sig } from '@vaakx-dev/vrui'
import { placeLink } from './chips/place'
import { quote } from './quotes/commands'
import { added, quoteState } from './quotes/field'
import { quoteKeys } from './quotes/keys'
import { quoteWidgets } from './quotes/widget'
import { theme } from './theme'

export interface EditorOptions {
  placeholder: () => string
  extensions: Extension[]
}

const attributes = EditorView.contentAttributes.of({ 'aria-label': 'Message', enterkeyhint: 'enter', autocapitalize: 'sentences', autocorrect: 'on', spellcheck: 'true' })

export const createEditor = (kit: Kit, text: Sig<string>, options: EditorOptions) => {
  const hint = span(options.placeholder)
  const extensions = [
    history(),
    keymap.of([{ key: 'Enter', run: insertNewline, shift: insertNewline }, ...standardKeymap, ...historyKeymap]),
    EditorView.lineWrapping,
    attributes,
    theme,
    placeholderText(() => hint),
    quoteState,
    quoteKeys,
    quoteWidgets(kit),
    EditorView.updateListener.of(update => {
      if (update.docChanged) text.set(update.state.doc.toString())
    }),
    options.extensions,
  ]
  const view = new EditorView({ state: EditorState.create({ extensions }) })
  scoped(() => view.destroy())

  effect(() => {
    const value = text.get()
    if (value === view.state.doc.toString()) return
    view.setState(EditorState.create({ doc: value, extensions }))
    view.dispatch({ selection: { anchor: value.length }, annotations: Transaction.addToHistory.of(false) })
  })

  const focusEnd = () => {
    view.dispatch({ selection: { anchor: view.state.doc.length }, scrollIntoView: true })
    view.focus()
  }

  const replace = (value: string) =>
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
      selection: { anchor: value.length },
      effects: quoteRuns(value).map(run => added.of(run)),
      scrollIntoView: true,
    })

  return {
    node: div({ class: 'text-neutral-100 leading-relaxed' }, view.dom),
    focus: () => view.focus(),
    focusEnd,
    replace,
    insert: (value: string) => view.dispatch(view.state.replaceSelection(value), { scrollIntoView: true, userEvent: 'input' }),
    quote: (value: string) => quote(view, value),
    reference: (link: string) => placeLink(view, link, view.state.selection.main.from, view.state.selection.main.to),
  }
}
