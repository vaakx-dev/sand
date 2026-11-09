import { type ContextRecord, contextLink, type Prompt, type UserContent } from '@sand/chats/contract'
import type { ConversationRef, Owner } from '@sand/engine/contract'
import { uuid } from '@sand/util'
import type { OrchestratorContext } from './context'
import { failure, type Notice, type OwnerKind } from './contract'
import type { Starters } from './starters'

const signed = (prompt: Prompt, record: ContextRecord): UserContent[] => {
  const link = contextLink(record)
  const content: UserContent[] = typeof prompt === 'string' ? [{ type: 'text', text: `${link} ${prompt}` }] : [{ type: 'text', text: link }, ...prompt]
  return [...content, { type: 'context', records: [record] }]
}

export const createOwners = (ctx: OrchestratorContext, starters: Starters) => {
  const kinds = new Map<Owner, OwnerKind>()

  const register = (owner: Owner, kind: OwnerKind) => {
    kinds.set(owner, kind)
    return () => void (kinds.get(owner) === kind && kinds.delete(owner))
  }

  ctx.effect(() =>
    register('thread', {
      deliver(id, { text, clientRequestId }) {
        const session = ctx.sessions.open(id)
        return session && ctx.turns.send(session, { prompt: text, origin: 'job', clientRequestId })
      },
      label: id => ctx.sessions.open(id)?.title,
      history: id => ctx.sessions.open(id)?.path(),
    }),
  )

  const deliver = async ({ owner, id }: ConversationRef, notice: Notice) => {
    const kind = kinds.get(owner)
    if (!kind) return false
    await kind.deliver(id, notice)
    return true
  }

  return {
    register,
    deliver,
    sign(prompt: Prompt, from: ConversationRef | undefined): Prompt {
      if (!from) return prompt
      const kind = kinds.get(from.owner)
      if (!kind) throw failure('invalid_request', `Nothing speaks for ${from.owner} conversations`)
      return signed(prompt, { v: 1, id: uuid(), kind: from.owner, label: kind.label(from.id) || from.owner, data: { id: from.id, sent: true } })
    },
    history({ owner, id }: ConversationRef) {
      const entries = kinds.get(owner)?.history(id)
      if (!entries) throw failure('not_found', `No ${owner} ${id}`)
      return entries
    },
    home: (from: ConversationRef | undefined) => from && kinds.get(from.owner)?.project?.(from.id),
    async notify(thread: string, notice: Notice) {
      const starter = starters.of(thread)
      return starter ? deliver(starter, notice) : false
    },
  }
}

export type Owners = ReturnType<typeof createOwners>
