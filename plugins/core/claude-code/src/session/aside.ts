import type { AppAside, AppOutput, AppSession, Usage } from '@sand/accounts/contract'
import { untilAborted } from '@sand/util'

const noUsage = (): Usage => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })

const added = (total: Usage, more: Partial<Usage>): Usage => ({
  input: total.input + (more.input ?? 0),
  output: total.output + (more.output ?? 0),
  cacheRead: total.cacheRead + (more.cacheRead ?? 0),
  cacheWrite: total.cacheWrite + (more.cacheWrite ?? 0),
})

const collector = () => {
  const reply = Promise.withResolvers<AppAside>()
  let text = ''
  let usage = noUsage()
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

export const askAside = async (open: (output: AppOutput) => Promise<AppSession>, prompt: string, signal?: AbortSignal): Promise<AppAside> => {
  const { output, reply } = collector()
  const session = await open(output)
  try {
    session.send([{ type: 'text', text: prompt }])
    return await (signal ? untilAborted(reply, signal) : reply)
  } finally {
    session.close()
  }
}
