export const editing = (target: EventTarget | null) => target instanceof Element && target.closest('input, textarea, select, [contenteditable]') !== null

export const selecting = () => getSelection()?.isCollapsed === false

export const selectingIn = (node: EventTarget | null) => {
  const selection = getSelection()
  return Boolean(selection && !selection.isCollapsed && node instanceof Node && node.contains(selection.anchorNode))
}
