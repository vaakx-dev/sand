import { history, historyKeymap, insertNewline, standardKeymap } from '@codemirror/commands'
import { EditorState, Prec, Transaction } from '@codemirror/state'
import { EditorView, keymap, placeholder as placeholderText, type ViewUpdate } from '@codemirror/view'
import { quoteRuns } from '@sand/util'
import { chipClipboard } from './chips/clipboard'
import { placeLink } from './chips/place'
import { chipWidgets } from './chips/widget'
import { quote } from './quotes/commands'
import { added, quoteState } from './quotes/field'
import { quoteKeys } from './quotes/keys'
import { quoteWidgets } from './quotes/widget'
import { theme } from './theme'
import type { EditorKeys, EditorParts } from './view'

const attributes = EditorView.contentAttributes.of({ 'aria-label': 'Message', enterkeyhint: 'enter', autocapitalize: 'sentences', autocorrect: 'on', spellcheck: 'true' })

const edited = (update: ViewUpdate) => update.transactions.some(tr => tr.isUserEvent('input') || tr.isUserEvent('delete'))

const completionWatch = ({ completion }: EditorParts) => [
  EditorView.updateListener.of(change => {
    if (!change.docChanged && !change.selectionSet && !change.focusChanged) return
    if (change.view.hasFocus) completion.update(change.view)
    else completion.close()
  }),
  Prec.highest(EditorView.domEventHandlers({ keydown: completion.keydown })),
]

const keyHandlers = ({ keydown, keyup, paste, drop }: EditorKeys) => Prec.high(EditorView.domEventHandlers({ keydown, keyup, paste, drop }))

const extensionsOf = (parts: EditorParts) => {
  const hint = parts.hint()
  return [
    history(),
    keymap.of([{ key: 'Enter', run: insertNewline, shift: insertNewline }, ...standardKeymap, ...historyKeymap]),
    EditorView.lineWrapping,
    attributes,
    theme,
    placeholderText(() => hint),
    quoteState,
    quoteKeys,
    quoteWidgets(parts.kit),
    EditorView.updateListener.of(update => {
      if (update.docChanged) parts.text.set(update.state.doc.toString())
      if (edited(update)) parts.typed()
    }),
    completionWatch(parts),
    chipWidgets(parts.records, parts.chip),
    chipClipboard(parts.records),
    keyHandlers(parts.keys),
  ]
}

export const mountEditor = (parts: EditorParts, doc: string) => {
  const extensions = extensionsOf(parts)
  const view = new EditorView({ state: EditorState.create({ doc, extensions, selection: { anchor: doc.length } }) })

  const show = (value: string) => {
    if (value === view.state.doc.toString()) return
    view.setState(EditorState.create({ doc: value, extensions }))
    view.dispatch({ selection: { anchor: value.length }, annotations: Transaction.addToHistory.of(false) })
  }

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

  const reference = (link: string) => {
    const { from, to } = view.state.selection.main
    placeLink(view, link, from, to)
  }

  return {
    dom: view.dom,
    show,
    focus: () => view.focus(),
    focusEnd,
    replace,
    insert: (value: string) => view.dispatch(view.state.replaceSelection(value), { scrollIntoView: true, userEvent: 'input' }),
    quote: (value: string) => quote(view, value),
    reference,
    destroy: () => view.destroy(),
  }
}

export type Mounted = ReturnType<typeof mountEditor>
