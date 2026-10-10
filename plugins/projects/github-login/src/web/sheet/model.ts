import { derive, effect, sig, untrack } from '@sand/dom'
import type { GithubFound } from '../../contract'
import type { GithubControl } from '../state'

export type Phase = 'finding' | 'found' | 'starting' | 'device' | 'error'

export const signInModel = (control: GithubControl, done: (text?: string) => void) => {
  const found = sig<GithubFound | undefined>(undefined)
  const started = sig(false)
  const busy = sig(false)

  const start = async () => {
    started.set(true)
    busy.set(true)
    await control.run({ type: 'github.start' })
    busy.set(false)
  }

  const use = async () => {
    busy.set(true)
    const ok = await control.run({ type: 'github.use' })
    busy.set(false)
    if (ok) done(`Signed in to GitHub as ${found.get()?.login}`)
  }

  const cancel = () => {
    if (started.get() && !control.state.get()?.login) void control.run({ type: 'github.cancel' })
  }

  const phase = derive((): Phase => {
    const state = control.state.get()
    if (started.get()) return state?.pending ? 'device' : state?.error && !busy.get() ? 'error' : 'starting'
    const local = found.get()
    return !local ? 'finding' : local.login ? 'found' : 'starting'
  })

  const key = derive(() => {
    const state = control.state.get()
    return [phase.get(), state?.pending?.code ?? '', state?.error ?? ''].join(':')
  })

  effect(() => {
    const login = control.state.get()?.login
    if (started.get() && login) untrack(() => queueMicrotask(() => done(`Signed in to GitHub as ${login}`)))
  })

  void control.find().then(local => {
    found.set(local)
    if (!local.login) void start()
  })

  return { found, busy, phase, key, start, use, cancel, state: control.state }
}

export type SignInModel = ReturnType<typeof signInModel>
