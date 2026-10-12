import type { AppPlan, AppStatus, LoginAccount, LoginConflict, LoginPending, LoginSignIn } from '../contract'
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

export const appAccount = ({ id, label, provider, signIn }: OwnInfo, plan: AppPlan, found: AppStatus, status: Status): LoginAccount => ({
  id,
  kind: id,
  provider,
  label,
  signedIn: found.signedIn,
  shared: false,
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
  method: 'server',
  url: entry.url,
  ...status,
})
