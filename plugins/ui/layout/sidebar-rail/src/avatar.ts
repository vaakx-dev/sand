import { colorVar } from '@vaakx-dev/vrui'

const colors = [
  colorVar('accent', 500),
  colorVar('success', 600),
  colorVar('warning', 600),
  colorVar('sky', 500),
  colorVar('danger', 500),
  colorVar('orange', 500),
  colorVar('neutral', 500),
  colorVar('accent', 700),
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
