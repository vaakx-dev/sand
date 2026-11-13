import type { Kit } from '@sand/ui-kit/contract'
import { div, img, show, span } from '@vaakx-dev/vrui'
import type { Addon } from '../../contract'
import type { FeatureStore } from '../store'

const coverOf = (store: FeatureStore, { id, label, pictures, cover }: Addon) => {
  const file = cover ?? pictures[0]
  const url = file ? store.picture(id, file) : undefined
  return div(
    { class: 'aspect-video w-full overflow-hidden rounded-t-md bg-neutral-950' },
    url ? show(() => Boolean(url.get()), () => img({ src: () => url.get() ?? '', alt: `${label} in use`, class: 'h-full w-full object-cover object-top' })) : null,
  )
}

const addonCard = (kit: Kit, store: FeatureStore, addon: Addon, open: (id: string) => void) =>
  kit.plainButton(
    { class: 'flex min-w-0 flex-col overflow-hidden rounded-md text-left ring-1 ring-neutral-800 hover:bg-neutral-950', onClick: () => open(addon.id) },
    coverOf(store, addon),
    div(
      { class: 'flex min-w-0 flex-col gap-1 p-3' },
      kit.rowName(addon.label),
      span({ class: 'text-xs text-neutral-500' }, addon.summary),
    ),
  )

export { addonCard }
