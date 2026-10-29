export const nativeAnchoring = CSS.supports('overflow-anchor', 'auto')

export const scrollTo = (scroller: HTMLElement, top: number) => {
  scroller.scrollTop = top
}

export const shiftBy = (scroller: HTMLElement, shift: number) => {
  if (Math.abs(shift) >= 1) scroller.scrollTop += shift
}

export const stickToEnd = (scroller: HTMLElement) => {
  if (scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop >= 1) scroller.scrollTop = scroller.scrollHeight
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

export const keepAnchor = (scroller: HTMLElement, rowList: HTMLElement, change: () => void) => {
  const anchor = rowList.children[firstRowBelow(rowList, scroller.getBoundingClientRect().top)]
  const before = anchor?.getBoundingClientRect().top ?? 0
  change()
  if (anchor?.isConnected) shiftBy(scroller, anchor.getBoundingClientRect().top - before)
}
