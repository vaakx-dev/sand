import type { EditorView } from '@codemirror/view'

const isSpace = (char: string) => /\s/.test(char)

export const spacedLink = (link: string, before: string, after: string) => `${before && !isSpace(before) ? ' ' : ''}${link}${after && isSpace(after) ? '' : ' '}`

export const placeLink = (view: EditorView, link: string, from: number, to: number) => {
  const { state } = view
  const insert = spacedLink(link, state.sliceDoc(Math.max(0, from - 1), from), state.sliceDoc(to, to + 1))
  view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + insert.length }, scrollIntoView: true, userEvent: 'input.reference' })
  view.focus()
}
