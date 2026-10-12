type Move = (index: number, count: number) => number

const moves: Record<string, Move> = {
  ArrowDown: index => index + 1,
  ArrowUp: index => (index < 0 ? -1 : index - 1),
  Home: () => 0,
  End: (_, count) => count - 1,
}

const menuItemsIn = (node: ParentNode) => [...node.querySelectorAll<HTMLElement>('[role="menuitem"]')]

export const focusFirst = (node: ParentNode) => menuItemsIn(node)[0]?.focus()

export const arrowKeys = (event: KeyboardEvent) => {
  const move = moves[event.key]
  const menu = event.currentTarget
  if (!move || event.target instanceof HTMLInputElement || !(menu instanceof Element)) return
  event.preventDefault()
  const items = menuItemsIn(menu)
  const index = items.findIndex(item => item === document.activeElement)
  items[(move(index, items.length) + items.length) % items.length]?.focus()
}
