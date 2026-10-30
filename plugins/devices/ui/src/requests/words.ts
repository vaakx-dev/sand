import type { DeviceKind, JoinRequest } from '@sand/devices-contract'
import type { IconName } from '@sand/ui-kit/contract'
import { agoWords } from '../shared/time'

const tailnet = /^(100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|fd7a:115c:a1e0:)/i

export const viaTailscale = (address: string) => tailnet.test(address.replace(/^::ffff:/, ''))

export const kindIcon = (kind: DeviceKind, platform?: string): IconName => {
  if (kind === 'phone') return 'smartphone'
  if (kind === 'pc') return platform === 'darwin' || /mac/i.test(platform ?? '') ? 'laptop' : 'monitor'
  return 'monitor'
}

export const platformWords = (platform: string | undefined) =>
  ({ win32: 'Windows', darwin: 'macOS', linux: 'Linux' })[platform ?? ''] ?? platform ?? ''

export const askedWords = (request: JoinRequest, now: number) =>
  request.kind === 'pc' ? 'Wants to join your PCs' : `Asked ${request.pcName} ${agoWords(request.created, now)}`

export const whereWords = (request: JoinRequest, now: number) => {
  const over = viaTailscale(request.address) ? 'over Tailscale' : 'from your home wifi'
  if (request.kind === 'pc') return `${[platformWords(request.platform), `found ${request.pcName} ${over}`].filter(Boolean).join(' · ')}.`
  return `Asked ${request.pcName} ${over}, ${agoWords(request.created, now)}.`
}

export const promptTitle = (request: JoinRequest) => (request.kind === 'pc' ? `${request.name} wants to join your PCs` : `${request.name} wants to join`)

export const promptCheck = (request: JoinRequest) => (request.kind === 'pc' ? `Check that ${request.name} shows this code:` : 'Check that it shows this code:')

export const promptAfter = (request: JoinRequest) =>
  request.kind === 'pc' ? `If you allow it, ${request.name} and your PCs can use each other.` : 'If you allow it, it can use all your PCs.'
