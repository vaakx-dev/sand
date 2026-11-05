import { invertedEffects } from '@codemirror/commands'
import { EditorState, StateEffect, StateField, type Transaction } from '@codemirror/state'
import { Decoration, EditorView } from '@codemirror/view'
import { quoteRuns, type QuoteRun } from '@sand/util'
import { beside, edges, lineBeside, mapRun, spans, toSpec, type Span } from './runs'

export const added = StateEffect.define<QuoteRun>({ map: (run, changes) => mapRun(run, changes) })

export const runsOf = (spans: readonly Span[]) => spans.map(span => span.run)

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

const keepCaretOnLines = EditorState.transactionFilter.of(tr => {
  const { main } = tr.newSelection
  if (!main.empty || (!tr.docChanged && !tr.selection)) return tr
  const doc = tr.newDoc
  const stranded = tr.state.field(quoteSpans).find(span => (main.head === 0 && !lineBeside(doc, span, false)) || (main.head === doc.length && !lineBeside(doc, span, true)))
  if (!stranded) return tr
  const forward = main.head === 0 || !lineBeside(doc, stranded, false)
  return [tr, { ...toSpec(beside(doc, stranded, forward)), sequential: true }]
})

export const quoteState = [quoteSpans, atomic, restore, keepCaretOnLines]
