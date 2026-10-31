import type { PullCommit } from '@sand/pull-detail/contract'
import { shortSha } from '@sand/util'
import { derive, span } from '@vaakx-dev/vrui'
import type { CodeTab } from '../model/state'

const commitItem = ({ kit, files }: CodeTab, commit: PullCommit, close: () => void) =>
  kit.choiceItem(
    {
      selected: () => files.commit.get() === commit.sha,
      onClick: () => {
        files.commit.set(commit.sha)
        close()
      },
    },
    span({ class: 'min-w-0 flex-1 truncate' }, commit.subject),
    kit.metaLine(span({ class: 'font-mono' }, shortSha(commit.sha))),
  )

export const commitMenu = (tab: CodeTab) => {
  const { kit, files, commits } = tab
  const label = derive(() => {
    const sha = files.commit.get()
    if (!sha) return 'All commits'
    const commit = commits.get().find(each => each.sha === sha)
    return commit ? `${shortSha(sha)} ${commit.subject}` : shortSha(sha)
  })
  return kit.dropdown({
    menuClass: 'w-80',
    trigger: (press, open) => kit.chipButton({ ...press, active: open, menu: true, title: 'Show the changes of one commit' }, span({ class: 'min-w-0 truncate' }, label)),
    items: close => [
      kit.choiceItem(
        {
          selected: () => !files.commit.get(),
          onClick: () => {
            files.commit.set(undefined)
            close()
          },
        },
        'All commits',
      ),
      ...commits.get().map(commit => commitItem(tab, commit, close)),
    ],
  })
}
