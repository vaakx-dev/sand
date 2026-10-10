import { derive, effect, onTimeout, registerInScope, sig } from '@sand/dom'
import type { GithubFound } from '../../contract'
import type { GithubControl } from '../state'

type Phase = 'finding' | 'found' | 'starting' | 'device' | 'error'

export const signInModel = (control: GithubControl, done: (text?: string) => void) => {
  const found = sig<GithubFound | undefined>(undefined)
  const started = sig(false)
  const busy = sig(false)
  let closed = false
  registerInScope(() => (closed = true))

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

  const startedPhase = (): Phase => {
    const state = control.state.get()
    if (state?.pending) return 'device'
    return state?.error && !busy.get() ? 'error' : 'starting'
  }

  const phase = derive((): Phase => {
    if (started.get()) return startedPhase()
    const local = found.get()
    if (!local) return 'finding'
    return local.login ? 'found' : 'starting'
  })

  const key = derive(() => {
    const state = control.state.get()
    return [phase.get(), state?.pending?.code ?? '', state?.error ?? ''].join(':')
  })

  effect(() => {
    const login = control.state.get()?.login
    if (started.get() && login) onTimeout(() => done(`Signed in to GitHub as ${login}`), 0)
  })

  void control.find().then(local => {
    if (closed) return
    if (!local) return done()
    found.set(local)
    if (!local.login) void start()
  })

  return { found, busy, phase, key, start, use, cancel, state: control.state }
}

export type SignInModel = ReturnType<typeof signInModel>
