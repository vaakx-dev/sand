import { projectContext, sessions, type ContextProjection, type ContextProjector, type ContextRecord, type Session } from '@sand/chats/contract'
import { turnPrompt } from '@sand/turns-contract/contract'
import { definePlugin } from 'drydock'
import { contextKinds, type ContextKind } from './contract'
import { fileKind } from './file'
import { threadKind } from './thread'

const titlePattern = /^\p{L}[\p{L}\p{N} -]{0,39}$/u

export default definePlugin({
  name: 'context',
  description: 'Turns context links in a prompt into markers and one context envelope the model reads',
  inject: { sessions },
  apply(ctx) {
    const kinds = new Map<string, ContextKind>()

    const register = (kind: ContextKind) => {
      if (!titlePattern.test(kind.title)) throw new Error(`Context kind ${kind.kind} has a title markers can't hold: ${kind.title}`)
      kinds.set(kind.kind, kind)
      return () => {
        if (kinds.get(kind.kind) === kind) kinds.delete(kind.kind)
      }
    }

    const projectorOf = (session: Session) => (name: string): ContextProjector | undefined => {
      const kind = kinds.get(name)
      if (!kind) return undefined
      const project = (record: ContextRecord) =>
        Promise.try(() => kind.project(record, session)).catch((error): ContextProjection => {
          ctx.report(error)
          return { unavailable: 'Could not be read.' }
        })
      return { title: kind.title, project }
    }

    ctx.provide(contextKinds, { register })
    ctx.effect(() => register(fileKind))
    ctx.effect(() => register(threadKind(ctx.sessions)))
    ctx.on(turnPrompt, (content, session) => projectContext(content, projectorOf(session)), { priority: -10 })
  },
})
