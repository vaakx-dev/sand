import { pullKey } from '@sand/github/contract'
import { pullName } from '@sand/github/look'
import type { PullLink } from '@sand/pull-links/contract'
import { type Derive, div, dynamicChild, type Sig, span } from '@vaakx-dev/vrui'
import type { PullParts } from '../parts'
import { attentionLook } from '../pull/look'

const metaOf = (link: PullLink) => {
  const look = attentionLook(link.summary)
  return `${pullName(link)} · ${look.short ?? look.label}`
}

const pullRow = (parts: PullParts, item: Sig<PullLink>, selected: Derive<string | undefined>) => {
  const { kit } = parts
  const look = item.map(link => attentionLook(link.summary))
  return kit.listRow({
    lead: dynamicChild(look, found => span({ class: ['inline-flex', kit.toneText[found.tone]] }, kit.icon(found.icon, 16))),
    title: () => item.get().summary?.title ?? pullName(item.get()),
    meta: () => metaOf(item.get()),
    current: () => selected.get() === pullKey(item.get()),
    onClick: () => parts.focus.set(pullKey(item.get())),
  })
}

export const pullList = (parts: PullParts, ordered: Derive<PullLink[]>, selected: Derive<string | undefined>) =>
  div({ class: 'flex flex-col' }, parts.kit.rowList(ordered, pullKey, item => pullRow(parts, item, selected)))
