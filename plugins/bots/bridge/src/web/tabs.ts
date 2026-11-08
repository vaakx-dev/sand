import type { BotTab, BotTabSource } from '@sand/bots/contract'
import { threadScheme, type ThreadView } from '@sand/chat/contract'
import { threadOfRef, threadRef } from './refs'
import type { Roster } from './roster'

export const threadTabs = (roster: Roster, view: ThreadView, projectOf: (thread: string) => string | null): BotTabSource => {
  const tabOf = (thread: string): BotTab | undefined => {
    const live = view.live(thread)
    return live && { ref: threadRef(thread), title: live.title, status: live.status, note: live.note, at: live.at, project: projectOf(thread) }
  }
  return {
    scheme: threadScheme,
    list: bot =>
      roster
        .startedBy(bot)
        .flatMap(thread => tabOf(thread) ?? [])
        .sort((a, b) => b.at - a.at),
    get(ref) {
      const thread = threadOfRef(ref)
      return thread === undefined ? undefined : tabOf(thread)
    },
    render: ref => view.render(threadOfRef(ref) ?? ref),
  }
}
