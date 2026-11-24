import type { AppOutput } from '@sand/accounts/contract'
import type { Json } from '@sand/app-plan'
import type { Connection } from '../cli/connection'

const windowOf = (usage: Json) => Number(usage.rawMaxTokens ?? 0)

export const reportWindow = (connection: Pick<Connection, 'request'>, output: Pick<AppOutput, 'context'>) =>
  connection.request('get_context_usage').then(
    usage => {
      const window = windowOf(usage)
      if (window) output.context({ window })
    },
    () => {},
  )
