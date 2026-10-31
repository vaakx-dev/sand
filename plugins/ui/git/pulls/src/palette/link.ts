import type { PalettePage } from '@sand/palette/contract'
import { type PullLink, pullLink } from '@sand/pull-links/contract'
import type { PullPlace } from '../contract'
import { pullKey } from '../links/rank'
import { notify } from '../notify'
import type { PullParts } from '../parts'
import { pullName } from '../pull/look'

export const refField = (label: string, submit: (ref: string) => Promise<void | PalettePage>) => ({
  kind: 'url' as const,
  value: '',
  placeholder: 'Pull request URL or #number',
  action: (value: string) => ({ label, enabled: Boolean(value.trim()) }),
  submit: (value: string) => submit(value.trim()),
})

const linkedTitle = (added: PullLink[]) => {
  if (!added.length) return 'That pull request is already linked to this thread'
  return `Linked ${added.map(pullName).join(', ')} to this thread`
}

export const linkTo = async (parts: PullParts, at: PullPlace, ref: string) => {
  const before = new Set(parts.store.read(at.session).map(pullKey))
  const result = await parts.ctx.wire.call(pullLink, { session: at.session, ref }, at.device)
  parts.store.apply(result, at.device)
  const added = result.links.filter(link => !before.has(pullKey(link)))
  notify(parts.ctx, { tone: added.length ? 'success' : 'neutral', title: linkedTitle(added) })
}

export const linkPage = (parts: PullParts, at: PullPlace): PalettePage => ({
  id: 'git-pulls:link',
  title: 'Link pull request',
  field: refField('Link', ref => linkTo(parts, at, ref)),
})
