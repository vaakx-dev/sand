import type { PcIcon } from '@sand/devices-contract'

interface IconKind {
  label: string
  glyph: string
}

export const iconKinds: Record<PcIcon, IconKind> = {
  desktop: { label: 'Desktop', glyph: 'monitor' },
  laptop: { label: 'Laptop', glyph: 'laptop' },
  tower: { label: 'Tower', glyph: 'pc-case' },
  mini: { label: 'Mini PC', glyph: 'hard-drive' },
  server: { label: 'Server', glyph: 'server' },
  cloud: { label: 'Cloud', glyph: 'cloud' },
  board: { label: 'Board', glyph: 'cpu' },
  linux: { label: 'Linux / WSL', glyph: 'term' },
}
