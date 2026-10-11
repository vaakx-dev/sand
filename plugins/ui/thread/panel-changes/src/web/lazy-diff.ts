import { diffRow, div, dynamicChild, intersectionObserver, sig, type Sig } from '@sand/dom'
import type { FileChange } from '../changes/collect'
import { shownLines } from '../changes/lines'

const margin = '1500px 0px'
const lineHeight = 16
const gapHeight = 24

const guessHeight = (file: FileChange) => shownLines(file).reduce((sum, line) => sum + (line.kind === 'gap' ? gapHeight : lineHeight), 0)

export const lazyDiff = (file: Sig<FileChange>, shape: () => string, closed: () => boolean, scroller: HTMLElement) => {
  const near = sig(false)
  let drawn: HTMLElement | undefined
  let measured: { shape: string; height: number } | undefined

  const remember = () => {
    if (drawn?.isConnected) measured = { shape: shape(), height: drawn.offsetHeight }
  }

  const changed: IntersectionObserverCallback = records => {
    const next = records.at(-1)?.isIntersecting ?? false
    if (next === near.get()) return
    if (!next) remember()
    near.set(next)
  }

  const height = () => (measured?.shape === shape() ? measured.height : guessHeight(file.get()))

  const body = () => {
    if (closed()) return null
    if (!near.get()) return div({ style: { height: `${height()}px` } })
    drawn = div(shownLines(file.get()).map(line => diffRow(line)))
    return drawn
  }

  return div(
    { onMount: node => void intersectionObserver(node, changed, { root: scroller, rootMargin: margin }) },
    dynamicChild(() => `${shape()}|${near.get()}`, body),
  )
}
