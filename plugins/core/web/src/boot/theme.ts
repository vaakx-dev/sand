import { errorMessage } from '@sand/kit'
import type { Theme } from '@sand/protocol'
import { mount, setStyle, theme } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

const paint = ({ palette, mode, page }: Theme) => {
  const colors = theme(palette)
  const bar = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (bar) bar.content = colors.colors.neutral?.['900'] ?? bar.content
  setStyle(document.documentElement, { colorScheme: mode })
  return mount(document.body, { theme: colors, mode, class: page })
}

const report = (ctx: Context, error: unknown) => {
  const provider = ctx.inspector?.services().find(service => service.key === 'theme' && service.active)?.provider ?? 'theme'
  console.error(`[${provider}]`, error)
  ctx.notify?.push(`${provider}: ${errorMessage(error)}`, { level: 'error' })
}

export const paintPage = (ctx: Context) =>
  ctx.watch('theme', current => {
    if (!current) return
    try {
      return paint(current)
    } catch (error) {
      report(ctx, error)
    }
  })
