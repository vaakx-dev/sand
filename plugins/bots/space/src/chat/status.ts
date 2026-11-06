import type { BotStatus } from '@sand/bots/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild } from '@vaakx-dev/vrui'
import type { Conversation } from './conversation'

const waitingText = 'Waiting for you'

export const statusView = (kit: Kit, talk: Conversation, status: () => BotStatus) => {
  const last = derive(() => talk.live.get().at(-1))
  const doing = derive(() => {
    const block = last.get()
    return block?.type === 'tool' ? `Using ${block.name}` : 'Thinking'
  })
  const lines = {
    working: () => kit.statusLine({ mark: kit.spinner('sm'), text: doing, title: doing }),
    waiting: () => kit.statusLine({ mark: kit.dot('accent'), text: waitingText, title: waitingText }),
  }
  const line = derive(() => {
    const current = status()
    if (current === 'waiting') return current
    return current === 'working' && last.get()?.type !== 'text' ? current : undefined
  })
  return dynamicChild(line, shown => (shown ? div({ class: 'mb-3' }, lines[shown]()) : null))
}
