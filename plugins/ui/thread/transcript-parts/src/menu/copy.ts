import { copyText, type NavAction } from '@sand/dom'

export type Say = (text: string, failed: boolean) => void

export const copyAction =
  (say: Say) =>
  (id: string, label: string, text: () => string, what: string): NavAction => ({
    id,
    label,
    icon: 'copy',
    tile: true,
    run: async () => {
      const copied = await copyText(text())
      say(copied ? `Copied ${what}` : `Could not copy the ${what}`, !copied)
    },
  })
