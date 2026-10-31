const scrolls = /(auto|scroll|overlay)/

export const scrollParent = (element: HTMLElement): HTMLElement | null => {
  for (let at = element.parentElement; at; at = at.parentElement) if (scrolls.test(getComputedStyle(at).overflowY)) return at
  return null
}
