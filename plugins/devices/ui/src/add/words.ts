import type { DiscoverySource } from '@sand/devices-contract'

export const sourceWords: Record<DiscoverySource, string> = { lan: 'Home wifi', tailscale: 'Tailscale' }

export const listed = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`)

export const joinedText = (others: string[]) => (others.length ? `${listed(others)} can use it now, and it can use them.` : 'Your devices can use it now.')
