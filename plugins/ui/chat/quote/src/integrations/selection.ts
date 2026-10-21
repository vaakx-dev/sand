export interface Picked {
  text: string
  x: number
  top: number
  bottom: number
}

const quotable = (node: Node | null) => Boolean((node instanceof Element ? node : node?.parentElement)?.closest('[data-quote]'))

const backward = (selection: Selection) => {
  if (!selection.anchorNode || !selection.focusNode) return false
  const range = document.createRange()
  range.setStart(selection.anchorNode, selection.anchorOffset)
  range.setEnd(selection.focusNode, selection.focusOffset)
  return range.collapsed
}

const edge = (range: Range, start: boolean) => {
  const rects = [...range.getClientRects()].filter(rect => rect.width > 0)
  return start ? rects[0] : rects.at(-1)
}

export const readSelection = (): Picked | undefined => {
  const selection = getSelection()
  if (!selection?.rangeCount || selection.isCollapsed) return undefined
  if (!quotable(selection.anchorNode) || !quotable(selection.focusNode)) return undefined
  const text = selection.toString().replace(/\n{3,}/g, '\n\n').trim()
  const start = backward(selection)
  const rect = edge(selection.getRangeAt(0), start)
  if (!text || !rect) return undefined
  return { text, x: start ? rect.left : rect.right, top: rect.top, bottom: rect.bottom }
}

export const clearSelection = () => getSelection()?.removeAllRanges()
