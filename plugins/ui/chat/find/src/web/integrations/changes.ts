import { registerInScope } from '@vaakx-dev/vrui'

export const watchChanges = (root: Node, changed: () => void) => {
  const observer = new MutationObserver(() => changed())
  observer.observe(root, { subtree: true, childList: true, characterData: true })
  registerInScope(() => observer.disconnect())
}
