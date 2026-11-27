import { intersectionObserver } from '@vaakx-dev/vrui'

const NEAR_MARGIN = '800px'

export const onceNearView = (element: Element, run: () => void) => {
  const observer = intersectionObserver(
    element,
    entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      run()
    },
    { rootMargin: NEAR_MARGIN, scrollMargin: NEAR_MARGIN },
  )
}
