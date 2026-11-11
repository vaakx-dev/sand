import { inspector } from '@sand/inspector/contract'
import type { Subject } from '@sand/ui-shell/contract'
import { gitLive, type GitLive, repoOf } from '@sand/git/contract'
import { kit } from '@sand/ui-kit/contract'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'

export default definePlugin({
  name: 'inspector-branch',
  description: "The inspector's branch row: the branch a thread's folder is on and the default branch it came from",
  inject: { inspector, kit },
  apply(ctx) {
    const git = sig<GitLive | undefined>(undefined)
    ctx.watch(gitLive, found => git.set(found))
    const repoAt = ({ device, cwd }: Subject) => (cwd ? repoOf(git.get()?.status(device, cwd)) : undefined)
    const baseOf = (subject: Subject) => {
      const repo = repoAt(subject)
      return repo?.defaultBranch && !repo.isDefault ? `from ${repo.defaultBranch}` : ''
    }
    ctx.effect(() =>
      ctx.inspector.row({
        id: 'branch',
        group: 'git',
        order: 30,
        shows: subject => repoAt(subject)?.branch !== undefined,
        render: subject => ctx.kit.cardItem({ lead: ctx.kit.icon('branch', 'sm'), mono: true, end: () => baseOf(subject()) }, () => repoAt(subject())?.branch ?? ''),
      }),
    )
  },
})
