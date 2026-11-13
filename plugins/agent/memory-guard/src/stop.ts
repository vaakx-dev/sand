import { sessions } from '@sand/chats/contract'
import { notify } from '@sand/devices-notify/contract'
import { type Engine, Interruption } from '@sand/engine/contract'
import { backgroundJobs } from '@sand/jobs/contract'
import type { Memory } from '@sand/machine'
import type { ChatMemory } from '@sand/processes/contract'
import { bytes } from '@sand/util'
import type { Context } from 'drydock'

const OUT_OF_MEMORY = 'out of memory'

const noteOf = (chat: ChatMemory, { freeBytes, totalBytes }: Memory) =>
  `Stopped: this PC ran out of memory. Only ${bytes(freeBytes)} of ${bytes(totalBytes)} was free, and this chat's processes used ${bytes(chat.bytes)}, the most of any chat, so sand killed them. Try a lighter way: work in smaller batches, stream data instead of loading it all, or run fewer things at once.`

const kill = (pid: number) => {
  try {
    process.kill(pid, 'SIGKILL')
  } catch {}
}

const tell = (ctx: Context, chat: ChatMemory, { freeBytes }: Memory) => {
  const title = ctx.get(sessions)?.open(chat.conversation)?.title
  const text = `${title ?? 'A chat'} used ${bytes(chat.bytes)} while ${bytes(freeBytes)} was free.`
  ctx.get(notify)?.send({ kind: 'failed', ...(title !== undefined && { thread: chat.conversation }), title: `Stopped · ${OUT_OF_MEMORY}`, text }).catch(error => ctx.report(error))
}

export const stopChat = (ctx: Context, engine: Engine, chat: ChatMemory, memory: Memory) => {
  const interruption = new Interruption(OUT_OF_MEMORY, noteOf(chat, memory))
  engine.stop(chat.conversation, interruption)
  ctx.get(backgroundJobs)?.stopAll(chat.conversation, interruption.note)
  chat.pids.filter(pid => pid !== process.pid).forEach(kill)
  tell(ctx, chat, memory)
}
