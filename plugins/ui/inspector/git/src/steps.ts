import { changesMerge } from '@sand/changes/contract'
import type { Wire } from '@sand/devices-contract'
import { gitCommit, gitDiscard, gitPush, gitUpdate } from '@sand/git/contract'
import { githubOpenPull, type Pull } from '@sand/github/contract'
import type { Toast } from '@sand/toasts/contract'
import type { ActionId, GitFacts } from './actions'

export interface StepPlace {
  session: string
  device: string
  cwd: string
}

export interface StepDeps {
  wire: Wire
  place: StepPlace
  facts: GitFacts
  title: string
  opened(pull: Pull): void
  open(url: string): void
}

export interface Step {
  busy: string
  failed: string
  run(): Promise<Pick<Toast, 'title' | 'actions'>>
}

export const stepsFor = ({ wire, place: { session, device, cwd }, facts, title, opened, open }: StepDeps): Record<ActionId, Step> => {
  const main = facts.local.defaultBranch
  return {
    commit: {
      busy: 'Committing…',
      failed: "Couldn't commit",
      run: async () => {
        await wire.call(gitCommit, { cwd, message: title }, device)
        return { title: 'Committed' }
      },
    },
    merge: {
      busy: 'Merging…',
      failed: "Couldn't merge",
      run: async () => {
        const merged = await wire.call(changesMerge, { session }, device)
        if (merged.state !== 'merged') throw new Error(merged.reason ?? "The thread's work didn't merge.")
        return { title: `Merged into ${facts.mergeInto}` }
      },
    },
    push: {
      busy: 'Pushing…',
      failed: "Couldn't push",
      run: async () => {
        await wire.call(gitPush, { cwd }, device)
        return { title: 'Pushed' }
      },
    },
    pull: {
      busy: 'Opening a PR…',
      failed: "Couldn't open a PR",
      run: async () => {
        const pull = await wire.call(githubOpenPull, { cwd, title }, device)
        opened(pull)
        return { title: `Opened PR #${pull.number}`, actions: [{ label: 'Open', run: () => open(pull.url) }] }
      },
    },
    update: {
      busy: 'Updating…',
      failed: `Couldn't update from ${main}`,
      run: async () => {
        const { updated } = await wire.call(gitUpdate, { cwd }, device)
        return { title: updated ? `Updated from ${main}` : `Already up to date with ${main}` }
      },
    },
    discard: {
      busy: 'Discarding…',
      failed: "Couldn't discard the changes",
      run: async () => {
        await wire.call(gitDiscard, { cwd }, device)
        return { title: 'Discarded the changes' }
      },
    },
  }
}
