import { type AppCall, type AppOutput, type AppPlan, type AppSession, type AppSetup, type LimitWindow, type ProviderCapabilities, UsageLimited } from '@sand/accounts/contract'
import type { ToolResultContent } from '@sand/chats/contract'
import { appendFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { LimitScript, NativeCall, Reply, Script } from './contract'
import { planModels } from './models'

const said = (reply: Reply) => reply.flatMap(part => (part.type === 'text' ? [part.text] : [])).join('')

const windowOf = ({ id, label, used, resetInMs, durationMs }: LimitScript): LimitWindow => ({
  id,
  label,
  used,
  ...(resetInMs !== undefined && { resetsAt: Date.now() + resetInMs }),
  ...(durationMs !== undefined && { duration: durationMs }),
})

const textOf = (content: ToolResultContent[]) => content.map(block => (block.type === 'text' ? block.text : `[${block.type}]`)).join('\n')

export const replayApp = (script: Script, folder: string) => {
  const { id, label = id, logo, limits, replies, resume, inject } = script
  const queue = [...replies]
  const injects = [...inject]
  const calls: NativeCall[] = []
  let made = 0
  let opened = 0
  const caps: ProviderCapabilities = { native: true, resume, inject: inject.length > 0, steer: true, reconfigure: [], processScope: 'thread', cacheTtlMs: 5 * 60_000 }

  const fileOf = (native: string) => join(folder, `${native}.jsonl`)

  const session = (setup: AppSetup, out: AppOutput, reopened?: string): AppSession => {
    const waiting = new Set<string>()
    const native = reopened ?? (setup.persist ? `${id}-thread-${++opened}` : undefined)

    const keep = (call: AppCall) => {
      if (native) appendFileSync(fileOf(native), `${JSON.stringify(call)}\n`)
    }

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
            keep(call)
            out.call(call)
            break
          }
          case 'usage':
            out.usage({ input: part.input, output: part.output })
            break
          case 'error':
            return out.fail(new Error(part.message))
          case 'limit':
            return out.fail(new UsageLimited(`${label} is out of usage`, part.resetInMs && Date.now() + part.resetInMs))
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
      async aside(prompt) {
        calls.push({ type: 'aside', text: prompt })
        const reply = queue.shift()
        if (!reply) throw new Error(`${label} has no scripted reply left`)
        return { text: said(reply), usage: {} }
      },
      async interrupt() {
        calls.push({ type: 'interrupt' })
      },
      async close() {
        calls.push({ type: 'close' })
      },
    }
  }

  const plan: AppPlan = {
    id,
    label,
    name: label,
    detail: 'Plays scripted replies',
    logo,
    app: label,
    install: '',
    caps,
    status: async () => ({ installed: true, signedIn: true, ...(script.plan && { plan: script.plan }) }),
    ...(limits && { usage: async () => ({ windows: limits.map(windowOf) }) }),
    signIn: () => Promise.reject(new Error(`${label} needs no sign-in`)),
    signOut: async () => {},
    models: async () => planModels(script),
    sessionFiles: async native => (existsSync(fileOf(native)) ? [fileOf(native)] : []),
    async open(setup, out, reopened) {
      calls.push({ type: 'open', cwd: setup.cwd, ...(reopened && { resume: reopened }) })
      return session(setup, out, reopened)
    },
  }
  return { plan, calls }
}
