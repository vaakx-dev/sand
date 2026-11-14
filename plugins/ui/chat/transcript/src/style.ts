import { colorVar } from '@vaakx-dev/vrui'

const flash = `::highlight(chat-flash) { background-color: color-mix(in srgb, ${colorVar('accent', 500)} 25%, transparent); color: inherit; }`

const offscreenRows = '@supports (overflow-anchor: auto) { .chat-row { content-visibility: auto; contain-intrinsic-block-size: auto 80px; } }'

export const css = `${flash}\n${offscreenRows}`
