import type { AppOutput, AppPlan, AppSession, AppSetup, ProviderCapabilities } from '@sand/accounts/contract'
import type { ToolResultContent } from '@sand/chats/contract'
import type { NativeCall, Reply, Script } from './contract'

const textOf = (content: ToolResultContent[]) => content.map(block => (block.type === 'text' ? block.text : `[${block.type}]`)).join('\n')

export const replayApp = ({ id, label = id, models, replies, resume, inject }: Script) => {
  const queue = [...replies]
  const injects = [...inject]
  const calls: NativeCall[] = []
  let made = 0
  let opened = 0
  const caps: ProviderCapabilities = { native: true, resume, inject: inject.length > 0, steer: true, reconfigure: [], processScope: 'thread', cacheTtlMs: 5 * 60_000 }

  const session = (setup: AppSetup, out: AppOutput, reopened?: string): AppSession => {
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
            const call = { id: part.id ?? `${id}-${++made}`, name: part.name, input: part.input }
            waiting.add(call.id)
            out.call(call)
            break
          }
          case 'usage':
            out.usage({ input: part.input, output: part.output })
            break
          case 'error':
            return out.fail(new Error(part.message))
          case 'crash':
            return out.exit(new Error(`${label} crashed`))
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

    const injecting = async ({ text }: { text: string }) => {
      const outcome = injects.length > 1 ? injects.shift() : injects[0]
      if (outcome === 'error') throw new Error(`${label} refused the handoff`)
      if (outcome === 'missing') return false
      calls.push({ type: 'inject', text })
      return true
    }

    const native = reopened ?? (setup.persist ? `${id}-thread-${++opened}` : undefined)
    return {
      ...(native && { id: native }),
      send(content) {
        calls.push({ type: 'send', text: textOf(content) })
        next()
      },
      steer: content => void calls.push({ type: 'steer', text: textOf(content) }),
      answer(callId, result) {
        calls.push({ type: 'answer', id: callId, text: textOf(result.content) })
        waiting.delete(callId)
        if (!waiting.size) next()
      },
      ...(caps.inject && { inject: injecting }),
      async interrupt() {
        calls.push({ type: 'interrupt' })
      },
      close: () => void calls.push({ type: 'close' }),
    }
  }

  const plan: AppPlan = {
    id,
    label,
    name: label,
    detail: 'Plays scripted replies',
    logo: 'replay',
    app: label,
    install: '',
    caps,
    status: async () => ({ installed: true, signedIn: true }),
    signIn: () => Promise.reject(new Error(`${label} needs no sign-in`)),
    signOut: async () => {},
    models: async () => models.map(name => ({ name, label: name })),
    async open(setup, out, reopened) {
      calls.push({ type: 'open', cwd: setup.cwd, ...(reopened && { resume: reopened }) })
      return session(setup, out, reopened)
    },
  }
  return { plan, calls }
}
