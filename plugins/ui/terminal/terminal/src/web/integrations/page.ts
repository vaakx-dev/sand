const pageShown = () => document.visibilityState === 'visible'

export const onPageShown = (listener: (shown: boolean) => void) => {
  const changed = () => listener(pageShown())
  document.addEventListener('visibilitychange', changed)
  return () => document.removeEventListener('visibilitychange', changed)
}

export const clipboardText = () => (navigator.clipboard?.readText ? () => navigator.clipboard.readText() : undefined)
