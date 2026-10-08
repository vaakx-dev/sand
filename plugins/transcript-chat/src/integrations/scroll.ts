import { nearEnd } from '@sand/conversation'

const revealDistance = 600

export const scrollTo = (scroller: HTMLElement, top: number) => {
  scroller.scrollTop = top
}

export const savedScroll = (scroller: HTMLElement) => (nearEnd(scroller) ? undefined : scroller.scrollTop)

export const keepAnchor = (scroller: HTMLElement, column: HTMLElement, change: () => void) => {
  const anchor = column.firstElementChild?.firstElementChild
  const before = anchor?.getBoundingClientRect().top ?? 0
  change()
  if (anchor?.isConnected) scroller.scrollTop += anchor.getBoundingClientRect().top - before
}

export const fill = (scroller: HTMLElement, reveal: () => boolean) => {
  if (!scroller.clientHeight) return
  let more = true
  while (more && scroller.scrollTop < revealDistance) more = reveal()
}
