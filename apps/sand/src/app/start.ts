import { createApp, share } from 'drydock'

const shared = ['drydock', '@sand/protocol', '@sand/kit', '@sand/kit/fs', '@sand/kit/git', '@sand/kit/host', 'zod']

export const startApp = () => {
  share(Object.fromEntries(shared.map(name => [name, Bun.resolveSync(name, import.meta.dir)])))
  const ctx = createApp()
  const exit = (code = 0) => void ctx.dispose().finally(() => process.exit(code))
  return { ctx, exit }
}
