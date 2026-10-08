import { derive, intersectionObserver, onDocument, sig, span, type Child } from '@vaakx-dev/vrui'

export const shine = (...children: Child[]) => {
  const inView = sig(false)
  const pageShown = sig(!document.hidden)
  const running = derive(() => (inView.get() && pageShown.get() ? '' : undefined))
  return span(
    {
      class: 'live-shine',
      'data-seen': running,
      onMount: node => {
        intersectionObserver(node as Element, entries => inView.set(entries.at(-1)?.isIntersecting ?? false))
        onDocument(node, 'visibilitychange', () => pageShown.set(!document.hidden))
      },
    },
    ...children,
  )
}
