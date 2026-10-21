export const editing = (target: EventTarget | null) => target instanceof Element && target.closest('input, textarea, select, [contenteditable]') !== null

export const selecting = () => getSelection()?.isCollapsed === false
