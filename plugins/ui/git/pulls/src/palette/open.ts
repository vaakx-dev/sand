import { pullsResolve, type PullSummary } from '@sand/github/contract'
import type { PaletteItem, PalettePage } from '@sand/palette/contract'
import { pullOpen } from '@sand/pull-links/contract'
import type { PullPlace } from '../contract'
import { notify, notifyError } from '../notify'
import type { PullParts } from '../parts'
import { pullName, stateLook } from '../pull/look'
import { linkTo, refField } from './link'

type OpenMode = 'worktree' | 'checkout'

const openIn = async (parts: PullParts, at: PullPlace, pull: PullSummary, mode: OpenMode) => {
  const { ctx } = parts
  const name = pullName(pull)
  const shown = notify(ctx, { tone: 'neutral', sticky: true, title: `Opening ${name}…` })
  try {
    const { session } = await ctx.wire.call(pullOpen, { cwd: at.cwd, ref: pull.url, mode }, at.device)
    shown?.dismiss()
    await ctx.threads.select(session)
  } catch (error) {
    notifyError(ctx, `Couldn't open ${name}`, error)
  }
}

const linkOnly = async (parts: PullParts, at: PullPlace, pull: PullSummary) => {
  try {
    await linkTo(parts, at, pull.url)
  } catch (error) {
    notifyError(parts.ctx, `Couldn't link ${pullName(pull)}`, error)
  }
}

const choices = (parts: PullParts, at: PullPlace, pull: PullSummary): PaletteItem[] => [
  { id: 'git-pulls:open-worktree', icon: 'worktree', label: 'In a new worktree', detail: 'Leaves your main checkout alone', run: () => openIn(parts, at, pull, 'worktree') },
  { id: 'git-pulls:open-checkout', icon: 'folder', label: 'In the main checkout', detail: 'Needs no uncommitted changes there', run: () => openIn(parts, at, pull, 'checkout') },
  { id: 'git-pulls:open-link', icon: 'link', label: 'Link to this thread only', run: () => linkOnly(parts, at, pull) },
]

const pullDetailLine = (pull: PullSummary) =>
  `${pullName(pull)} · ${pull.base} ← ${pull.head} · by ${pull.author} · ${stateLook(pull).label.toLowerCase()}`

const wherePage = (parts: PullParts, at: PullPlace, pull: PullSummary): PalettePage => ({
  id: 'git-pulls:open-where',
  title: pullName(pull),
  placeholder: 'Where should the thread work?',
  card: () => ({ label: 'Pull request', icon: stateLook(pull).icon, title: pull.title, detail: pullDetailLine(pull) }),
  items: () => choices(parts, at, pull),
})

export const openPage = (parts: PullParts, at: PullPlace): PalettePage => ({
  id: 'git-pulls:open',
  title: 'Open pull request',
  field: refField('Find', async ref => wherePage(parts, at, await parts.ctx.wire.call(pullsResolve, { cwd: at.cwd, ref }, at.device))),
})
