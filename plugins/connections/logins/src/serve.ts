import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import { askDecline, askWaiting, codeAnswer, loginAdd, loginChange, loginRemove, loginsState, loginUses, secretSave } from './contract'
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
      found.handle(loginsState, () => logins.state()),
      found.handle(loginAdd, input => logins.add(input)),
      found.handle(loginChange, input => logins.change(input)),
      found.handle(loginRemove, ({ id }) => logins.remove(id)),
      found.handle(loginUses, ({ id }) => logins.uses(id)),
      found.handle(askWaiting, ({ session, id }) => secrets.waiting(session, id) || codes.waiting(session, id)),
      found.handle(askDecline, ({ session, id }) => (secrets.waiting(session, id) ? secrets : codes).answer(session, id)({ status: 'declined' })),
      found.handle(secretSave, ({ session, id, ...answer }) => secrets.answer(session, id)({ status: 'answered', answer })),
      found.handle(codeAnswer, ({ session, id, ...answer }) =>
        codes.answer(session, id)({ status: 'answered', answer: 'code' in answer ? { code: answer.code.replace(/\s/g, '') } : answer }),
      ),
    )
  })
