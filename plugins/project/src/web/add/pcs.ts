import type { PcView } from '@sand/devices-contract'

const platforms: Record<string, string> = { linux: 'Linux', win32: 'Windows', darwin: 'macOS' }

export const isThisPc = (pc: PcView) => pc.status.phase === 'connected' && pc.status.route.kind === 'local'

export const describe = (pc: PcView) => {
  if (!pc.online) return 'Offline'
  if (isThisPc(pc)) return 'This PC'
  return [pc.platform && (platforms[pc.platform] ?? pc.platform), pc.address].filter(Boolean).join(' · ')
}

export const pickPc = (pcs: PcView[], chosen: string | undefined) =>
  pcs.find(pc => pc.online && pc.id === chosen) ?? pcs.find(isThisPc) ?? pcs.find(pc => pc.online)
