import type { Bots, Computer } from '@sand/bots/contract'
import type { Sessions } from '@sand/chats/contract'
import type { Chosen } from './tools'

type Picked = Exclude<Computer, 'none'>

const ids: Record<Exclude<Picked, `pc:${string}`>, string> = { own: 'browser', 'this-pc': 'desktop' }

const unnamed = 'Name a computer: call computer_list for the ids.'

const unchosen =
  "You have no computer chosen. The user picks one under Computer in your profile in the Bots space; until then, name a computer from computer_list."

const isPc = (computer: Picked): computer is `pc:${string}` => computer.startsWith('pc:')

const botAbove = (sessions: Sessions, id: string) => {
  for (let session = sessions.open(id); session; session = session.parent ? sessions.open(session.parent) : undefined) {
    if (session.owner === 'bot') return session.id
  }
}

export const chosenComputer =
  (bots: () => Bots | undefined, sessions: Sessions): Chosen =>
  ({ id }) => {
    const bot = botAbove(sessions, id)
    if (!bot) throw new Error(unnamed)
    const computer = bots()?.get(bot)?.computer ?? 'none'
    if (computer === 'none') throw new Error(unchosen)
    return isPc(computer) ? computer.slice('pc:'.length) : ids[computer]
  }
