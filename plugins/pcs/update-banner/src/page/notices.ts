import type { HomeNotice } from '@sand/host-updates/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, el, show, sig } from '@vaakx-dev/vrui'
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

const details = (kit: Kit, text: string) => {
  const open = sig(false)
  return div(
    { class: 'flex flex-col gap-1' },
    div({ class: 'flex items-center gap-1 text-xs text-neutral-500' }, kit.textToggle(open, 'Details'), show(open, () => kit.copyButton({ text: () => text, surface: 'raised' }))),
    show(open, () => el('pre', { class: 'font-mono text-xs whitespace-pre-wrap wrap-anywhere text-neutral-500' }, text)),
  )
}

const noticeCard = (kit: Kit, fleet: Fleet, { key, pc, notice }: PcNotice) =>
  kit.banner({ tone: 'warning', title: `${pc}${notice.title}`, detail: notice.summary, dismiss: () => void fleet.dismiss(key, notice.id) }, details(kit, notice.details))

export const noticesSection = (kit: Kit, fleet: Fleet) => {
  const notices = derive(() => noticesOf(fleet))
  return dynamicChild(
    notices.map(list => list.map(({ key, notice }) => `${key}/${notice.id}/${notice.details}`).join()),
    () => {
      const list = notices.get()
      return list.length ? div({ class: 'flex flex-col gap-2' }, ...list.map(found => noticeCard(kit, fleet, found))) : null
    },
  )
}
