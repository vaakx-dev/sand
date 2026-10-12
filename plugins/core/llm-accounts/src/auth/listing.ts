import type { LoginAccount, LoginConflict, LoginPending, LoginSignIn } from '../contract'
import { envNames } from './env'
import type { Credential, ServerEntry } from './store'

export interface Status {
  pending?: LoginPending
  conflict?: LoginConflict
  error?: string
}

interface OwnInfo {
  id: string
  label: string
  provider: string
  signIn?: LoginSignIn
}

interface OwnState {
  credential?: Credential
  fromEnv: boolean
  shared: boolean
  status: Status
}

export const ownAccount = ({ id, label, provider, signIn }: OwnInfo, { credential, fromEnv, shared, status }: OwnState): LoginAccount => {
  const oauth = credential?.type === 'oauth' ? credential : undefined
  return {
    id,
    kind: id,
    provider,
    label,
    signedIn: !!credential,
    shared,
    ...(signIn && { signIn }),
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
