import type { EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { QuoteRun } from '@sand/util'
import { added, quoteSpans, runsOf } from './field'
import { beside, edges, quoting, toSpec, unquoting, type Edit } from './runs'

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

export const removeBeside = (side: 'from' | 'to') => (view: EditorView) => {
  const { state } = view
  const { main } = state.selection
  const span = main.empty ? state.field(quoteSpans).find(span => edges(state.doc, span)[side] === main.head) : undefined
  if (span) apply(view, unquoting(state.doc, span))
  return Boolean(span)
}

export const cross = (forward: boolean) => (view: EditorView) => {
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
