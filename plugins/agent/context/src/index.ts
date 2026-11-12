import { projectContext, sessions, type ContextProjection, type ContextProjector, type ContextRecord, type UserContent } from '@sand/chats/contract'
import { turnPrompt } from '@sand/turns-contract/contract'
import { definePlugin } from 'drydock'
import { contextKinds, type ContextKind, type Reader } from './contract'
import { fileKind } from './file'
import { kindRegistry } from './registry'
import { threadKind } from './thread'

const titlePattern = /^\p{L}[\p{L}\p{N} -]{0,39}$/u

export default definePlugin({
  name: 'context',
  description: 'Turns context links in a prompt into markers and one context envelope the model reads',
  inject: { sessions },
  apply(ctx) {
    const kinds = kindRegistry<ContextKind>()

    const register = (kind: ContextKind) => {
      if (!titlePattern.test(kind.title)) throw new Error(`Context kind ${kind.kind} has a title markers can't hold: ${kind.title}`)
      return kinds.register(kind)
    }

    const projectorOf = (reader: Reader) => (name: string): ContextProjector | undefined => {
      const kind = kinds.get(name)
      if (!kind) return undefined
      const project = (record: ContextRecord) =>
        Promise.try(() => kind.project(record, reader)).catch((error): ContextProjection => {
          ctx.report(error)
          return { unavailable: 'Could not be read.' }
        })
      return { title: kind.title, project }
    }

    const project = (content: UserContent[], reader: Reader) => projectContext(content, projectorOf(reader))

    ctx.provide(contextKinds, { register, project })
    ctx.effect(() => register(fileKind))
    ctx.effect(() => register(threadKind(ctx.sessions)))
    ctx.on(turnPrompt, project, { priority: -10 })
  },
})
