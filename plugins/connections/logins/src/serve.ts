import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import {
  askDecline,
  askWaiting,
  codeAnswer,
  loginAdd,
  loginChange,
  loginPick,
  loginRemove,
  loginsState,
  loginUses,
  secretSave,
  sourceConnect,
  sourceDisconnect,
  sourceSearch,
} from './contract'
import type { LoginsRuntime } from './service'
import type { CodeAnswer, SecretAnswer, Waits } from './waits'

export interface Asks {
  secrets: Waits<SecretAnswer>
  codes: Waits<CodeAnswer>
}

export const serveLogins = (ctx: Context, logins: LoginsRuntime, { secrets, codes }: Asks) =>
  ctx.watch(server, found => {
    if (!found) return
    return joinDisposers(
      found.handle(loginsState, async (_, { actor }) => {
        await logins.refresh()
        return logins.state(actor)
      }),
      found.handle(loginAdd, (input, { actor }) => logins.add(input, actor)),
      found.handle(loginPick, (input, { actor }) => logins.pick(input, actor)),
      found.handle(sourceConnect, ({ source, secret }) => logins.connect(source, secret)),
      found.handle(sourceDisconnect, ({ source }) => logins.disconnect(source)),
      found.handle(sourceSearch, ({ source, query }) => logins.search(source, query)),
      found.handle(loginChange, input => logins.change(input)),
      found.handle(loginRemove, ({ id }) => logins.remove(id)),
      found.handle(loginUses, ({ id }) => logins.uses(id)),
      found.handle(askWaiting, ({ session }) => [...secrets.waiting(session), ...codes.waiting(session)]),
      found.handle(askDecline, ({ session, id }) => (secrets.has(session, id) ? secrets : codes).answer(session, id)({ status: 'declined' })),
      found.handle(secretSave, ({ session, id, ...answer }) => secrets.answer(session, id)({ status: 'answered', answer })),
      found.handle(codeAnswer, ({ session, id, ...answer }) =>
        codes.answer(session, id)({ status: 'answered', answer: 'code' in answer ? { code: answer.code.replace(/\s/g, '') } : answer }),
      ),
    )
  })
