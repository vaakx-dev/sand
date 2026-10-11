import type { Picked } from '@sand/browser-engine/contract'
import type { UserContent } from '@sand/messages'

const chunk = 0x8000

const toBase64 = (bytes: Uint8Array) => {
  let binary = ''
  for (let index = 0; index < bytes.length; index += chunk) binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  return btoa(binary)
}

export const screenshotContent = (jpeg: Uint8Array): UserContent => ({ type: 'image', mediaType: 'image/jpeg', data: toBase64(jpeg), name: 'browser.jpg' })

const pickedText = (picked: Picked) =>
  [
    `Picked element on ${picked.url}:`,
    `${picked.role} "${picked.name}"${picked.component ? ` (${picked.component})` : ''}`,
    `selector: ${picked.selector}`,
    picked.text ? `text: ${picked.text}` : '',
    'html:',
    picked.html,
  ]
    .filter(Boolean)
    .join('\n')

export const pickedContent = (picked: Picked): UserContent[] => [
  { type: 'text', text: pickedText(picked) },
  ...(picked.image ? [{ type: 'image', mediaType: 'image/png', data: picked.image, name: 'picked.png' } as const] : []),
]
