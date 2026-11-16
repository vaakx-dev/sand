import type { AccountKind } from './login'

interface SignIn {
  kind: AccountKind
  email?: string
}

export const sameSignIn = (one: SignIn, other: SignIn) => !!one.email && one.kind === other.kind && one.email === other.email
