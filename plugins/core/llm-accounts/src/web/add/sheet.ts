import { derive, div, dynamicChild, icon, iconButton, overlay, place, sheet, sheetHead, show, sig, untrack } from '@sand/dom'
import type { Context, Dispose } from 'drydock'
import { planNames } from '../names'
import type { LoginControl } from '../state'
import { chooseStep } from './choose'
import { detectStep } from './detect'
import { signInFlow } from './flow'
import { keyNames, keyStep } from './key'
import { serverStep } from './server'
import { phaseOf, signInView } from './sign-in'
import { customServer, type Step } from './steps'

const choose: Step = { kind: 'choose' }

const titleOf = (step: Step, conflict: boolean) => {
  if (step.kind === 'choose') return 'Add account'
  if (step.kind === 'key') return `Add an ${keyNames[step.account]} API key`
  if (step.kind === 'detect') return 'Ollama or LM Studio'
  if (step.kind === 'server') return step.draft.id ? `Edit ${step.draft.name}` : step.draft.name ? `Add ${step.draft.name}` : 'Add a server'
  return conflict ? planNames[step.account] : `Sign in to ${planNames[step.account]}`
}

const sheetView = (control: LoginControl, done: (text?: string) => void, first?: Step) => {
  const step = sig<Step>(choose)
  const flow = signInFlow(control, step, done)

  const go = (next: Step) => (next.kind === 'sign-in' ? void flow.start(next.account) : step.set(next))

  const close = () => {
    flow.cancel()
    done()
  }

  const back = () => {
    flow.cancel()
    step.set(choose)
  }

  const title = derive(() => {
    const current = step.get()
    return titleOf(current, current.kind === 'sign-in' && !!control.account(current.account)?.conflict)
  })

  const bodyKey = derive(() => {
    const current = step.get()
    if (current.kind === 'key') return `key:${current.account}`
    if (current.kind === 'server') return `server:${current.draft.id ?? ''}:${current.draft.url}`
    if (current.kind !== 'sign-in') return current.kind
    const found = control.account(current.account)
    return `sign-in:${current.account}:${phaseOf(found)}:${found?.pending?.url ?? ''}`
  })

  const body = () => {
    const current = untrack(() => step.get())
    if (current.kind === 'choose') return chooseStep(untrack(() => control.state.get()), go)
    if (current.kind === 'key') return keyStep(control, current.account, () => done(`Saved the ${keyNames[current.account]} API key`))
    if (current.kind === 'detect')
      return detectStep(control, server => go({ kind: 'server', draft: { name: server.name, url: server.url, provider: server.provider } }), () => go(customServer))
    if (current.kind === 'server') return serverStep(control, current.draft, name => done(current.draft.id ? `Saved ${name}` : `Added ${name}`))
    const phase = phaseOf(untrack(() => control.account(current.account)))
    return signInView(current.account, phase, control, flow.actionsFor(current.account), flow.busy)
  }

  if (first) go(first)

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
  const open = (step?: Step) => {
    close()
    unplace = place(ctx, 'overlay', () => sheetView(control, finished, step), 100)
  }
  ctx.effect(() => close)
  return { open }
}

export type AddAccount = ReturnType<typeof addAccount>
