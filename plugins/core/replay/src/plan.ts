import type { AppOutput, AppPlan, AppSession } from '@sand/accounts/contract'
import type { output } from 'zod'
import type { Reply, sourceSchema } from './contract'

type Script = output<typeof sourceSchema>

export const replayPlan = ({ id, label = id, models, replies }: Script): AppPlan => {
  const queue = [...replies]
  let calls = 0

  const session = (out: AppOutput): AppSession => {
    const waiting = new Set<string>()

    const play = (reply: Reply) => {
      for (const part of reply) {
        switch (part.type) {
          case 'text':
            out.text(part.text)
            break
          case 'thinking':
            out.thinking(part.text)
            break
          case 'call': {
            const call = { id: `${id}-${++calls}`, name: part.name, input: part.input }
            waiting.add(call.id)
            out.call(call)
            break
          }
          case 'usage':
            out.usage({ input: part.input, output: part.output })
            break
          case 'error':
            return out.fail(new Error(part.message))
          case 'hold':
            return
        }
      }
      if (waiting.size) out.pause()
      else out.finish()
    }

    const next = () => {
      const reply = queue.shift()
      if (reply) play(reply)
      else out.fail(new Error(`${label} has no scripted reply left`))
    }

    return {
      send: next,
      answer(callId) {
        waiting.delete(callId)
        if (!waiting.size) next()
      },
      interrupt() {},
      close() {},
    }
  }

  return {
    id,
    label,
    name: label,
    detail: 'Plays scripted replies',
    logo: 'replay',
    app: label,
    install: '',
    status: async () => ({ installed: true, signedIn: true }),
    signIn: () => Promise.reject(new Error(`${label} needs no sign-in`)),
    signOut: async () => {},
    models: async () => models.map(name => ({ name, label: name })),
    open: async (_, out) => session(out),
  }
}
