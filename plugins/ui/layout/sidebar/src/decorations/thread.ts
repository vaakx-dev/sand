import { derive, type Sig } from '@vaakx-dev/vrui'
import type { SidebarThread } from '../contract'
import type { ThreadItem } from '../items/item'

const threadOf = (item: ThreadItem): SidebarThread => ({
  id: item.id,
  cwd: item.path ?? '',
  device: item.device,
  project: item.projectKey,
  running: item.state === 'running',
  draft: item.state === 'draft',
})

const keyOf = ({ id, cwd, device, project, running, draft }: SidebarThread) => [id, cwd, device, project, running, draft].join('\0')

export const rowThread = (item: Sig<ThreadItem>) => {
  let last: SidebarThread | undefined
  return derive(() => {
    const next = threadOf(item.get())
    if (last && keyOf(last) === keyOf(next)) return last
    last = next
    return next
  })
}
