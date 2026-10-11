import { onDocument, read, type MaybeReactive } from '@vaakx-dev/vrui'

const keepsOpen = '[data-menu-layer], [aria-haspopup][aria-expanded="true"]'

export const popupTrigger = (open: MaybeReactive<boolean>) => ({
  'aria-haspopup': 'menu' as const,
  'aria-expanded': () => String(read(open)),
})

export const onPressOutside = (owner: Node, close: () => void, inside: Node[] = [owner]) =>
  onDocument(
    owner,
    'pointerdown',
    ({ target }) => {
      if (target instanceof Element && (inside.some(node => node.contains(target)) || target.closest(keepsOpen))) return
      close()
    },
    { capture: true },
  )
