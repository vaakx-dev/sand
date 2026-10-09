import { img, PALETTE, span } from '@vaakx-dev/vrui'

const colors = [
  PALETTE.indigo['500'],
  PALETTE.green['600'],
  PALETTE.amber['600'],
  PALETTE.violet['500'],
  PALETTE.red['500'],
  PALETTE.blue['500'],
  PALETTE.slate['500'],
  PALETTE.violet['700'],
]

export const projectColor = (name: string) => {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return colors[Math.abs(hash) % colors.length]!
}

export const initials = (text: string) =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase() || '?'

export const projectIcon = (name: string, url?: string) =>
  url
    ? img({ src: url, alt: '', width: 16, height: 16, draggable: false, class: 'h-4 w-4 shrink-0 rounded-sm' })
    : span(
        { class: 'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-xs font-bold text-white', style: { background: projectColor(name) } },
        (name[0] ?? '?').toUpperCase(),
      )
