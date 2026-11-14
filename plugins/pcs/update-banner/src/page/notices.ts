import type { HomeNotice } from '@sand/host-updates/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild } from '@vaakx-dev/vrui'
import type { Fleet } from '../fleet/model'

interface PcNotice {
  key: string
  pc: string
  notice: HomeNotice
}

const noticesOf = (fleet: Fleet): PcNotice[] => {
  const pcs = fleet.pcs.get().filter(pc => pc.online)
  const named = pcs.filter(pc => pc.state?.notices?.length).length > 1
  return pcs.flatMap(pc => (pc.state?.notices ?? []).map(notice => ({ key: pc.key, pc: named ? `${pc.name}: ` : '', notice })))
}

export const noticesSection = (kit: Kit, fleet: Fleet) => {
  const notices = derive(() => noticesOf(fleet))
  return dynamicChild(
    notices.map(list => list.map(({ key, notice }) => `${key}/${notice.id}`).join()),
    () => {
      const list = notices.get()
      if (!list.length) return null
      return div(
        { class: 'flex flex-col gap-2' },
        ...list.map(({ key, pc, notice }) => kit.banner({ tone: 'warning', title: `${pc}${notice.title}`, detail: notice.detail, dismiss: () => void fleet.dismiss(key, notice.id) })),
      )
    },
  )
}
