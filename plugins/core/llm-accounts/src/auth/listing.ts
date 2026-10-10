import type { LoginAccount, LoginConflict, LoginPending } from '../contract'
import { envNames } from './env'
import { fixedLabels, logos, type FixedId } from './kinds'
import type { Credential, ServerEntry } from './store'

export interface Status {
  pending?: LoginPending
  conflict?: LoginConflict
  error?: string
}

export interface FixedState {
  credential?: Credential
  fromEnv: boolean
  shared: boolean
  status: Status
}

export const fixedAccount = (id: FixedId, { credential, fromEnv, shared, status }: FixedState): LoginAccount => {
  const oauth = credential?.type === 'oauth' ? credential : undefined
  return {
    id,
    kind: id,
    provider: logos[id],
    label: fixedLabels[id],
    signedIn: !!credential,
    shared,
    ...(credential && { method: credential.type }),
    ...(credential && fromEnv && { env: envNames[id] }),
    ...(oauth?.email && { email: oauth.email }),
    ...(oauth?.plan && { plan: oauth.plan }),
    ...status,
  }
}

export const serverAccount = (entry: ServerEntry, status: Status): LoginAccount => ({
  id: entry.id,
  kind: 'server',
  provider: entry.provider,
  label: entry.name,
  signedIn: true,
  shared: entry.shared !== false,
  method: 'server',
  url: entry.url,
  ...status,
})
