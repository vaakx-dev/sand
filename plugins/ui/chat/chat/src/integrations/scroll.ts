const revealDistance = 600

export const scrollTo = (scroller: HTMLElement, top: number) => {
  scroller.scrollTop = top
}

const anchorOf = (scroller: HTMLElement, rowList: HTMLElement) => {
  const top = scroller.getBoundingClientRect().top
  const rows = [...rowList.children]
  return rows.find(row => row.getBoundingClientRect().bottom > top) ?? rows[0]
}

export const keepAnchor = (scroller: HTMLElement, rowList: HTMLElement, change: () => void) => {
  const anchor = anchorOf(scroller, rowList)
  const before = anchor?.getBoundingClientRect().top ?? 0
  change()
  if (anchor?.isConnected) scroller.scrollTop += anchor.getBoundingClientRect().top - before
}

export const fill = (scroller: HTMLElement, reveal: () => boolean) => {
  if (!scroller.clientHeight) return
  let more = true
  while (more && scroller.scrollTop < revealDistance) more = reveal()
}
