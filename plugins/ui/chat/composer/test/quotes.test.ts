import { EditorState, Text } from '@codemirror/state'
import { expect, test } from 'bun:test'
import { quoteSpans, quoteState } from '../src/editor/quotes/field'
import { quoteRuns } from '@sand/util'
import { quoting, spans, unquoting, type Edit } from '../src/editor/quotes/runs'

const docOf = (text: string) => Text.of(text.split('\n'))

const visibleLines = (doc: Text) => {
  const hidden = spans(doc, quoteRuns(doc.toString()))
  return doc.toJSON().filter((_, index) => !hidden.some(span => span.from <= doc.line(index + 1).from && doc.line(index + 1).to <= span.to))
}

const applied = (doc: Text, { changes, caret }: Edit) => {
  const text = doc.toString()
  const next = changes ? text.slice(0, changes.from) + changes.insert + text.slice(changes.to ?? changes.from) : text
  return { text: next, caret }
}

test('a stored message shows its text lines around block quotes, without the blank separators', () => {
  expect(visibleLines(docOf('intro\n\n> one\n> two\n\nreply'))).toEqual(['intro', 'reply'])
  expect(visibleLines(docOf('> lead\n\nreply'))).toEqual(['reply'])
  expect(visibleLines(docOf('> first\n\n\n\n> second\n\nreply'))).toEqual(['', 'reply'])
  expect(quoteRuns('```\n> code\n```\n> real').map(run => run.text)).toEqual(['real'])
})

test('quoting puts the caret on a line of its own, and removing the quote gives the text back', () => {
  const doc = docOf('intro  ')
  const { edit, run } = quoting(doc, [], 7, 7, 'one\ntwo')
  const quoted = applied(doc, edit)
  expect(quoted).toEqual({ text: 'intro\n\n> one\n> two\n\n', caret: 20 })
  expect(run).toEqual({ from: 7, to: 18, text: 'one\ntwo' })

  const after = docOf(quoted.text)
  const [span] = spans(after, [run])
  expect(applied(after, unquoting(after, span!))).toEqual({ text: 'intro', caret: 5 })
})

test('quoting right before another quote leaves an empty line between them for the caret', () => {
  const doc = docOf('> old')
  const { edit, run } = quoting(doc, quoteRuns(doc.toString()), 0, 0, 'new')
  const quoted = applied(doc, edit)
  expect(quoted).toEqual({ text: '> new\n\n> old', caret: 6 })
  expect(visibleLines(docOf(quoted.text))).toEqual([''])
  expect(run.text).toBe('new')
})

test('the caret never rests beside a quote at either end of the message, where typing would join the quote', () => {
  const caretAt = (doc: string, anchor: number) => {
    const state = EditorState.create({ doc, extensions: quoteState }).update({ selection: { anchor } }).state
    return { text: state.doc.toString(), caret: state.selection.main.head, quotes: state.field(quoteSpans).map(span => span.run.text) }
  }
  expect(caretAt('intro\n\n> kept', 13)).toEqual({ text: 'intro\n\n> kept', caret: 5, quotes: ['kept'] })
  expect(caretAt('> kept\n\nreply', 0)).toEqual({ text: '> kept\n\nreply', caret: 8, quotes: ['kept'] })
  expect(caretAt('> kept', 0)).toEqual({ text: '> kept\n\n', caret: 8, quotes: ['kept'] })
})
