import { bots } from '@sand/bots/contract'
import { sessions } from '@sand/chats/contract'
import { notify } from '@sand/devices-notify/contract'
import { type ConversationRef, engine } from '@sand/engine/contract'
import { runtimeDrain } from '@sand/host-runtimes/contract'
import { ledger } from '@sand/ledger/contract'
import { orchestrator } from '@sand/orchestrator/contract'
import { server } from '@sand/server/contract'
import { subModel } from '@sand/sub-model/contract'
import { tools } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { type Decision, modeWire, permissionAsked, permissions, questionsWire, settingsWire } from './contract'
import { createGate } from './gate'
import { createQuestions } from './questions'
import { reviewCall } from './review'
import { createScopes } from './scope'
import { servePermissions } from './serve'
import { createService } from './service'
import { openStores } from './store'
import { modeTool, toolGroup } from './tool'

const KEEP_FOR_MS = 90 * 24 * 60 * 60 * 1000
const PRUNE_EVERY_MS = 60 * 60 * 1000

export default definePlugin({
  name: 'permissions',
  description:
    'Permission modes for threads and bots: off, ask (asks the user before risky calls, with saved rules and a deadline) and auto (the sub model decides what would have asked); stricter defaults for threads a bot starts, and a log of every decision',
  inject: { ledger, tools, engine },
  apply(ctx) {
    const stores = openStores(ctx.ledger)
    const scopes = createScopes(stores, () => ctx.get(orchestrator))
    const questions = createQuestions()
    ctx.effect(() => questions.stop)
    ctx.on(runtimeDrain, questions.move)

    const title = ({ owner, id }: ConversationRef) => (owner === 'thread' ? ctx.get(sessions)?.open(id)?.title : ctx.get(bots)?.get(id)?.name) || id
    const questionsChanged = () => ctx.get(server)?.broadcast(questionsWire, service.questions())
    const notifyAsked = (decision: Decision) =>
      void ctx
        .get(notify)
        ?.send({
          kind: 'needs',
          ...(decision.owner === 'thread' ? { thread: decision.conversation } : { bot: decision.conversation }),
          title: decision.title,
          text: `Allow ${decision.tool}? ${decision.summary}`,
        })
        .catch(error => ctx.report(error))

    const service = createService({
      stores,
      scopes,
      questions,
      engine: ctx.engine,
      tx: ctx.ledger.tx,
      title,
      questionsChanged,
      modeChanged: conversation => ctx.get(server)?.broadcast(modeWire, conversation),
      settingsChanged: () => ctx.get(server)?.broadcast(settingsWire, service.settings()),
    })

    ctx.effect(() =>
      ctx.tools.gate(
        createGate({
          stores,
          scopes,
          questions,
          secrets: () => ctx.tools.secrets(),
          review: request => {
            const found = ctx.get(subModel)
            return found && reviewCall(found, request)
          },
          title,
          asked(decision) {
            ctx.emit(permissionAsked, decision)
            questionsChanged()
            notifyAsked(decision)
          },
          changed: questionsChanged,
        }),
      ),
    )
    ctx.effect(() => ctx.tools.group(toolGroup))
    ctx.effect(() => ctx.tools.register(modeTool(() => service)))
    ctx.effect(() => {
      const prune = () => stores.decisions.prune(Date.now() - KEEP_FOR_MS)
      prune()
      const timer = setInterval(prune, PRUNE_EVERY_MS)
      return () => clearInterval(timer)
    })
    ctx.provide(permissions, service)
    ctx.watch(server, found => found && servePermissions(found, service))
  },
})
