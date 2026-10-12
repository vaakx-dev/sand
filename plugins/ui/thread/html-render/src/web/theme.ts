import type { Theme } from '@sand/protocol'
import { theme } from '@vaakx-dev/vrui'
import { pageStart } from '../page/protocol'
import { rootRule } from '../page/tokens'

const themeStyle = ({ palette, mode }: Theme) => {
  try {
    return `<style>${rootRule(':root', theme(palette).colors, mode)}</style>`
  } catch {
    return ''
  }
}

export const themed = (html: string, current: Theme | undefined) =>
  current && html.startsWith(pageStart) ? pageStart + themeStyle(current) + html.slice(pageStart.length) : html
