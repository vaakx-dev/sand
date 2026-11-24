import { onDisconnect, onTimeout } from '@vaakx-dev/vrui'

export const whenFound = (root: HTMLElement, selector: string, found: (node: Element) => void, waitMs: number) => {
  const present = root.querySelector(selector)
  if (present) return found(present)
  const observer = new MutationObserver(() => {
    const appeared = root.querySelector(selector)
    if (!appeared) return
    observer.disconnect()
    found(appeared)
  })
  const stop = () => observer.disconnect()
  observer.observe(root, { childList: true, subtree: true })
  onDisconnect(root, stop)
  onTimeout(stop, waitMs, root)
}
