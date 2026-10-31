import type { Committed, Pulled, Pushed, Switched } from '@sand/git-actions/contract'
import { plural, shortSha } from '@sand/util'

export const committedTitle = (done: Committed) => `${done.pushed ? 'Committed and pushed' : 'Committed'} ${shortSha(done.commit)} · ${done.subject}`

export const pushFailedLead = (done: Committed) => `Committed ${shortSha(done.commit)}, but the push failed.`

export const pushedTitle = (done: Pushed) => (done.commits > 0 ? `Pushed ${plural(done.commits, 'commit')}` : `Pushed to ${done.upstream}`)

export const pulledTitle = (done: Pulled) => (done.commits > 0 ? `Pulled ${plural(done.commits, 'commit')}` : 'Already up to date')

export const switchedTitle = (done: Switched) => (done.created ? `Created and switched to ${done.branch}` : `Switched to ${done.branch}`)

export const initTitle = (done: { branch: string }) => `Started a git repo on ${done.branch}`
