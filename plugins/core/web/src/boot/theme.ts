import { type Theme, theme as themeService } from '@sand/ui-theme/contract'
import { mount, setStyle, theme } from '@vaakx-dev/vrui'
import { type Context, inspector } from 'drydock'

const paint = ({ palette, mode, page }: Theme) => {
  const colors = theme(palette)
  const background = colors.colors.neutral?.['900']
  if (background) for (const bar of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) bar.content = background
  setStyle(document.documentElement, { colorScheme: mode })
  return mount(document.body, { theme: colors, mode, class: page })
}

const report = (ctx: Context, error: unknown) => {
  const provider = ctx.get(inspector)?.services().find(service => service.id === themeService.id && service.active)?.provider ?? 'theme'
  console.error(`[${provider}]`, error)
}

export const paintPage = (ctx: Context) =>
  ctx.watch(themeService, current => {
    if (!current) return
    try {
      return paint(current)
    } catch (error) {
      report(ctx, error)
    }
  })
