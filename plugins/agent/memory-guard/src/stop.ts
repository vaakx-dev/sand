import { bots } from '@sand/bots/contract'
import { type Session, sessions } from '@sand/chats/contract'
import { notify } from '@sand/devices-notify/contract'
import { type Engine, Interruption } from '@sand/engine/contract'
import type { Memory } from '@sand/machine'
import type { ChatMemory } from '@sand/processes/contract'
import { bytes } from '@sand/util'
import type { Context } from 'drydock'

const OUT_OF_MEMORY = 'out of memory'

const UNKNOWN_CHAT = 'A chat'

const noteOf = (chat: ChatMemory, { freeBytes, totalBytes }: Memory) =>
  `Stopped: this PC ran out of memory. Only ${bytes(freeBytes)} of ${bytes(totalBytes)} was free, and this chat's processes used ${bytes(chat.bytes)}, the most of any chat, so sand killed them. Try a lighter way: work in smaller batches, stream data instead of loading it all, or run fewer things at once.`

const kill = (pid: number) => {
  try {
    process.kill(pid, 'SIGKILL')
  } catch {}
}

const nameOf = (ctx: Context, session: Session) => (session.kind === 'bot' ? ctx.get(bots)?.get(session.id)?.name : session.title)

const linkOf = (session: Session) => (session.kind === 'bot' ? { bot: session.id } : { thread: session.id })

const tell = (ctx: Context, chat: ChatMemory, { freeBytes }: Memory) => {
  const session = ctx.get(sessions)?.open(chat.conversation)
  const name = (session && nameOf(ctx, session)) || UNKNOWN_CHAT
  const text = `${name} used ${bytes(chat.bytes)} while ${bytes(freeBytes)} was free.`
  ctx.get(notify)?.send({ kind: 'failed', ...(session && linkOf(session)), title: `Stopped · ${OUT_OF_MEMORY}`, text }).catch(error => ctx.report(error))
}

export const stopChat = (ctx: Context, engine: Engine, chat: ChatMemory, memory: Memory) => {
  const interruption = new Interruption(OUT_OF_MEMORY, noteOf(chat, memory))
  engine.stop(chat.conversation, interruption)
  chat.pids.filter(pid => pid !== process.pid).forEach(kill)
  tell(ctx, chat, memory)
}
