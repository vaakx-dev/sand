import { pullKey } from '@sand/github/contract'
import { pullName } from '@sand/github/look'
import type { PalettePage } from '@sand/palette/contract'
import type { PullLink } from '@sand/pull-links/contract'
import type { PullPlace } from '../contract'
import { toastId } from '../inject'
import type { PullParts } from '../parts'

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

export const linkTo = async ({ ctx }: PullParts, at: PullPlace, ref: string) => {
  const before = new Set(ctx.pullLinks.of(at.session).map(pullKey))
  const result = await ctx.pullLinks.link({ session: at.session, ref }, at.device)
  const added = result.links.filter(link => !before.has(pullKey(link)))
  ctx.toasts.show({ id: toastId, tone: added.length ? 'success' : 'neutral', title: linkedTitle(added) })
}

export const linkPage = (parts: PullParts, at: PullPlace): PalettePage => ({
  id: 'git-pulls:link',
  title: 'Link pull request',
  field: refField('Link', ref => linkTo(parts, at, ref)),
})
