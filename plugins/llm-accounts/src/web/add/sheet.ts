import { derive, div, dynamicChild, effect, icon, iconButton, overlay, place, sheet, sheetHead, show, sig, untrack } from '@sand/dom'
import type { LoginProvider } from '@sand/protocol'
import type { Context, Dispose } from 'drydock'
import type { LoginControl } from '../state'
import { chooseStep } from './choose'
import { keyStep } from './key'
import { phaseOf, signInView } from './sign-in'

type Step = { kind: 'choose' } | { kind: 'sign-in'; provider: LoginProvider } | { kind: 'key' }

const names: Record<LoginProvider, string> = { anthropic: 'Claude', openai: 'ChatGPT' }
const keyNames: Record<LoginProvider, string> = { anthropic: 'Anthropic', openai: 'OpenAI' }

const sheetView = (control: LoginControl, done: (text?: string) => void, first?: LoginProvider) => {
  const step = sig<Step>({ kind: 'choose' })
  const busy = sig(false)
  const touched = new Set<LoginProvider>()
  let waited = false

  const account = (provider: LoginProvider) => control.state.get()?.accounts.find(found => found.provider === provider)
  const shown = () => {
    const current = step.get()
    return current.kind === 'sign-in' ? current.provider : undefined
  }

  const run = async (work: () => Promise<void>) => {
    busy.set(true)
    try {
      await work()
    } finally {
      busy.set(false)
    }
  }

  const start = (provider: LoginProvider, anyway = false) => {
    touched.add(provider)
    waited = false
    step.set({ kind: 'sign-in', provider })
    return run(() => control.run({ type: 'login.start', provider, ...(anyway && { anyway: true }) }))
  }

  const cancelStarted = () => {
    for (const provider of touched) {
      const found = account(provider)
      if (found?.pending || found?.conflict) void control.run({ type: 'login.cancel', provider })
    }
    touched.clear()
  }

  const close = () => {
    cancelStarted()
    done()
  }

  const back = () => {
    cancelStarted()
    step.set({ kind: 'choose' })
  }

  effect(() => {
    const provider = shown()
    const found = provider && account(provider)
    if (!found) return
    if (found.pending) waited = true
    else if (waited && found.signedIn && found.method === 'oauth') untrack(() => queueMicrotask(() => done(`Signed in to ${found.subscription}`)))
  })

  const title = derive(() => {
    const current = step.get()
    if (current.kind === 'choose') return 'Add account'
    if (current.kind === 'key') return 'Add an API key'
    return account(current.provider)?.conflict ? names[current.provider] : `Sign in to ${names[current.provider]}`
  })

  const bodyKey = derive(() => {
    const current = step.get()
    if (current.kind !== 'sign-in') return current.kind
    const found = account(current.provider)
    return `sign-in:${current.provider}:${phaseOf(found)}:${found?.pending?.url ?? ''}`
  })

  const body = () => {
    const current = untrack(() => step.get())
    if (current.kind === 'choose') return chooseStep(untrack(() => control.state.get()), provider => void start(provider), () => step.set({ kind: 'key' }))
    if (current.kind === 'key') return keyStep(control, provider => done(`Saved the ${keyNames[provider]} API key`))
    const provider = current.provider
    return signInView(phaseOf(untrack(() => account(provider))), () => account(provider), control, {
      keep: () => void run(() => control.run({ type: 'login.cancel', provider })).then(() => done()),
      anyway: () => void start(provider, true),
      retry: () => void start(provider),
    }, busy)
  }

  if (first) void start(first)

  return overlay(
    close,
    sheet(
      { 'aria-label': 'Add account', class: 'max-w-md' },
      sheetHead(
        () => title.get(),
        close,
        show(
          derive(() => step.get().kind !== 'choose'),
          () => iconButton({ title: 'Back', onClick: back }, icon('back')),
        ),
      ),
      div({ class: 'flex min-h-0 flex-col gap-4 overflow-auto px-5 pt-1 pb-5' }, dynamicChild(bodyKey, body)),
    ),
  )
}

export const addAccount = (ctx: Context, control: LoginControl) => {
  let unplace: Dispose | undefined
  const close = () => {
    void unplace?.()
    unplace = undefined
  }
  const finished = (text?: string) => {
    close()
    if (text) ctx.notify?.push(text)
  }
  const open = (provider?: LoginProvider) => {
    close()
    unplace = place(ctx, 'overlay', () => sheetView(control, finished, provider), 100)
  }
  ctx.effect(() => close)
  return { open }
}

export type AddAccount = ReturnType<typeof addAccount>
