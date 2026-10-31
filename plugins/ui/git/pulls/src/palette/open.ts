import type { PullSummary } from '@sand/github/contract'
import { pullName, pullStateLook } from '@sand/github/look'
import type { PaletteItem, PalettePage } from '@sand/palette/contract'
import type { PullPlace } from '../contract'
import { toastId } from '../inject'
import type { PullParts } from '../parts'
import { linkTo, refField } from './link'

type OpenMode = 'worktree' | 'checkout'

const openIn = async ({ ctx }: PullParts, at: PullPlace, pull: PullSummary, mode: OpenMode) => {
  const progress = ctx.toasts.show({ tone: 'neutral', sticky: true, title: `Opening ${pullName(pull)}…` })
  const opened = await ctx.toasts.attempt(toastId, `Couldn't open ${pullName(pull)}`, () =>
    ctx.pullLinks.open({ cwd: at.cwd, ref: pull.url, mode }, at.device).finally(() => progress.dismiss()),
  )
  if (opened) await ctx.threads.select(opened.session)
}

const linkOnly = (parts: PullParts, at: PullPlace, pull: PullSummary) => parts.ctx.toasts.attempt(toastId, `Couldn't link ${pullName(pull)}`, () => linkTo(parts, at, pull.url))

const choices = (parts: PullParts, at: PullPlace, pull: PullSummary): PaletteItem[] => [
  { id: 'git-pulls:open-worktree', icon: 'worktree', label: 'In a new worktree', detail: 'Leaves your main checkout alone', run: () => openIn(parts, at, pull, 'worktree') },
  { id: 'git-pulls:open-checkout', icon: 'folder', label: 'In the main checkout', detail: 'Needs no uncommitted changes there', run: () => openIn(parts, at, pull, 'checkout') },
  { id: 'git-pulls:open-link', icon: 'link', label: 'Link to this thread only', run: () => linkOnly(parts, at, pull) },
]

const pullDetailLine = (pull: PullSummary) =>
  `${pullName(pull)} · ${pull.base} ← ${pull.head} · by ${pull.author} · ${pullStateLook(pull.state).label.toLowerCase()}`

const wherePage = (parts: PullParts, at: PullPlace, pull: PullSummary): PalettePage => ({
  id: 'git-pulls:open-where',
  title: pullName(pull),
  placeholder: 'Where should the thread work?',
  card: () => ({ label: 'Pull request', icon: pullStateLook(pull.state).icon, title: pull.title, detail: pullDetailLine(pull) }),
  items: () => choices(parts, at, pull),
})

export const openPage = (parts: PullParts, at: PullPlace): PalettePage => ({
  id: 'git-pulls:open',
  title: 'Open pull request',
  field: refField('Find', async ref => wherePage(parts, at, await parts.ctx.github.resolve({ cwd: at.cwd, ref }, at.device))),
})
