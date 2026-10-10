export const toggles = (toggle: () => void) => ({
  onMouseDown: (event: MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    toggle()
  },
  onClick: (event: MouseEvent) => {
    if (event.detail === 0) toggle()
  },
})
