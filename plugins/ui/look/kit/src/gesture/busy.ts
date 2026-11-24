export const editing = (target: EventTarget | null) => target instanceof Element && target.closest('input, textarea, select, [contenteditable]') !== null

const covers = ({ left, right, top, bottom }: DOMRect, x: number, y: number) => x >= left && x <= right && y >= top && y <= bottom

export const onSelection = (x: number, y: number) => {
  const selection = getSelection()
  if (!selection?.rangeCount || selection.isCollapsed) return false
  return [...selection.getRangeAt(0).getClientRects()].some(rect => covers(rect, x, y))
}

export const selectingIn = (node: EventTarget | null) => {
  const selection = getSelection()
  return Boolean(selection && !selection.isCollapsed && node instanceof Node && node.contains(selection.anchorNode))
}
