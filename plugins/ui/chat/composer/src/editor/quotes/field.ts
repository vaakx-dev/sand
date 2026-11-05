import { invertedEffects } from '@codemirror/commands'
import { EditorState, Prec, StateEffect, StateField, type Transaction } from '@codemirror/state'
import { Decoration, EditorView, keymap } from '@codemirror/view'
import { quoteRuns, type QuoteRun } from '@sand/util'
import { beside, edges, lineBeside, mapRun, quoting, spans, unquoting, type Edit, type Span } from './runs'

const added = StateEffect.define<QuoteRun>({ map: (run, changes) => mapRun(run, changes) })

const runsOf = (spans: readonly Span[]) => spans.map(span => span.run)

const updated = (value: Span[], tr: Transaction) => {
  const fresh = tr.effects.filter(effect => effect.is(added)).map(effect => effect.value)
  if (!tr.docChanged && !fresh.length) return value
  const kept = runsOf(value).flatMap(run => mapRun(run, tr.changes) ?? [])
  return spans(tr.state.doc, [...kept, ...fresh].sort((a, b) => a.from - b.from))
}

export const quoteSpans = StateField.define<Span[]>({
  create: state => spans(state.doc, quoteRuns(state.doc.toString())),
  update: updated,
})

const atom = Decoration.mark({})

const atomic = EditorView.atomicRanges.of(({ state }) =>
  Decoration.set(
    state.field(quoteSpans).map(span => {
      const { from, to } = edges(state.doc, span)
      return atom.range(from, to)
    }),
  ),
)

const restore = invertedEffects.of(tr =>
  runsOf(tr.startState.field(quoteSpans))
    .filter(run => !mapRun(run, tr.changes))
    .map(run => added.of(run)),
)

const toSpec = ({ changes, caret }: Edit) => ({ changes, selection: { anchor: caret } })

const keepCaretOnLines = EditorState.transactionFilter.of(tr => {
  const { main } = tr.newSelection
  if (!main.empty || (!tr.docChanged && !tr.selection)) return tr
  const doc = tr.newDoc
  const stranded = tr.state.field(quoteSpans).find(span => (main.head === 0 && !lineBeside(doc, span, false)) || (main.head === doc.length && !lineBeside(doc, span, true)))
  if (!stranded) return tr
  const forward = main.head === 0 || !lineBeside(doc, stranded, false)
  return [tr, { ...toSpec(beside(doc, stranded, forward)), sequential: true }]
})

const apply = (view: EditorView, edit: Edit, run?: QuoteRun) => {
  view.dispatch({ ...toSpec(edit), effects: run ? added.of(run) : [], scrollIntoView: true, userEvent: 'input' })
  view.focus()
}

const spanAt = (state: EditorState, at: number) => state.field(quoteSpans).find(span => span.from <= at && at <= span.to)

export const quote = (view: EditorView, text: string) => {
  const { state } = view
  const { from, to } = state.selection.main
  const { edit, run } = quoting(state.doc, runsOf(state.field(quoteSpans)), from, to, text)
  apply(view, edit, run)
}

export const reply = (view: EditorView, at: number) => {
  const span = spanAt(view.state, at)
  if (span) apply(view, beside(view.state.doc, span, true))
}

export const remove = (view: EditorView, at: number) => {
  const span = spanAt(view.state, at)
  if (span) apply(view, unquoting(view.state.doc, span))
}

const removeBeside = (side: 'from' | 'to') => (view: EditorView) => {
  const { state } = view
  const { main } = state.selection
  const span = main.empty ? state.field(quoteSpans).find(span => edges(state.doc, span)[side] === main.head) : undefined
  if (span) apply(view, unquoting(state.doc, span))
  return Boolean(span)
}

const cross = (forward: boolean) => (view: EditorView) => {
  const { state } = view
  const { main } = state.selection
  if (!main.empty) return false
  const line = state.doc.lineAt(main.head)
  const moved = view.moveVertically(main, forward).head
  const span = state.field(quoteSpans).find(span => {
    const { from, to } = edges(state.doc, span)
    const adjacent = forward ? line.to === from : line.from === to
    const into = forward ? from < moved && moved <= to : from <= moved && moved < to
    return adjacent && (into || moved === main.head)
  })
  if (span) apply(view, beside(state.doc, span, forward))
  return Boolean(span)
}

const keys = Prec.high(
  keymap.of([
    { key: 'Backspace', run: removeBeside('to') },
    { key: 'Delete', run: removeBeside('from') },
    { key: 'ArrowUp', run: cross(false) },
    { key: 'ArrowDown', run: cross(true) },
  ]),
)

export const quoteState = [quoteSpans, atomic, restore, keepCaretOnLines, keys]
