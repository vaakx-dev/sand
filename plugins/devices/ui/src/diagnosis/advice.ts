import { tailscaleSet } from '@sand/devices-contract'
import type { Ui } from '../ui'
import { type Facts, homeReaches, tried } from './facts'
import { routeAdvice } from './route-advice'

export interface AdviceAction {
  label: string
  external?: boolean
  run(): void
}

export interface Advice {
  text: string
  action?: AdviceAction
}

const turnOnAnywhere = (ui: Ui, facts: Facts): AdviceAction | undefined => {
  if (!facts.view?.online) return undefined
  return {
    label: `Turn on for ${facts.name}`,
    run: () => void ui.toasts.attempt(`Couldn’t turn on Reach from anywhere on ${facts.name}`, ui.ctx.wire.call(tailscaleSet, { https: true }, facts.pc)),
  }
}

const waiting = (facts: Facts) => {
  const phase = facts.view?.status.phase ?? 'offline'
  return phase === 'offline' || phase === 'reconnecting' || phase === 'connecting'
}

const blockedAdvice = (ui: Ui, facts: Facts): Advice[] => {
  const status = facts.view?.status
  if (status?.phase !== 'blocked') return []
  const device = facts.device.toLowerCase()
  if (status.reason === 'removed' || status.reason === 'not-paired')
    return [{ text: `Ask to join again from ${device}, then tap Allow on a device that’s still paired.` }]
  if (status.reason === 'wrong-pc')
    return [{ text: `If ${facts.name} got a new address, turn off the old one in its details.`, action: { label: 'Open details', run: () => ui.open.details(facts.pc) } }]
  if (homeReaches(facts))
    return [{ text: `${facts.homeName} can reach ${facts.name}. Check that “Via ${facts.homeName}” is on in its details.`, action: { label: 'Open details', run: () => ui.open.details(facts.pc) } }]
  return [{ text: `Turn on Reach from anywhere on ${facts.name}, or connect it to your home wifi.` }]
}

export const adviceOf = (ui: Ui, facts: Facts): Advice[] => {
  const advice: Advice[] = routeAdvice(ui, facts)
  if (!advice.length && waiting(facts)) advice.push({ text: `Check that ${facts.name} is on.` })
  if (tried(facts, 'blocked-https') || facts.diagnosis?.routes.some(entry => entry.blocked === 'blocked-https')) {
    const action = turnOnAnywhere(ui, facts)
    advice.push({
      text: `Turn on Reach from anywhere on ${facts.name}. That gives it a secure address this page can use.`,
      ...(action && { action }),
    })
    const lan = facts.homeLan
    if (lan)
      advice.push({ text: 'At home, open sand from the home wifi address instead.', action: { label: 'Open home wifi address', external: true, run: () => ui.kit.openTab(lan) } })
  }
  advice.push(...blockedAdvice(ui, facts))
  if (!advice.length) advice.push({ text: 'Retry now. If it still fails, copy the diagnostics and share them.' })
  return advice
}
