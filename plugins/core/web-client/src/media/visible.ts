import { intersectionObserver } from '@sand/dom'

const margin = '800px'

export const whenNearView = (element: Element, run: () => void) => {
  const observer = intersectionObserver(
    element,
    entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      run()
    },
    { rootMargin: margin, scrollMargin: margin },
  )
}
