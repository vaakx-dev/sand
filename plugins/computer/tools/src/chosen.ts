import type { Bots, Computer } from '@sand/bots/contract'
import type { Chosen } from './tools'

type Picked = Exclude<Computer, 'none'>

const ids: Record<Exclude<Picked, `pc:${string}`>, string> = { own: 'browser', 'this-pc': 'desktop' }

const unnamed = 'Name a computer: call computer_list for the ids.'

const unchosen =
  "You have no computer chosen. The user picks one under Computer in your profile in the Bots space; until then, name a computer from computer_list."

const isPc = (computer: Picked): computer is `pc:${string}` => computer.startsWith('pc:')

export const chosenComputer =
  (bots: () => Bots | undefined): Chosen =>
  ({ owner, id }) => {
    if (owner !== 'bot') throw new Error(unnamed)
    const computer = bots()?.get(id)?.computer ?? 'none'
    if (computer === 'none') throw new Error(unchosen)
    return isPc(computer) ? computer.slice('pc:'.length) : ids[computer]
  }
