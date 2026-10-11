import type { KeyKind, LoginAccount, ServerDraft, SignInKind } from '../../contract'
import { isServerProvider, isSignInKind } from '../../auth/kinds'

export type Step =
  | { kind: 'choose' }
  | { kind: 'sign-in'; account: SignInKind }
  | { kind: 'key'; account: KeyKind }
  | { kind: 'detect' }
  | { kind: 'server'; draft: ServerDraft }

export const customServer: Step = { kind: 'server', draft: { name: '', url: '', provider: 'server' } }

const draftOf = ({ id, label, url, provider }: LoginAccount): ServerDraft => ({
  id,
  name: label,
  url: url ?? '',
  ...(isServerProvider(provider) && { provider }),
})

export const stepFor = (account: LoginAccount): Step => {
  if (isSignInKind(account.kind)) return { kind: 'sign-in', account: account.kind }
  if (account.kind === 'server') return { kind: 'server', draft: draftOf(account) }
  return { kind: 'key', account: account.kind }
}
