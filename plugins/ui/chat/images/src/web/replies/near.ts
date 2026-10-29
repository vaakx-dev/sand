import { intersectionObserver } from '@vaakx-dev/vrui'

const margin = '800px'

export const onceNearView = (element: Element, run: () => void) => {
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
