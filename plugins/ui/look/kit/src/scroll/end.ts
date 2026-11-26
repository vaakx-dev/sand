const pinDistance = 80
const endSlack = 1

export const nativeAnchoring = CSS.supports('overflow-anchor', 'auto')

const fromEnd = (scroller: HTMLElement) => scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop

export const nearEnd = (scroller: HTMLElement) => fromEnd(scroller) < pinDistance

export const atEnd = (scroller: HTMLElement) => fromEnd(scroller) <= endSlack

export const toEnd = (scroller: HTMLElement) => {
  if (!atEnd(scroller)) scroller.scrollTop = scroller.scrollHeight
}

export const shiftBy = (scroller: HTMLElement, shift: number) => {
  if (Math.abs(shift) >= 1) scroller.scrollTop += shift
}

export const firstRowBelow = (rowList: HTMLElement, y: number) => {
  const rows = rowList.children
  let low = 0
  let high = rows.length - 1
  while (low < high) {
    const middle = (low + high) >> 1
    if (rows[middle]!.getBoundingClientRect().bottom > y) high = middle
    else low = middle + 1
  }
  return low
}

export interface Anchor {
  row: Element
  offset: number
}

const offsetOf = (scroller: HTMLElement, row: Element) => row.getBoundingClientRect().top - scroller.getBoundingClientRect().top

export const anchorOf = (scroller: HTMLElement, rowList: HTMLElement): Anchor | undefined => {
  const row = rowList.children[firstRowBelow(rowList, scroller.getBoundingClientRect().top)]
  return row && { row, offset: offsetOf(scroller, row) }
}

export const toAnchor = (scroller: HTMLElement, { row, offset }: Anchor) => shiftBy(scroller, offsetOf(scroller, row) - offset)

export const keepAnchor = (scroller: HTMLElement, rowList: HTMLElement, change: () => void) => {
  const anchor = anchorOf(scroller, rowList)
  change()
  if (anchor?.row.isConnected) toAnchor(scroller, anchor)
}
