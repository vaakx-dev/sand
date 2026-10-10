import type { KeyKind, LoginAccount, ServerDraft, ServerProvider, SignInKind } from '../../contract'

export type Step =
  | { kind: 'choose' }
  | { kind: 'sign-in'; account: SignInKind }
  | { kind: 'key'; account: KeyKind }
  | { kind: 'detect' }
  | { kind: 'server'; draft: ServerDraft }

export const customServer: Step = { kind: 'server', draft: { name: '', url: '', provider: 'server' } }

const isServerProvider = (value: string): value is ServerProvider => value === 'ollama' || value === 'lmstudio' || value === 'server'

const draftOf = ({ id, label, url, provider }: LoginAccount): ServerDraft => ({
  id,
  name: label,
  url: url ?? '',
  ...(isServerProvider(provider) && { provider }),
})

export const stepFor = (account: LoginAccount): Step => {
  if (account.kind === 'claude' || account.kind === 'codex') return { kind: 'sign-in', account: account.kind }
  if (account.kind === 'server') return { kind: 'server', draft: draftOf(account) }
  return { kind: 'key', account: account.kind }
}
