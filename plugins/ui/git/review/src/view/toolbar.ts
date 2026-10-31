import { derive, span } from '@vaakx-dev/vrui'
import type { CodeTab } from '../model/state'
import { commitMenu } from './commits'

export const toolbar = (tab: CodeTab) => {
  const { kit, files, layout } = tab
  const counts = derive(() => {
    const now = files.state.get()
    return now.kind === 'ready' ? `${now.files.viewed} of ${now.files.total} viewed` : ''
  })
  return kit.paneHead(
    { led: true, class: [kit.layer.menu, 'sticky top-0 bg-neutral-950'] },
    commitMenu(tab),
    kit.metaLine(counts),
    span({ class: 'flex-1' }),
    layout.splitButton(),
  )
}
