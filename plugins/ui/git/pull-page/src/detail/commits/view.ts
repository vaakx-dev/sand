import type { PullCommit } from '@sand/pull-detail/contract'
import { ago } from '@sand/util'
import { derive, div, list, show, span } from '@vaakx-dev/vrui'
import type { Shown } from '../shown'

const shortSha = (sha: string) => sha.slice(0, 7)

const commitRow = (shown: Shown, commit: () => PullCommit) => {
  const { kit } = shown.parts
  return kit.listRow({
    title: () => commit().subject,
    meta: () => `${commit().author} · ${ago(commit().at)}`,
    trail: span({ class: 'font-mono' }, () => shortSha(commit().sha)),
    onClick: () => kit.openTab(`${shown.pull().url}/commits/${commit().sha}`),
  })
}

export const commitsView = (shown: Shown) => {
  const { kit } = shown.parts
  const commits = derive(() => shown.pull().commits)
  return div(
    { class: 'flex flex-col px-2 pt-2 pb-8' },
    show(
      () => !commits.get().length,
      () => kit.emptyState({ text: 'No commits.' }),
    ),
    list(
      commits,
      commit => commit.sha,
      commit => commitRow(shown, () => commit.get()),
      div({ class: 'flex flex-col' }),
    ),
  )
}
