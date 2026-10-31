import { derive, div, dynamicChild, show } from '@vaakx-dev/vrui'
import { byAttention, pullKey } from '../links/rank'
import type { PullParts } from '../parts'
import { pullDetail } from './detail'
import { pullList } from './list'
import { detailStates } from './state'

export const pullPage = (parts: PullParts) => {
  const { kit, links, focus, place } = parts
  const states = detailStates()
  const ordered = links.map(byAttention)
  const selected = derive(() => {
    const list = ordered.get()
    return list.find(link => pullKey(link) === focus.get()) ?? list[0]
  })
  const selectedKey = selected.map(link => link && pullKey(link))
  const shown = derive(() => ({ link: selected.get(), at: place.get() }))

  return div(
    { class: 'flex flex-col gap-4 p-4' },
    show(
      () => ordered.get().length > 1,
      () => pullList(parts, ordered, selectedKey),
    ),
    dynamicChild(shown, ({ link, at }) =>
      link && at ? pullDetail({ parts, link, at, state: states.of(at.session, link) }) : kit.emptyState({ text: 'No pull request on this thread yet.' }),
    ),
  )
}
