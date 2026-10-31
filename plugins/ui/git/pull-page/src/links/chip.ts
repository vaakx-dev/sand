import type { LinkedThread } from '@sand/pull-links/contract'
import { dynamicChild, span, stopThen } from '@vaakx-dev/vrui'
import type { PageParts } from '../parts'

type Activity = 'running' | 'watching' | 'idle'

const activityOf = (parts: PageParts, linked: LinkedThread): Activity => {
  if (parts.thread(linked.session)?.running) return 'running'
  return linked.watching ? 'watching' : 'idle'
}

const notes: Record<Activity, string> = { running: 'The agent is working', watching: 'The agent is watching this pull request', idle: 'Open the thread' }

export const threadChip = (parts: PageParts, linked: () => LinkedThread, wide = false) => {
  const { kit, ctx } = parts
  const title = () => parts.thread(linked().session)?.info.title || 'Untitled thread'
  const activity = () => activityOf(parts, linked())
  return kit.chipButton(
    {
      active: false,
      class: wide ? 'max-w-full' : 'max-w-48',
      title: () => `${title()} · ${notes[activity()]}`,
      onClick: stopThen(() => void ctx.threads.select(linked().session)),
    },
    dynamicChild(activity, state => {
      if (state === 'running') return kit.spinner(12)
      return kit.icon(state === 'watching' ? 'eye' : 'message', 12)
    }),
    span({ class: 'min-w-0 truncate' }, title),
    wide ? span({ class: 'shrink-0 text-neutral-500' }, () => (activity() === 'idle' ? '' : `· ${activity() === 'running' ? 'working' : 'watching'}`)) : null,
  )
}
