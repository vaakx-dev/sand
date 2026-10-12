import type { Kit } from '@sand/ui-kit/contract'
import { derive, dynamicChild, sig, untrack } from '@vaakx-dev/vrui'
import type { ServerDraft } from '../../contract'
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

const serverTitle = ({ id, name }: ServerDraft) => {
  if (id) return `Edit ${name}`
  return name ? `Add ${name}` : 'Add a server'
}

const titleOf = (step: Step, conflict: boolean) => {
  if (step.kind === 'choose') return 'Add an account'
  if (step.kind === 'key') return `Add an ${keyNames[step.account]} API key`
  if (step.kind === 'detect') return 'Ollama or LM Studio'
  if (step.kind === 'server') return serverTitle(step.draft)
  return conflict ? planNames[step.account] : `Sign in to ${planNames[step.account]}`
}

export const addFlow = (control: LoginControl, done: (text?: string) => void) => {
  const step = sig<Step>(choose)
  const flow = signInFlow(control, step, done)

  const go = (next: Step) => {
    if (next.kind === 'sign-in') void flow.start(next.account)
    else step.set(next)
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

  const body = (kit: Kit) => {
    const { sheetStep } = kit
    const current = untrack(() => step.get())
    if (current.kind === 'choose') return sheetStep(chooseStep(kit, untrack(() => control.state.get()), go))
    if (current.kind === 'key') return keyStep(kit, control, current.account, () => done(`Saved the ${keyNames[current.account]} API key`))
    if (current.kind === 'detect')
      return detectStep(kit, control, server => go({ kind: 'server', draft: { name: server.name, url: server.url, provider: server.provider } }), () => go(customServer))
    if (current.kind === 'server') return serverStep(kit, control, current.draft, name => done(current.draft.id ? `Saved ${name}` : `Added ${name}`))
    const phase = phaseOf(untrack(() => control.account(current.account)))
    return signInView(kit, current.account, phase, control, flow.actionsFor(current.account), flow.busy)
  }

  return { step, title, go, back, cancel: flow.cancel, view: (kit: Kit) => dynamicChild(bodyKey, () => body(kit)) }
}

export type AddFlow = ReturnType<typeof addFlow>
