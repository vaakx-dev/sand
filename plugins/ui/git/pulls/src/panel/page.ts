import { pullKey } from '@sand/github/contract'
import { derive, div, dynamicChild, show } from '@vaakx-dev/vrui'
import type { PullParts } from '../parts'
import { pullDetail } from './detail'
import { pullList } from './list'

export const pullPage = (parts: PullParts) => {
  const { kit, links, arrangement, focus, place, states } = parts
  const selected = derive(() => links.get().find(link => pullKey(link) === focus.get()) ?? arrangement.get().primary)
  const selectedKey = selected.map(link => link && pullKey(link))
  const shown = derive(() => ({ link: selected.get(), at: place.get() }))

  return div(
    { class: 'flex flex-col gap-4 p-4' },
    show(
      () => links.get().length > 1,
      () => pullList(parts, selectedKey),
    ),
    dynamicChild(shown, ({ link, at }) =>
      link && at ? pullDetail({ parts, link, at, state: states.of(at.session, link) }) : kit.emptyState({ text: 'No pull request on this thread yet.' }),
    ),
  )
}
