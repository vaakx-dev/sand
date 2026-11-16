import type { AppPlan, AppStatus, LoginAccount, LoginConflict, LoginPending, LoginSignIn } from '../contract'
import { envNames } from './env'
import type { Credential, ServerEntry } from './store'

export interface Status {
  pending?: LoginPending
  conflict?: LoginConflict
  error?: string
}

export interface OwnInfo {
  id: string
  kind: string
  label: string
  provider: string
  added: boolean
  another: boolean
  signIn?: LoginSignIn
}

interface OwnState {
  credential?: Credential
  fromEnv: boolean
  shared: boolean
  status: Status
}

export const ownAccount = ({ id, kind, label, provider, signIn, added, another }: OwnInfo, { credential, fromEnv, shared, status }: OwnState): LoginAccount => {
  const oauth = credential?.type === 'oauth' ? credential : undefined
  return {
    id,
    kind,
    provider,
    label,
    signedIn: !!credential,
    shared,
    added,
    another,
    ...(signIn && { signIn }),
    ...(credential && { method: credential.type }),
    ...(credential && fromEnv && { env: envNames[id] }),
    ...(oauth?.email && { email: oauth.email }),
    ...(oauth?.plan && { plan: oauth.plan }),
    ...status,
  }
}

interface AppState {
  plan: AppPlan
  found: AppStatus
  shared: boolean
  status: Status
}

export const appAccount = ({ id, kind, label, provider, signIn, added, another }: OwnInfo, { plan, found, shared, status }: AppState): LoginAccount => ({
  id,
  kind,
  provider,
  label,
  signedIn: found.signedIn,
  shared,
  added,
  another,
  ...(signIn && { signIn }),
  app: { name: plan.app, installed: found.installed, install: plan.install, ...(found.problem && { problem: found.problem }) },
  ...(found.signedIn && { method: 'app' as const }),
  ...(found.email && { email: found.email }),
  ...(found.plan && { plan: found.plan }),
  ...status,
})

export const serverAccount = (entry: ServerEntry, status: Status): LoginAccount => ({
  id: entry.id,
  kind: 'server',
  provider: entry.provider,
  label: entry.name,
  signedIn: true,
  shared: entry.shared !== false,
  added: false,
  another: false,
  method: 'server',
  url: entry.url,
  ...status,
})
