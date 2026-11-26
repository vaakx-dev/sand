import type { Bots, Computer as BotComputer } from '@sand/bots/contract'
import type { Sessions } from '@sand/chats/contract'
import type { Computer, Computers } from '@sand/computers/contract'
import type { ToolContext } from '@sand/tools/contract'

type Conversation = ToolContext['conversation']

type Picked = Exclude<BotComputer, 'none'>

interface Sources {
  computers: Computers
  bots: () => Bots | undefined
  sessions: Sessions
}

interface Target {
  id: string
  computer: Computer
}

const ids: Record<Exclude<Picked, `pc:${string}`>, string> = { own: 'browser', 'this-pc': 'desktop' }

const unnamed = 'Name a computer from computer_list; this chat then keeps using it.'

const unchosen =
  'You have no computer chosen. The user picks one under Computer in your profile in the Bots space; until then, name a computer from computer_list and this chat keeps using it.'

const isPc = (computer: Picked): computer is `pc:${string}` => computer.startsWith('pc:')

const idOf = (computer: Picked) => (isPc(computer) ? computer.slice('pc:'.length) : ids[computer])

const botAbove = (sessions: Sessions, id: string) => {
  for (let session = sessions.open(id); session; session = session.parent ? sessions.open(session.parent) : undefined) {
    if (session.owner === 'bot') return session.id
  }
}

class Chooser {
  private readonly named = new Map<string, string>()

  constructor(private readonly sources: Sources) {}

  target(given: string | undefined, conversation: Conversation): Target {
    const id = given ?? this.named.get(conversation.id) ?? this.fallback(conversation)
    const computer = this.sources.computers.get(id)
    if (!computer) throw new Error(`No computer "${id}". Call computer_list for the ids.`)
    if (given) this.named.set(conversation.id, given)
    return { id, computer }
  }

  private fallback(conversation: Conversation) {
    const bot = botAbove(this.sources.sessions, conversation.id)
    const choice = bot ? (this.sources.bots()?.get(bot)?.computer ?? 'none') : 'none'
    if (choice !== 'none') return idOf(choice)
    const [browser, ...others] = this.sources.computers.list().filter(info => info.kind === 'browser')
    if (browser && !others.length) return browser.id
    throw new Error(bot ? unchosen : unnamed)
  }
}

export { Chooser, type Target }
