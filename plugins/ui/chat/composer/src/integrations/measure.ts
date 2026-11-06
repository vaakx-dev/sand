import { onMount, resizeObserver } from '@vaakx-dev/vrui'

export const publishHeight = (view: HTMLElement, property: string) =>
  onMount(view, () => {
    const host = view.parentElement?.style
    if (!host) return undefined
    const observer = resizeObserver(view, () => host.setProperty(property, `${view.offsetHeight}px`))
    return () => {
      observer.disconnect()
      host.removeProperty(property)
    }
  })
