import type { ConnectionStatus } from '@sand/devices-contract'
import { derive, effect, onTimeout, sig, type Derive } from '@vaakx-dev/vrui'
import { agoWords, secondsUntil } from '../shared/time'
import { blockedWords } from '../status/words'
import type { Ui } from '../ui'

const grace = 2000
const triesBeforeDown = 3

export type Trouble = 'trying' | 'down' | 'blocked'

export const troubleOf = (status: ConnectionStatus | undefined): Trouble | undefined => {
  if (!status || status.phase === 'connected') return undefined
  if (status.phase === 'blocked') return 'blocked'
  if (status.phase === 'offline') return 'down'
  return status.attempt >= triesBeforeDown ? 'down' : 'trying'
}

export const connectionState = (ui: Ui, pc: Derive<string>) => {
  const status = derive(() => {
    ui.data.changes.version.get()
    return ui.ctx.pcs.get(pc.get())?.status
  })
  const trouble = derive(() => troubleOf(status.get()))
  const troubled = derive(() => trouble.get() !== undefined)
  const late = sig(false)
  effect(() => {
    const now = troubled.get()
    pc.get()
    late.set(false)
    if (now) return onTimeout(() => late.set(true), grace)
  })
  const name = () => ui.data.nameOf(pc.get())

  const headline = () => {
    const current = status.get()
    if (current?.phase === 'blocked') return `Can’t connect to ${name()}`
    if (trouble.get() === 'down') return `Can’t reach ${name()}`
    if (current?.phase === 'reconnecting') {
      const wait = secondsUntil(current.retryAt, ui.data.now.get())
      return wait ? `Reconnecting to ${name()}… trying again in ${wait} s` : `Reconnecting to ${name()}…`
    }
    return `Connecting to ${name()}…`
  }

  const detail = () => {
    const current = status.get()
    if (current?.phase === 'blocked') return `${blockedWords(current.reason, ui.device())}. sand stopped trying until you fix it.`
    const seen = ui.ctx.pcs.get(pc.get())?.seen
    return `${seen ? `Last seen ${agoWords(seen, ui.data.now.get())}. ` : ''}sand keeps trying on its own.`
  }

  const holdReason = () => {
    const now = trouble.get()
    if (!now) return undefined
    if (now === 'trying') return `Can’t send yet: ${name()} is reconnecting. Your message stays here.`
    if (now === 'blocked') return `Can’t send: ${name()} won’t let ${ui.device().toLowerCase()} in. Your message stays here.`
    return `Can’t send: ${name()} can’t be reached. Your message stays here.`
  }

  return { pc, trouble, late, headline, detail, holdReason, name }
}

export type ConnectionState = ReturnType<typeof connectionState>
