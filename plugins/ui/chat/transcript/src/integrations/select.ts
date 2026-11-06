export const selectingIn = (node: EventTarget | null) => {
  const selection = getSelection()
  return Boolean(selection && !selection.isCollapsed && node instanceof Node && node.contains(selection.anchorNode))
}
