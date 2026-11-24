import type { AppAside, AppOutput, AppSession, Usage } from '@sand/accounts/contract'
import { untilAborted } from '@sand/util'

const added = (total: Partial<Usage>, more: Partial<Usage>): Partial<Usage> => ({
  input: (total.input ?? 0) + (more.input ?? 0),
  output: (total.output ?? 0) + (more.output ?? 0),
  cacheRead: (total.cacheRead ?? 0) + (more.cacheRead ?? 0),
  cacheWrite: (total.cacheWrite ?? 0) + (more.cacheWrite ?? 0),
})

const collector = () => {
  const reply = Promise.withResolvers<AppAside>()
  let text = ''
  let usage: Partial<Usage> = {}
  const output: AppOutput = {
    text: more => {
      text += more
    },
    thinking: () => {},
    call: () => {},
    usage: more => {
      usage = added(usage, more)
    },
    pause: () => reply.resolve({ text: '', usage }),
    finish: () => reply.resolve({ text, usage }),
    fail: error => reply.reject(error),
    exit: error => reply.reject(error),
  }
  return { output, reply: reply.promise }
}

const forkedAside = async (fork: (output: AppOutput) => Promise<AppSession>, prompt: string, signal?: AbortSignal): Promise<AppAside> => {
  const { output, reply } = collector()
  const session = await fork(output)
  try {
    session.send([{ type: 'text', text: prompt }])
    return await (signal ? untilAborted(reply, signal) : reply)
  } finally {
    void session.close()
  }
}

export { forkedAside }
