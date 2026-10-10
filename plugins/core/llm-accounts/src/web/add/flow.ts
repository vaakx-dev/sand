import { effect, sig, untrack, type Sig } from '@sand/dom'
import type { SignInKind } from '../../contract'
import type { LoginControl } from '../state'
import type { SignInActions } from './sign-in'
import type { Step } from './steps'

export const signInFlow = (control: LoginControl, step: Sig<Step>, done: (text?: string) => void) => {
  const busy = sig(false)
  const touched = new Set<SignInKind>()
  let waited = false

  const run = async (work: () => Promise<void>) => {
    busy.set(true)
    try {
      await work()
    } finally {
      busy.set(false)
    }
  }

  const start = (account: SignInKind, anyway = false) => {
    touched.add(account)
    waited = false
    step.set({ kind: 'sign-in', account })
    return run(() => control.run({ type: 'login.start', account, ...(anyway && { anyway: true }) }))
  }

  const cancel = () => {
    for (const account of touched) {
      const found = control.account(account)
      if (found?.pending || found?.conflict) void control.run({ type: 'login.cancel', account })
    }
    touched.clear()
  }

  effect(() => {
    const current = step.get()
    const found = current.kind === 'sign-in' ? control.account(current.account) : undefined
    if (!found) return
    if (found.pending) waited = true
    else if (waited && found.signedIn && found.method === 'oauth') untrack(() => queueMicrotask(() => done(`Signed in to ${found.label}`)))
  })

  const actionsFor = (account: SignInKind): SignInActions => ({
    keep: () => void run(() => control.run({ type: 'login.cancel', account })).then(() => done()),
    anyway: () => void start(account, true),
    retry: () => void start(account),
  })

  return { busy, start, cancel, actionsFor }
}
