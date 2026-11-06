import type { BotSummary, NewBot } from '@sand/bots/contract'
import { errorMessage } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'
import type { Template } from './templates'

export const starter = (create: (spec: NewBot) => Promise<BotSummary>, started: (bot: BotSummary) => void) => {
  const creating = sig(false)
  const failure = sig('')
  const choose = ({ start }: Template) => {
    if (creating.get()) return
    creating.set(true)
    create(start).then(started, error => {
      creating.set(false)
      failure.set(errorMessage(error))
    })
  }
  return { choose, failure }
}
