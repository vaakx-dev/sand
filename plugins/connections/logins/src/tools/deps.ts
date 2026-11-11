import type { Sessions } from '@sand/chats/contract'
import type { Computers } from '@sand/computers/contract'
import type { ConversationRef } from '@sand/engine/contract'
import { z } from 'zod'
import type { LoginsRuntime } from '../service'
import type { CodeAnswer, SecretAnswer, Waits } from '../waits'

export const group = 'logins'

export interface ToolDeps {
  logins: LoginsRuntime
  sessions(): Sessions | undefined
  computers(): Computers | undefined
  secrets: Waits<SecretAnswer>
  codes: Waits<CodeAnswer>
  needs(conversation: ConversationRef, text: string): void
}

export const loginInput = z.string().trim().min(1).describe('The id of a login from logins')

export const computerInput = z.string().trim().min(1).optional().describe('The id of a browser from computer_list; leave it out for the browser')

export const fillerOf = ({ computers }: ToolDeps, id: string | undefined) => {
  const found = computers()
  const chosen = id ?? found?.list().find(info => info.kind === 'browser')?.id
  const computer = chosen === undefined ? undefined : found?.get(chosen)
  const fill = computer?.fill?.bind(computer)
  if (!fill) throw new Error(chosen ? `${chosen} can't fill in logins: name a browser from computer_list.` : 'No browser is available to fill the login into.')
  return fill
}
