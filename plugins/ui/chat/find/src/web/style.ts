import { colorVar } from '@vaakx-dev/vrui'

const matches = `::highlight(chat-find) { background-color: color-mix(in srgb, ${colorVar('warning', 500)} 30%, transparent); color: inherit; }`

const current = `::highlight(chat-find-current) { background-color: ${colorVar('warning', 500)}; color: ${colorVar('neutral', 950)}; }`

export const css = `${matches}\n${current}`
