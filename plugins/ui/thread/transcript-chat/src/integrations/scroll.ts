const revealDistance = 600

export const scrollTo = (scroller: HTMLElement, top: number) => {
  scroller.scrollTop = top
}

export const savedScroll = (scroller: HTMLElement, atEnd: boolean) => (atEnd ? undefined : scroller.scrollTop)

const anchorOf = (scroller: HTMLElement, column: HTMLElement) => {
  const top = scroller.getBoundingClientRect().top
  const rows = [...(column.firstElementChild?.children ?? [])]
  return rows.find(row => row.getBoundingClientRect().bottom > top) ?? rows[0]
}

export const keepAnchor = (scroller: HTMLElement, column: HTMLElement, change: () => void) => {
  const anchor = anchorOf(scroller, column)
  const before = anchor?.getBoundingClientRect().top ?? 0
  change()
  if (anchor?.isConnected) scroller.scrollTop += anchor.getBoundingClientRect().top - before
}

export const fill = (scroller: HTMLElement, reveal: () => boolean) => {
  if (!scroller.clientHeight) return
  let more = true
  while (more && scroller.scrollTop < revealDistance) more = reveal()
}
