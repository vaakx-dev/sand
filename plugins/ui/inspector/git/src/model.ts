import { type ChangeState, changesLive, type ChangesLive } from '@sand/changes/contract'
import type { Subject } from '@sand/ui-shell/contract'
import { pcHello, type Wire } from '@sand/devices-contract'
import { gitLive, type GitLive, repoOf } from '@sand/git/contract'
import { githubPulls, type Pull } from '@sand/github/contract'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import type { GitFacts } from './actions'
import { keyedFacts } from './facts'

export interface Place {
  device: string
  cwd: string
}

interface Branch extends Place {
  branch: string
}

const placeKey = ({ device, cwd }: Place) => `${device}\0${cwd}`

const branchKey = (branch: Branch) => `${placeKey(branch)}\0${branch.branch}`

const mergeable = new Set<ChangeState>(['ready', 'failed'])

export const gitModel = (ctx: Context, wire: Wire) => {
  const git = sig<GitLive | undefined>(undefined)
  const threads = sig<ChangesLive | undefined>(undefined)
  ctx.watch(gitLive, found => git.set(found))
  ctx.watch(changesLive, found => threads.set(found))
  const pulls = keyedFacts(branchKey, ({ device, cwd }: Branch) => wire.call(githubPulls, { cwd }, device))
  ctx.on(pcHello, device => pulls.refetch(input => input.device === device))

  const mergeTarget = (session: string, device: string, main: string) => {
    const changes = threads.get()?.get(session, device)
    if (!changes || !mergeable.has(changes.state)) return undefined
    return repoOf(git.get()?.status(device, main))?.branch
  }

  const factsOf = ({ session, device, cwd }: Subject): GitFacts | undefined => {
    if (!cwd) return undefined
    const status = git.get()?.status(device, cwd)
    const local = repoOf(status)
    if (!local) return undefined
    const { branch, isDefault, worktree, main } = local
    return {
      local,
      remote: status?.remote,
      pulls: branch && !isDefault ? pulls.get({ device, cwd, branch }) : undefined,
      mergeInto: worktree ? mergeTarget(session, device, main) : undefined,
    }
  }

  return {
    factsOf,
    renew(place: Place) {
      pulls.refetch(branch => placeKey(branch) === placeKey(place))
    },
    opened(branch: Branch, pull: Pull) {
      pulls.patch(branchKey(branch), found => [...(found ?? []), pull])
    },
  }
}
