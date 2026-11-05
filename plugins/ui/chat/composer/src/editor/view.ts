import { history, historyKeymap, insertNewline, standardKeymap } from '@codemirror/commands'
import { EditorState, type Extension } from '@codemirror/state'
import { EditorView, keymap, placeholder as placeholderText } from '@codemirror/view'
import type { Kit } from '@sand/ui-kit/contract'
import { div, effect, scoped, span, untrack, type Sig } from '@vaakx-dev/vrui'
import { quote, quoteState } from './quotes/field'
import { quoteWidgets } from './quotes/widget'
import { theme } from './theme'

export interface EditorOptions {
  placeholder: () => string
  extensions: Extension[]
}

const typing = EditorView.contentAttributes.of({ 'aria-label': 'Message', enterkeyhint: 'enter', autocapitalize: 'sentences', autocorrect: 'on', spellcheck: 'true' })

export const createEditor = (kit: Kit, text: Sig<string>, options: EditorOptions) => {
  const extensions = [
    history(),
    keymap.of([{ key: 'Enter', run: insertNewline, shift: insertNewline }, ...standardKeymap, ...historyKeymap]),
    EditorView.lineWrapping,
    typing,
    theme,
    placeholderText(() => span(options.placeholder)),
    quoteState,
    quoteWidgets(kit),
    EditorView.updateListener.of(update => {
      if (update.docChanged) text.set(update.state.doc.toString())
    }),
    options.extensions,
  ]
  const load = (doc: string) => EditorState.create({ doc, extensions }).update({ selection: { anchor: doc.length } }).state
  const view = new EditorView({ state: load(untrack(() => text.get())) })
  scoped(() => view.destroy())

  effect(() => {
    const value = text.get()
    if (value !== view.state.doc.toString()) view.setState(load(value))
  })

  const focusEnd = () => {
    view.dispatch({ selection: { anchor: view.state.doc.length }, scrollIntoView: true })
    view.focus()
  }

  return {
    node: div({ class: 'text-base text-neutral-100 md:text-sm leading-relaxed' }, view.dom),
    focus: () => view.focus(),
    focusEnd,
    insert: (value: string) => view.dispatch(view.state.replaceSelection(value), { scrollIntoView: true, userEvent: 'input' }),
    quote: (value: string) => quote(view, value),
  }
}
