import { sig } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import type { PullTab } from '../contract'

const byOrder = (tabs: PullTab[]) => [...tabs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

export const tabBook = () => {
  const tabs = sig<PullTab[]>([])

  const add = (tab: PullTab): Dispose => {
    tabs.update(list => byOrder([...list.filter(each => each.id !== tab.id), tab]))
    return () => tabs.update(list => list.filter(each => each !== tab))
  }

  return { tabs, add }
}

export type TabBook = ReturnType<typeof tabBook>
