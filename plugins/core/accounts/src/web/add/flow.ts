import { effect, onTimeout, sig, type Sig } from '@vaakx-dev/vrui'
import { loginCancel, loginStart } from '../../contract'
import { whileBusy } from '../parts'
import type { LoginControl } from '../state'
import type { SignInActions } from './sign-in'
import type { Step } from './steps'

export const signInFlow = (control: LoginControl, step: Sig<Step>, done: () => void) => {
  const busy = sig(false)
  const touched = new Set<string>()
  let waited = false

  const start = (account: string, anyway = false) => {
    touched.add(account)
    waited = false
    step.set({ kind: 'sign-in', account })
    return whileBusy(busy, () => control.run(loginStart, { account, ...(anyway && { anyway: true }) }))
  }

  const cancel = () => {
    for (const account of touched) {
      const found = control.account(account)
      if (found?.pending || found?.conflict) void control.run(loginCancel, { account })
    }
    touched.clear()
  }

  effect(() => {
    const current = step.get()
    const found = current.kind === 'sign-in' ? control.account(current.account) : undefined
    if (!found) return
    if (found.pending) waited = true
    else if (waited && found.signedIn && (found.method === 'oauth' || found.method === 'app')) onTimeout(done)
  })

  const actionsFor = (account: string): SignInActions => ({
    keep: () => void whileBusy(busy, () => control.run(loginCancel, { account })).then(done),
    anyway: () => void start(account, true),
    retry: () => void start(account),
  })

  return { busy, start, cancel, actionsFor }
}
