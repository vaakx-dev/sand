import type { Conversation } from '@sand/engine/contract'
import { loginValues, type Logins } from '@sand/logins/contract'

const LOGIN_MARK = /⟦login:([^⟧]+)⟧/g

const refsIn = (text: string) => [...text.matchAll(LOGIN_MARK)].map(([, ref]) => ref as string)

const jsonInner = (value: string) => JSON.stringify(value).slice(1, -1)

const withLogins = async (input: unknown, service: Logins | undefined, conversation: Conversation) => {
  const text = JSON.stringify(input)
  const refs = refsIn(text)
  if (!refs.length) return input
  if (!service) throw new Error('Saved logins are not available here')
  const values = await loginValues(service, refs, { conversation, action: 'input' })
  return JSON.parse(text.replace(LOGIN_MARK, (_, ref: string) => jsonInner(values.get(ref) ?? ''))) as unknown
}

export { withLogins }
