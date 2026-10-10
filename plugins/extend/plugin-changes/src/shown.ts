import type { Context } from 'drydock'

export const page = 'plugins'

export const whenShown = (ctx: Context<'wire'>, load: () => void) => {
  const shown = () => ctx.settings?.current() === page
  const refresh = () => {
    if (shown() && ctx.wire.state() === 'open') load()
  }
  ctx.on('settings.change', refresh)
  ctx.on('wire.hello', refresh)
  refresh()
  return refresh
}
