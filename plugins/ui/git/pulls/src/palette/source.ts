import type { PaletteItem, PaletteSource } from '@sand/palette/contract'
import type { PullPlace } from '../contract'
import type { PullParts } from '../parts'
import { pullName } from '../pull/look'
import { linkPage } from './link'
import { openPage } from './open'

const group = 'Actions'

const showItem = (parts: PullParts, at: PullPlace): PaletteItem[] => {
  const primary = parts.primary.get()
  if (!primary) return []
  return [
    {
      id: 'git-pulls:show',
      group,
      icon: 'pull-request',
      label: `Show pull request ${pullName(primary)}`,
      detail: primary.summary?.title,
      search: 'pr github show checks review merge',
      run: () => parts.open(primary, at),
    },
  ]
}

export const pullSource = (parts: PullParts): PaletteSource => ({
  id: 'git-pulls',
  order: 20,
  items: () => {
    const at = parts.place.get()
    if (!at) return []
    return [
      ...showItem(parts, at),
      { id: 'git-pulls:create', group, icon: 'pull-request', label: 'Create pull request…', search: 'pr github new', run: () => parts.create(at) },
      {
        id: 'git-pulls:open',
        group,
        icon: 'pull-request',
        label: 'Open pull request…',
        detail: 'Work on it in a new thread',
        search: 'pr github checkout review thread',
        page: () => openPage(parts, at),
      },
      { id: 'git-pulls:link', group, icon: 'link', label: 'Link pull request…', search: 'pr github attach url', page: () => linkPage(parts, at) },
    ]
  },
})
